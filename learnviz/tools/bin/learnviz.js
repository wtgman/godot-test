#!/usr/bin/env node
/**
 * learnviz. Turn course content into learning activities for Canvas.
 *
 *   learnviz propose <proposal.json> [--out DIR]
 *   learnviz build <spec.json...> [--out DIR] [--release] [--group NAME] [--no-png]
 *   learnviz validate <spec.json...>
 *   learnviz patterns
 *   learnviz types
 *   learnviz doctor
 *
 * A learning object builds to a folder: the activity, a SCORM package, a
 * Canvas page, a teacher guide and a review sheet, and a dashboard ties every
 * folder in the output together. A figure on its own builds to an image and
 * its paste-ready block, as before.
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';

import { validate, SpecError, VISUAL_TYPES } from '../src/spec.js';
import { render as renderStatic } from '../src/renderers/index.js';
import { audit } from '../src/a11y.js';
import { diagramBlock, genericBlock } from '../src/emble.js';
import { svgToPng, capabilities } from '../src/raster.js';
import { validateLO, buildLO, PATTERNS } from '../src/lo/index.js';
import { writeBundle, dashboard, slugify } from '../src/delivery/bundle.js';
import { assertPaletteAccessible } from '../src/theme.js';
import { validateProposal, renderProposal, renderGallery, summariseProposal, DATA_STATUS } from '../src/proposal.js';

const argv = process.argv.slice(2);
const command = argv[0];

/* ------------------------------------------------------------------ */
/* Argument handling                                                   */
/* ------------------------------------------------------------------ */

function parseFlags(args) {
  const flags = { out: 'out', png: true, width: 960, scale: 2, release: false, group: undefined };
  const files = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--out') { flags.out = args[++i]; }
    else if (a === '--no-png') { flags.png = false; }
    else if (a === '--release') { flags.release = true; }
    else if (a === '--group') { flags.group = args[++i]; }
    else if (a === '--width') { flags.width = Number(args[++i]); }
    else if (a === '--scale') { flags.scale = Number(args[++i]); }
    else if (a.startsWith('--')) { throw new Error(`Unknown option ${a}`); }
    else { files.push(a); }
  }
  return { flags, files };
}

const green = (s) => `[32m${s}[0m`;
const yellow = (s) => `[33m${s}[0m`;
const red = (s) => `[31m${s}[0m`;
const dim = (s) => `[2m${s}[0m`;
const bold = (s) => `[1m${s}[0m`;

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

async function readJson(file) {
  const text = await readFile(file, 'utf8');
  try {
    return { text, raw: JSON.parse(text) };
  } catch (e) {
    throw new SpecError(`${file} is not valid JSON. ${e.message}`);
  }
}

/** Validate either kind of spec. Returns { kind, spec, text }. */
async function loadSpec(file) {
  const { text, raw } = await readJson(file);
  if (raw && raw.kind === 'learning-object') return { kind: 'lo', spec: validateLO(raw), text };
  if (raw && raw.kind === 'proposal') {
    throw new SpecError(`${file} is a proposal. Run: learnviz propose ${file}`);
  }
  return { kind: 'figure', spec: validate(raw), text };
}

/**
 * The written record that travels with every visual.
 *
 * A teacher reviewing this needs to answer three questions without opening any
 * other file: what is this for, is it accessible, and how do I get it into
 * Canvas. So all three are here, in that order.
 */
function buildNotes({ spec, a11y, problems, files, embedRung, width, height }) {
  const lines = [
    `# ${spec.title}`,
    '',
    `**Learning intent.** ${spec.intent}`,
    '',
    spec.subtitle ? `${spec.subtitle}\n` : '',
    '## Files',
    '',
    ...files.map((f) => `- \`${f.name}\`. ${f.what}`),
    '',
    '## Getting it into Canvas',
    '',
    embedRung,
    '',
    '## Accessibility',
    '',
    `- **Short alt text** (goes in \`alt\`): ${a11y.shortAlt}`,
    `- **Full alt text** (goes in \`data-ally-user-updated-alt\`, which is what Ally reports against): ${a11y.fullAlt}`,
    '',
    '### Image description, five-part house structure',
    '',
    ...a11y.fivePart.flatMap((p) => [
      `**${p.label}**${p.value ? `: ${p.value}` : ':'}`,
      '',
      ...p.supporting.map((s) => `- ${s}`),
      p.supporting.length ? '' : null,
    ].filter((l) => l !== null)),
    '### Automated checks',
    '',
    problems.length
      ? problems.map((p) => `- UNRESOLVED: ${p}`).join('\n')
      : '- All checks passed. Colour contrast meets WCAG 2.2 AA, no information is carried by colour alone, and every element in the graphic appears in the text equivalent.',
    '',
    '## Text equivalent',
    '',
    '```',
    a11y.textEquivalent,
    '```',
    '',
    width ? `_Rendered at ${width} by ${Math.round(height)} points._` : '',
  ];
  return lines.filter((l) => l !== '').join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

const STATIC_EMBED_NOTE = `This is a static image, which is the embed route that always works.

1. Upload the \`.png\` to the course's Files area.
2. On the page, switch to the HTML editor and paste in the contents of the \`.canvas.html\` file.
3. Put the cursor on the highlighted placeholder line, delete it, and use **Insert, then Image, then Course Images** to place the uploaded file. Canvas fills in the file URL and the API endpoint for you.
4. Check that the \`alt\` and \`data-ally-user-updated-alt\` attributes survived the insert. Canvas sometimes clears them, and they are already written for you in the block.

Do not paste the \`.svg\` into the Rich Content Editor. Canvas strips inline SVG on save.`;


/**
 * Render a proposal into a brief a teacher can reply to.
 *
 * This runs before anything is built. The point of the step is that choosing
 * the visual is the decision worth spending time on, and it is much cheaper to
 * change your mind about a line in a menu than about a finished artefact.
 */
async function cmdPropose(args) {
  const { flags, files } = parseFlags(args);
  if (files.length !== 1) {
    console.error('Give me exactly one proposal file. Try: learnviz propose examples/grief/proposal.json --out build');
    process.exitCode = 1;
    return;
  }

  let proposal;
  try {
    const { raw } = await readJson(files[0]);
    // A candidate can point at a sketch in its own file, relative to the
    // proposal, rather than carrying it inline.
    for (const [i, c] of (raw.candidates || []).entries()) {
      if (c && typeof c.sketchFile === 'string') {
        try {
          c.sketch = (await readJson(join(dirname(resolve(files[0])), c.sketchFile))).raw;
        } catch (e) {
          throw new SpecError(`candidates[${i}].sketchFile: ${e.code === 'ENOENT' ? `no file at ${c.sketchFile}` : e.message}`);
        }
        delete c.sketchFile;
      }
    }
    proposal = validateProposal(raw);
  } catch (e) {
    console.error(`${red('FAILED')} ${files[0]}\n  ${e.message}`);
    process.exitCode = 1;
    return;
  }

  await mkdir(flags.out, { recursive: true });
  const stem = slugify(proposal.topic, 'proposal');
  await writeFile(join(flags.out, `${stem}.options.md`), renderProposal(proposal));
  await writeFile(join(flags.out, `${stem}.gallery.html`), renderGallery(proposal));

  for (const row of summariseProposal(proposal)) {
    const status = DATA_STATUS[row.status];
    const mark = row.recommended ? green('PICK ') : '     ';
    const flag = status.blocking ? red(status.label) : dim(status.label);
    console.log(`${mark} ${String(row.n).padStart(2)}. ${row.name}`);
    console.log(`      ${dim(`${row.pattern} · ${row.placement}`)} · ${flag} · ${dim(`${row.effort} effort`)}${row.sketch ? dim(' · sketch') : ''}`);
  }

  const blocked = proposal.candidates.filter((c) => DATA_STATUS[c.data.status].blocking).length;
  console.log(`\n${bold(String(proposal.candidates.length))} options, ${blocked} needing content before release.`);
  console.log(`Gallery: ${bold(join(resolve(flags.out), `${stem}.gallery.html`))}`);
  console.log(`Brief:   ${dim(join(resolve(flags.out), `${stem}.options.md`))}`);
}

async function cmdBuild(args) {
  const { flags, files } = parseFlags(args);
  if (!files.length) {
    console.error('Give me at least one spec file. Try: learnviz build examples/grief/*.json --out build');
    process.exitCode = 1;
    return;
  }

  assertPaletteAccessible();
  await mkdir(flags.out, { recursive: true });

  let failures = 0;
  let activities = 0;

  for (const file of files) {
    let loaded;
    try {
      loaded = await loadSpec(file);
    } catch (e) {
      console.error(`${red('FAILED')} ${file}\n  ${e.message}`);
      failures += 1;
      continue;
    }

    try {
      if (loaded.kind === 'lo') {
        const ok = await buildActivity(loaded, file, flags);
        if (ok) activities += 1; else failures += 1;
      } else if (!(await buildFigure(loaded.spec, file, flags))) {
        failures += 1;
      }
    } catch (e) {
      console.error(`${red('FAILED')} ${file}\n  ${e.stack || e.message}`);
      failures += 1;
    }
  }

  if (activities) {
    const n = await writeDashboard(flags.out);
    console.log(`\nDashboard: ${bold(join(resolve(flags.out), 'index.html'))} ${dim(`(${n} activit${n === 1 ? 'y' : 'ies'})`)}`);
  } else {
    console.log(`\nWritten to ${bold(resolve(flags.out))}`);
  }
  if (failures) process.exitCode = 1;
}

const rasterise = (flags) => (flags.png
  ? (fig) => svgToPng(fig.svg, { width: fig.width, height: fig.height, scale: flags.scale })
  : null);

/** One learning object to its folder. Returns false if it was refused or has problems. */
async function buildActivity({ spec: lo, text }, file, flags) {
  const b = buildLO(lo);
  const slug = slugify(lo.title, basename(file, extname(file)));

  // Release is a promise that a person has checked it. The build will not
  // make that promise on anyone's behalf.
  if (flags.release && b.draft.isDraft) {
    console.error(`${red('REFUSED')} ${slug}\n  Still a draft: ${b.draft.reasons.join(' ')}\n  Work through its review sheet, mark the sources verified and set "status": "release". Or build without --release to get a draft for review.`);
    return false;
  }

  const group = flags.group ?? basename(dirname(resolve(file)));
  const dir = group ? join(flags.out, group, slug) : join(flags.out, slug);
  const written = await writeBundle(b, { dir, slug, source: text, png: rasterise(flags) });

  const tag = b.problems.length ? red('CHECK') : b.draft.isDraft ? yellow('DRAFT') : green('OK   ');
  console.log(`${tag} ${lo.pattern.padEnd(11)} ${group ? `${group}/` : ''}${slug} ${dim(`${written.length} files`)}`);
  for (const p of b.problems) console.log(`      ${red('!')} ${p}`);
  if (b.draft.isDraft) console.log(`      ${dim(b.draft.reasons.join(' '))}`);
  return b.problems.length === 0;
}

/**
 * Rebuild the dashboard from every activity folder in the output, not only
 * this run's, so building one activity at a time still gives the whole set.
 * Activity folders sit at out/<slug> or out/<group>/<slug>.
 */
async function writeDashboard(out) {
  const items = [];
  const isDir = async (p) => (await stat(p).catch(() => null))?.isDirectory();
  const take = async (dir, group) => {
    const names = await readdir(dir);
    if (!names.includes('spec.json') || !names.includes('index.html')) return false;
    try {
      const { raw } = await readJson(join(dir, 'spec.json'));
      items.push({ group, slug: basename(dir), b: buildLO(validateLO(raw)), files: names.map((name) => ({ name })) });
    } catch {
      // A folder whose spec no longer validates is left out rather than fatal.
    }
    return true;
  };
  for (const n of (await readdir(out)).sort()) {
    const p = join(out, n);
    if (!(await isDir(p))) continue;
    if (await take(p, '')) continue;
    for (const m of (await readdir(p)).sort()) {
      if (await isDir(join(p, m))) await take(join(p, m), n);
    }
  }
  await writeFile(join(out, 'index.html'), dashboard(items));
  return items.length;
}

/** A figure on its own: the image, its blocks and its notes, as flat files. */
async function buildFigure(spec, file, flags) {
  const stem = slugify(spec.title, basename(file, extname(file)));
  const written = [];
  const write = async (suffix, contents, what) => {
    const name = `${stem}${suffix}`;
    await writeFile(join(flags.out, name), contents);
    written.push({ name, what });
  };

  const { svg, width, height, description, a11y } = renderStatic(spec, { width: flags.width });
  const problems = audit(spec, description, a11y);

  await write('.svg', svg, 'Vector original. Edit or rescale from this. Do not paste it into the Canvas editor.');

  let pngWritten = false;
  if (flags.png) {
    try {
      const png = await svgToPng(svg, { width, height, scale: flags.scale });
      await write('.png', png, `Upload this one to Canvas Files. Rendered at ${flags.scale} times size so it stays sharp.`);
      pngWritten = true;
    } catch (e) {
      console.error(`  ${dim(`PNG skipped: ${e.message}`)}`);
    }
  }

  await write('.canvas.html', diagramBlock({ a11y }), 'Paste-ready Emble diagram block with the image description accordion.');
  await write('.generic.html', genericBlock({ a11y }), 'Plain HTML version for anywhere that is not Canvas.');
  await write('.txt', a11y.textEquivalent, 'Plain text version, for a handout or a transcript.');
  await write('.notes.md', buildNotes({
    spec, a11y, problems, files: written, embedRung: STATIC_EMBED_NOTE, width, height,
  }), 'Build notes: alt text, image description, embed steps.');

  report(spec, stem, problems, pngWritten ? '' : dim(' (no PNG)'));
  return problems.length === 0;
}

function report(spec, stem, problems, extra = '') {
  const tag = problems.length ? red('CHECK') : green('OK   ');
  console.log(`${tag} ${spec.type.padEnd(11)} ${stem}${extra}`);
  for (const p of problems) console.log(`      ${red('!')} ${p}`);
}

async function cmdValidate(args) {
  const { files } = parseFlags(args);
  let bad = 0;
  for (const file of files) {
    try {
      const { kind, spec } = await loadSpec(file);
      console.log(`${green('OK   ')} ${file} ${dim(`(${kind === 'lo' ? spec.pattern : spec.type})`)}`);
    } catch (e) {
      console.error(`${red('BAD  ')} ${file}\n       ${e.message}`);
      bad += 1;
    }
  }
  if (bad) process.exitCode = 1;
}

function cmdPatterns() {
  console.log(bold('Learning-object patterns\n'));
  for (const [key, p] of Object.entries(PATTERNS)) {
    console.log(`  ${bold(key.padEnd(12))} ${p.meta.label}. The learner ${p.meta.verb}.`);
    console.log(`  ${' '.repeat(12)} ${dim(p.meta.why)}`);
    console.log(`  ${' '.repeat(12)} ${dim(p.meta.scored ? 'Sends a score to Canvas.' : 'Sends completion only.')}\n`);
  }
  console.log(dim('Write one as { "kind": "learning-object", "pattern": "<name>", ... }. See references/spec-reference.md.'));
}

function cmdTypes() {
  console.log(bold('Figure types\n'));
  const help = {
    timeline: 'Dated events in order. What happened when.',
    process: 'Ordered steps with a first and a last. How something is done.',
    cycle: 'A loop with no beginning or end. Something that repeats.',
    gantt: 'Tasks on a shared time axis, free to overlap. What runs alongside what.',
    comparison: 'Items scored against shared criteria. How options differ.',
    hierarchy: 'A tree. How a whole breaks into parts.',
    chart: 'Quantities, as grouped bars or lines. How much, and which way it is moving.',
    labelled: 'A subject with its parts named, pinned to a supplied image.',
    stat: 'Big-number callouts. The infographic register, for figures that should land as figures.',
    waffle: 'Part to whole, as countable squares. Use instead of a pie chart.',
  };
  for (const t of VISUAL_TYPES) {
    console.log(`  ${bold(t.padEnd(12))} ${help[t]}`);
  }
  console.log(`\n${dim('Each builds an SVG and a PNG. Use one on its own, or inside a learning object as its figure.')}`);
}

function cmdDoctor() {
  const caps = capabilities();
  console.log(bold('learnviz environment\n'));
  console.log(`  Node        ${process.version}`);
  console.log(`  Chromium    ${caps.chromium ? green(caps.chromium) : red('not found. PNG output is unavailable, SVG still works.')}`);
  try {
    assertPaletteAccessible();
    console.log(`  Palette     ${green('every colour pair meets WCAG 2.2 AA')}`);
  } catch (e) {
    console.log(`  Palette     ${red(e.message)}`);
  }
}

function usage() {
  console.log(`${bold('learnviz')} turns course content into learning activities for Canvas.

  ${bold('learnviz propose')} <proposal.json> [--out DIR]
  ${bold('learnviz build')} <spec.json...> [--out DIR] [--release] [--group NAME] [--no-png]
  ${bold('learnviz validate')} <spec.json...>
  ${bold('learnviz patterns')}     the eight activity patterns
  ${bold('learnviz types')}        the figure types
  ${bold('learnviz doctor')}

Propose first: a menu of activities for a piece of content, each with a live
preview to try before choosing. Build what gets chosen.

A learning object builds to a folder holding the activity, a SCORM package,
a Canvas page, a teacher guide and a review sheet, and the output gets a
dashboard. Drafts carry a banner. --release refuses anything still in draft.`);
}

/* ------------------------------------------------------------------ */

try {
  switch (command) {
    case 'propose': await cmdPropose(argv.slice(1)); break;
    case 'build': await cmdBuild(argv.slice(1)); break;
    case 'validate': await cmdValidate(argv.slice(1)); break;
    case 'patterns': cmdPatterns(); break;
    case 'types': cmdTypes(); break;
    case 'doctor': cmdDoctor(); break;
    case undefined:
    case '-h':
    case '--help': usage(); break;
    default:
      console.error(`Unknown command "${command}".\n`);
      usage();
      process.exitCode = 1;
  }
} catch (e) {
  console.error(red(e instanceof SpecError ? e.message : (e.stack || e.message)));
  process.exitCode = 1;
}

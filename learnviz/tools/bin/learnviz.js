#!/usr/bin/env node
/**
 * learnviz. Turn course content into learning activities for Canvas.
 *
 *   learnviz propose <proposal.json> [--out DIR]
 *   learnviz build <spec.json...> [--out DIR] [--release] [--group NAME] [--no-png] [--video]
 *   learnviz validate <spec.json...>
 *   learnviz course import <export.imscc> --out DIR
 *   learnviz course status|review DIR
 *   learnviz course build DIR [--release] [--no-png] [--video]
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
import { svgToPng, pageToVideo, capabilities } from '../src/raster.js';
import { validateLO, buildLO, PATTERNS } from '../src/lo/index.js';
import { writeBundle, dashboard, slugify } from '../src/delivery/bundle.js';
import {
  importCourse, loadWorkspace, status as courseStatus, reviewData, buildCourse,
  findPage, pageGallery, parseBuildCode, recordDecision, buildPage,
} from '../src/course/workspace.js';
import { reviewApp } from '../src/course/review.js';
import { assertPaletteAccessible } from '../src/theme.js';
import { validateProposal, renderProposal, renderGallery, summariseProposal, DATA_STATUS } from '../src/proposal.js';

const argv = process.argv.slice(2);
const command = argv[0];

/* ------------------------------------------------------------------ */
/* Argument handling                                                   */
/* ------------------------------------------------------------------ */

function parseFlags(args) {
  const flags = { out: 'out', png: true, video: false, width: 960, scale: 2, release: false, group: undefined };
  const files = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--out') { flags.out = args[++i]; }
    else if (a === '--no-png') { flags.png = false; }
    else if (a === '--release') { flags.release = true; }
    else if (a === '--video') { flags.video = true; }
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

const recorder = (flags) => {
  if (!flags.video) return null;
  const record = (rec) => pageToVideo(rec.html, { width: rec.width, height: rec.height, frames: rec.seconds * rec.fps, fps: rec.fps });
  record.onError = (e) => console.error(`  ${dim(`Video skipped: ${e.message}`)}`);
  return record;
};

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
  const written = await writeBundle(b, { dir, slug, source: text, png: rasterise(flags), video: recorder(flags) });

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
  // Proposal galleries written to the same folder are linked from the top.
  const proposals = [];
  for (const n of (await readdir(out)).sort()) {
    if (!n.endsWith('.gallery.html')) continue;
    const html = await readFile(join(out, n), 'utf8');
    const topic = (html.match(/<h1>([^<]*)<\/h1>/) || [])[1];
    const plain = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    proposals.push({ file: n, topic: topic ? plain(topic) : n });
  }
  await writeFile(join(out, 'index.html'), dashboard(items, { proposals }));
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

/* ------------------------------------------------------------------ */
/* A whole course                                                      */
/* ------------------------------------------------------------------ */

async function cmdCourse(args) {
  const [sub, ...rest] = args;
  const { flags, files } = parseFlags(rest);
  if (sub === 'import') {
    if (files.length !== 1 || flags.out === 'out') {
      console.error('Try: learnviz course import my-course.imscc --out my-course');
      process.exitCode = 1;
      return;
    }
    const meta = importCourse(files[0], flags.out);
    console.log(`${green('OK   ')} ${bold(meta.title)}: ${meta.pages.length} pages in ${meta.modules.length} modules`);
    for (const m of meta.modules) {
      const n = m.items.filter((i) => i.kind === 'page').length;
      console.log(`      ${m.title} ${dim(`${n} page${n === 1 ? '' : 's'}, ${m.items.length - n} other item${m.items.length - n === 1 ? '' : 's'}`)}`);
    }
    console.log(`\nWorkspace: ${bold(resolve(flags.out))}`);
    console.log(dim('Next: write proposals/<slug>.json for each page, then run learnviz course review.'));
    return;
  }

  const dir = files[0];
  if (!dir) {
    console.error(`Try: learnviz course ${sub || 'status'} <workspace>`);
    process.exitCode = 1;
    return;
  }
  const ws = loadWorkspace(dir);

  if (sub === 'status') {
    const rows = courseStatus(ws);
    let module = null;
    for (const r of rows) {
      if (r.module !== module) { module = r.module; console.log(`\n${bold(module)}`); }
      const mark = r.next.startsWith('ready to build') || r.next === 'nothing, skipped' ? green('  ok ') : r.error ? red('  !  ') : yellow('  -  ');
      console.log(`${mark} ${String(r.n).padStart(2)}. ${r.title} ${dim(`(${r.slug})`)} ${dim('·')} ${r.next}`);
      if (r.error) console.log(`         ${red(r.error)}`);
    }
    const todo = rows.filter((r) => r.next === 'write options' || r.next.startsWith('write options')).length;
    const waiting = rows.filter((r) => r.next === 'waiting for the designer').length;
    console.log(`\n${rows.length} pages: ${todo} need options, ${waiting} waiting for the designer, ${rows.filter((r) => r.next.startsWith('ready to build')).length} ready to build.`);
    return;
  }

  // One page at a time: its gallery, then a build of just what was chosen.
  if (sub === 'page') {
    const which = files[1] || 'next';
    const p = findPage(ws, which);
    if (!p) {
      console.log(which === 'next' ? `${green('Done.')} Every page with options has a decision.` : red(`No page "${which}".`));
      if (which !== 'next') process.exitCode = 1;
      return;
    }
    const out = join(dir, 'galleries', `${String(p.n).padStart(2, '0')}-${p.slug}.html`);
    await mkdir(join(dir, 'galleries'), { recursive: true });
    await writeFile(out, pageGallery(ws, p));
    const skipped = ws.pages.filter((x) => x.n < p.n && x.proposal.status === 'skip' && !ws.choices?.pages?.[x.slug]);
    if (skipped.length) console.log(dim(`Pages ${skipped.map((x) => x.n).join(', ')} before this one are suggested for no activity.`));
    console.log(`${green('OK   ')} Page ${p.n} of ${ws.pages.length}: ${bold(p.title)}`);
    console.log(`\nGallery: ${bold(resolve(out))}`);
    return;
  }

  if (sub === 'build-page') {
    const code = files.slice(1).join(' ').trim();
    if (!code) {
      console.error('Give the build code from the gallery reply. Try: learnviz course build-page my-course "page-slug 1@end 2@after:Heading"');
      process.exitCode = 1;
      return;
    }
    let parsed;
    try {
      parsed = parseBuildCode(ws, code);
    } catch (e) {
      console.error(`${red('FAILED')} ${e.message}`);
      process.exitCode = 1;
      return;
    }
    recordDecision(ws, parsed.page.slug, parsed.decision);
    if (parsed.decision.decision === 'skip') {
      console.log(`${green('OK   ')} Page ${parsed.page.n}: no activity. Recorded.`);
      return;
    }
    const out = flags.out === 'out' ? join(dir, 'built', `${String(parsed.page.n).padStart(2, '0')}-${parsed.page.slug}`) : flags.out;
    const r = await buildPage(ws, parsed.page.slug, { out, release: flags.release, png: rasterise(flags), video: recorder(flags) });
    for (const x of r.refused) console.error(`${red('REFUSED')} ${x.page.slug}: ${x.reasons.join(' ')}`);
    for (const x of r.problems) console.error(`${red('FAILED')} ${x.page.slug}: ${x.message}`);
    for (const b of r.built) {
      const tag = b.problems.length ? red('CHECK') : b.draft.isDraft ? yellow('DRAFT') : green('OK   ');
      console.log(`${tag} ${b.pattern.padEnd(11)} ${b.title} ${dim(b.placed)}`);
    }
    if (r.package) {
      console.log(`\nUpdate package: ${bold(join(resolve(out), r.package))}`);
      console.log(`How to add it:  ${bold(join(resolve(out), 'how-to-add-it.html'))}`);
    }
    if (r.problems.length || r.refused.length || !r.built.length) process.exitCode = 1;
    return;
  }

  if (sub === 'review') {
    const { data, sketches } = reviewData(ws);
    const out = join(dir, 'review');
    await mkdir(join(out, 'sketches'), { recursive: true });
    for (const s of sketches) await writeFile(join(out, s.file), s.html);
    await writeFile(join(out, 'index.html'), reviewApp(data));
    // The same app as one file, sketches included, for sending to someone.
    const single = `${slugify(data.title, 'course')}-review.html`;
    await writeFile(join(out, single), reviewApp(data, { inline: sketches }));
    const ready = data.pages.filter((p) => p.status === 'ready').length;
    const skips = data.pages.filter((p) => p.status === 'skip').length;
    const bad = data.pages.filter((p) => p.status === 'invalid');
    console.log(`${green('OK   ')} ${data.pages.length} pages: ${ready} with options, ${skips} suggested for no activity, ${data.pages.length - ready - skips - bad.length} without options yet`);
    for (const p of bad) console.log(`      ${red('!')} ${p.slug}: ${p.error}`);
    console.log(`\nReview app: ${bold(resolve(join(out, 'index.html')))}`);
    console.log(`One file:   ${dim(resolve(join(out, single)))}`);
    return;
  }

  if (sub === 'build') {
    const out = flags.out === 'out' ? join(dir, 'build') : flags.out;
    if (!ws.choices) {
      console.error(`No choices yet. Save choices.json from the review app into ${dir}, then build.`);
      process.exitCode = 1;
      return;
    }
    const r = await buildCourse(ws, { out, release: flags.release, png: rasterise(flags), video: recorder(flags) });
    if (r.refused.length) {
      for (const x of r.refused) console.error(`${red('REFUSED')} ${x.page.slug}: ${x.reasons.join(' ')}`);
      console.error('\nNothing was written. Resolve the drafts, or build without --release to get drafts for review.');
      process.exitCode = 1;
      return;
    }
    for (const b of r.built) {
      const tag = b.problems.length ? red('CHECK') : b.draft.isDraft ? yellow('DRAFT') : green('OK   ');
      console.log(`${tag} ${b.pattern.padEnd(11)} ${String(b.page.n).padStart(2)}. ${b.page.title} ${dim(`${b.placed}${b.fromSketch ? ', from the sketch' : ''}`)}`);
      for (const p of b.problems) console.log(`      ${red('!')} ${p}`);
    }
    for (const x of r.problems) console.error(`${red('FAILED')} ${x.page.slug}: ${x.message}`);
    if (r.built.length) await writeDashboard(join(out, 'activities'));
    console.log(`\n${r.built.length} built, ${r.skipped.length} skipped, ${r.waiting.length} undecided.`);
    console.log(`Course package: ${bold(join(resolve(out), r.package))}`);
    console.log(`Checklist:      ${bold(join(resolve(out), 'upload-checklist.html'))}`);
    if (r.problems.length || r.built.some((b) => b.problems.length)) process.exitCode = 1;
    return;
  }

  console.error('Try: learnviz course import | status | page | build-page | review | build');
  process.exitCode = 1;
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
  console.log(`  ffmpeg      ${caps.ffmpeg ? green(caps.ffmpeg) : red('not found. --video is unavailable.')}`);
  console.log(`  Video       ${caps.video.ok
    ? green(`${caps.video.codec}${caps.video.universal ? '' : ', upload via Canvas Studio so it is transcoded'}`)
    : red(`${caps.video.reason} Set LEARNVIZ_FFMPEG to a full ffmpeg, or run npm install ffmpeg-static.`)}`);
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
  ${bold('learnviz build')} <spec.json...> [--out DIR] [--release] [--group NAME] [--no-png] [--video]
  ${bold('learnviz validate')} <spec.json...>
  ${bold('learnviz course import')} <export.imscc> --out DIR   a whole Canvas course, page by page
  ${bold('learnviz course page')} DIR [slug|number|next]      one page's gallery
  ${bold('learnviz course build-page')} DIR "<build code>"     build that page's choices
  ${bold('learnviz course status')} DIR | ${bold('review')} DIR | ${bold('build')} DIR [--release]
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
    case 'course': await cmdCourse(argv.slice(1)); break;
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

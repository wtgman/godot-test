#!/usr/bin/env node
/**
 * learnviz. Build a learning visual from a spec.
 *
 *   learnviz build <spec.json...> [--out DIR] [--no-png] [--video] [--width N]
 *   learnviz validate <spec.json...>
 *   learnviz types
 *   learnviz doctor
 *
 * Every build writes a bundle rather than a single file, because a visual that
 * arrives without its alt text, its text equivalent and its paste-ready embed
 * block puts all of that work back on the teacher.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

import { validate, SpecError, VISUAL_TYPES, INTERACTIVE_TYPES } from '../src/spec.js';
import { render as renderStatic } from '../src/renderers/index.js';
import { build as buildInteractive } from '../src/interactive/index.js';
import { audit } from '../src/a11y.js';
import { diagramBlock, interactiveBlock, genericBlock } from '../src/emble.js';
import { svgToPng, pageToVideo, capabilities } from '../src/raster.js';
import { assertPaletteAccessible } from '../src/theme.js';

const argv = process.argv.slice(2);
const command = argv[0];

/* ------------------------------------------------------------------ */
/* Argument handling                                                   */
/* ------------------------------------------------------------------ */

function parseFlags(args) {
  const flags = { out: 'out', png: true, mp4: false, width: 960, scale: 2 };
  const files = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--out') { flags.out = args[++i]; }
    else if (a === '--no-png') { flags.png = false; }
    else if (a === '--video' || a === '--mp4') { flags.mp4 = true; }
    else if (a === '--width') { flags.width = Number(args[++i]); }
    else if (a === '--scale') { flags.scale = Number(args[++i]); }
    else if (a.startsWith('--')) { throw new Error(`Unknown option ${a}`); }
    else { files.push(a); }
  }
  return { flags, files };
}

/** A filesystem-safe stem derived from the spec title, falling back to the filename. */
function slugify(title, fallback) {
  const s = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || fallback;
}

const green = (s) => `[32m${s}[0m`;
const red = (s) => `[31m${s}[0m`;
const dim = (s) => `[2m${s}[0m`;
const bold = (s) => `[1m${s}[0m`;

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

async function loadSpec(file) {
  const raw = await readFile(file, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new SpecError(`${file} is not valid JSON. ${e.message}`);
  }
  return validate(parsed);
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

const INTERACTIVE_EMBED_NOTE = `This is an interactive page, so it needs somewhere to live before it can be embedded.

**It will not run from Canvas Files.** Canvas previews uploaded HTML inside a sandboxed iframe that usually withholds the \`allow-scripts\` permission, so the page loads and then does nothing. This is not a bug you can work around from inside the file.

Pick one of these instead, in order of preference:

1. **An institutional web host.** Anywhere that serves the file as a normal web page. Then paste the \`.canvas.html\` block and put the address into the iframe \`src\`. This is the route that gives you the full interactive.
2. **Rebuild it as an H5P activity** through the H5P tool already configured in Canvas. You lose the custom model, you gain gradebook integration.
3. **Ship a video instead.** Build again with \`--video\` to get a recording of the model running, then upload that to Canvas Studio. The learner cannot change the parameters, but nothing is sandboxed and it plays everywhere, including the mobile apps. Run \`learnviz doctor\` first: this needs a full ffmpeg, and the cut-down one bundled with the Playwright browsers cannot do it.

The file is entirely self-contained. It loads no fonts, no libraries and no data from anywhere, so it works behind a strict Content Security Policy and offline.`;

async function cmdBuild(args) {
  const { flags, files } = parseFlags(args);
  if (!files.length) {
    console.error('Give me at least one spec file. Try: learnviz build spec.json --out build');
    process.exitCode = 1;
    return;
  }

  assertPaletteAccessible();
  await mkdir(flags.out, { recursive: true });

  let failures = 0;

  for (const file of files) {
    let spec;
    try {
      spec = await loadSpec(file);
    } catch (e) {
      console.error(`${red('FAILED')} ${file}\n  ${e.message}`);
      failures += 1;
      continue;
    }

    const stem = slugify(spec.title, basename(file, extname(file)));
    const written = [];
    const write = async (suffix, contents, what) => {
      const name = `${stem}${suffix}`;
      await writeFile(join(flags.out, name), contents);
      written.push({ name, what });
    };

    try {
      if (INTERACTIVE_TYPES.has(spec.type)) {
        const { html, description, a11y } = buildInteractive(spec);
        const problems = audit(spec, description, a11y);

        await write('.html', html, 'The interactive itself. One self-contained file, no external requests.');
        await write('.canvas.html', interactiveBlock({
          title: spec.title,
          a11y,
          fallbackNote: 'If the activity does not load, open the text version below. It contains the same information.',
        }), 'Paste-ready Canvas block, with the iframe and the text version.');
        await write('.txt', a11y.textEquivalent, 'Plain text version, for a handout or a transcript.');

        if (flags.mp4) {
          try {
            const video = await pageToVideo(html, { width: 760, height: 560, frames: 90, fps: 30 });
            await write(`.${video.extension}`, video.buffer,
              `Recording of the model running (${video.codec}), for Canvas Studio when the interactive cannot be hosted.`
              + (video.universal ? '' : ' Upload it to Studio rather than linking it directly, so Studio transcodes it for every browser.'));
          } catch (e) {
            console.error(`  ${dim(`Video skipped: ${e.message}`)}`);
          }
        }

        await write('.notes.md', buildNotes({
          spec, a11y, problems, files: written, embedRung: INTERACTIVE_EMBED_NOTE,
        }), 'Build notes: alt text, image description, embed steps.');

        report(spec, stem, problems);
        if (problems.length) failures += 1;
      } else {
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
        if (problems.length) failures += 1;
      }
    } catch (e) {
      console.error(`${red('FAILED')} ${file}\n  ${e.stack || e.message}`);
      failures += 1;
    }
  }

  console.log(`\nWritten to ${bold(resolve(flags.out))}`);
  if (failures) process.exitCode = 1;
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
      const spec = await loadSpec(file);
      console.log(`${green('OK   ')} ${file} ${dim(`(${spec.type})`)}`);
    } catch (e) {
      console.error(`${red('BAD  ')} ${file}\n       ${e.message}`);
      bad += 1;
    }
  }
  if (bad) process.exitCode = 1;
}

function cmdTypes() {
  console.log(bold('Visual types\n'));
  const help = {
    timeline: 'Dated events in order. What happened when.',
    process: 'Ordered steps with a first and a last. How something is done.',
    cycle: 'A loop with no beginning or end. Something that repeats.',
    gantt: 'Tasks on a shared time axis, free to overlap. What runs alongside what.',
    comparison: 'Items scored against shared criteria. How options differ.',
    hierarchy: 'A tree. How a whole breaks into parts.',
    chart: 'Quantities, as grouped bars or lines. How much, and which way it is moving.',
    labelled: 'A subject with its parts named, pinned to a supplied image.',
    sequencer: 'INTERACTIVE. Learner predicts the timing of each item, then checks against the model.',
    simulation: 'INTERACTIVE. A model with sliders. Engines: orbit (Kepler) and growth (compounding).',
  };
  for (const t of VISUAL_TYPES) {
    console.log(`  ${bold(t.padEnd(12))} ${help[t]}`);
  }
  console.log(`\n${dim('Interactive types build an HTML page. The rest build an SVG and a PNG.')}`);
}

function cmdDoctor() {
  const caps = capabilities();
  console.log(bold('learnviz environment\n'));
  console.log(`  Node        ${process.version}`);
  console.log(`  Chromium    ${caps.chromium ? green(caps.chromium) : red('not found. PNG output is unavailable, SVG still works.')}`);
  console.log(`  ffmpeg      ${caps.ffmpeg ? green(caps.ffmpeg) : red('not found. Video output is unavailable.')}`);
  console.log(`  Video       ${caps.video.ok
    ? green(`${caps.video.codec}${caps.video.universal ? '' : ', upload via Canvas Studio so it is transcoded'}`)
    : red(caps.video.reason)}`);
  try {
    assertPaletteAccessible();
    console.log(`  Palette     ${green('every colour pair meets WCAG 2.2 AA')}`);
  } catch (e) {
    console.log(`  Palette     ${red(e.message)}`);
  }
}

function usage() {
  console.log(`${bold('learnviz')} builds accessible, Canvas-ready learning visuals from a JSON spec.

  ${bold('learnviz build')} <spec.json...> [--out DIR] [--no-png] [--video] [--width N] [--scale N]
  ${bold('learnviz validate')} <spec.json...>
  ${bold('learnviz types')}
  ${bold('learnviz doctor')}

Each build writes the visual, a paste-ready Canvas block, a plain text
equivalent, and build notes carrying the alt text and the embed steps.`);
}

/* ------------------------------------------------------------------ */

try {
  switch (command) {
    case 'build': await cmdBuild(argv.slice(1)); break;
    case 'validate': await cmdValidate(argv.slice(1)); break;
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

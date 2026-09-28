/**
 * Everything a learning object ships as, in one folder.
 *
 * One spec, many renditions, because the same activity is used by different
 * people in different places: a student on their phone inside Canvas, a teacher
 * at the front of a room, a reviewer checking the facts, a designer pasting it
 * into a page. Each gets the file that suits them, and none of them has to make
 * it from another.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { esc } from '../svg.js';
import { diagramBlock, interactiveBlock } from '../emble.js';
import { icon } from '../lo/shell.js';
import { scormPackage } from './scorm.js';
import { teacherGuide, reviewSheet, teachingNotes } from './docs.js';

/** A filesystem-safe name from a title. */
export function slugify(title, fallback = 'activity') {
  const s = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    // Trim after slicing as well as before, or a title cut mid-word leaves a
    // trailing hyphen on every file in the bundle.
    .replace(/^-+|-+$/g, '');
  return s || fallback;
}

/**
 * The files for one learning object, as { name, data, what } entries, without
 * touching the disk. `png` is an optional async function that rasterises the
 * figure; without it the figure ships as SVG only.
 */
export async function bundleFiles(b, { slug, source, png, video } = {}) {
  const files = [];
  const add = (name, data, what) => files.push({ name, data, what });

  add('index.html', b.html, 'The activity. One self-contained page: no fonts, libraries or data loaded from anywhere. Add #present to the address for presenter view.');

  const scored = b.meta.scored && typeof b.lo.passMark === 'number';
  add(`${slug}.scorm.zip`, scormPackage({
    title: b.lo.title,
    html: b.html,
    masteryScore: scored ? b.lo.passMark * 100 : undefined,
  }), 'SCORM 1.2 package for the Canvas SCORM tool. Reports completion, and a score where the activity has one.');

  add('canvas-page.html', `${b.native}\n`, 'Paste into the HTML editor of a Canvas page. No scripts, so it survives the editor and works in the mobile app.');
  add('canvas-embed.html', `${interactiveBlock({
    title: b.lo.title,
    a11y: b.a11y,
    height: 760,
    fallbackNote: 'If the activity does not load, the text version below has the same content.',
  })}\n`, 'Iframe block for when index.html is published on a web host.');

  if (b.figure) {
    add('figure.svg', b.figure.svg, 'The figure as a vector. Edit or rescale from this. Do not paste it into the Canvas editor, which strips SVG.');
    if (png) {
      try {
        add('figure.png', await png(b.figure), 'The figure as an image for Canvas Files, at twice size so it stays sharp.');
      } catch {
        // No browser to rasterise with. The SVG and the notes still ship.
      }
    }
    add('figure.canvas.html', `${diagramBlock({ a11y: b.figure.a11y })}\n`, 'Emble diagram block for the figure, with its alt text and image description.');
  }

  if (b.recording && video) {
    // Optional, and never fatal: without a full ffmpeg there is no video,
    // and every other rendition still ships.
    try {
      const v = await video(b.recording);
      add(`animation.${v.extension}`, v.buffer, `The animation as a video (${v.codec}) for Canvas Studio, which adds captions and plays in the mobile apps. It shows the starting settings. Learners cannot change them.`);
    } catch (e) {
      if (video.onError) video.onError(e);
    }
  }

  add('text-version.txt', `${b.a11y.textEquivalent}\n`, 'The whole activity as plain text, for a handout, a screen reader or a transcript.');
  if (source) add('spec.json', source, 'The spec this was built from. Edit it and build again to change anything.');

  // The guide lists the folder's files, so it is written last, from the list.
  const listed = [
    ...files,
    { name: 'teacher-guide.html', what: 'This guide, as a printable page. Also as teacher-guide.md.' },
    { name: 'review-sheet.html', what: 'The checklist for a subject expert before release. Also as review-sheet.md.' },
  ];
  const guide = teacherGuide(b, { slug, files: listed });
  const review = reviewSheet(b);
  add('teacher-guide.html', guide.html, 'How to use it before, during and after class, the answer key, and how to get it into Canvas.');
  add('teacher-guide.md', guide.md, 'The teacher guide as Markdown.');
  add('review-sheet.html', review.html, 'What a subject expert checks before release: sources, answers, accessibility.');
  add('review-sheet.md', review.md, 'The review sheet as Markdown.');
  return files;
}

/** Write one learning object's folder. Returns the file list. */
export async function writeBundle(b, { dir, slug, source, png, video }) {
  const files = await bundleFiles(b, { slug, source, png, video });
  await mkdir(dir, { recursive: true });
  for (const f of files) await writeFile(join(dir, f.name), f.data);
  return files;
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

const PLACES = [
  ['before', 'Before class', 'Nothing yet. A predict or estimate activity makes a strong hook: learners arrive with a guess they want to check.'],
  ['during', 'During class', 'Nothing yet. A step-by-step explanation in presenter view, or a scenario the room votes through, works at the front.'],
  ['after', 'After class', 'Nothing yet. Recall practice or a sorting task turns what was covered into something learners can do on their own.'],
  ['any', 'Any time', ''],
];

// Within a column, explanation comes before practice: hooks, then showing,
// then exploring, then applying, then recall.
const ARC = ['predict', 'estimate', 'stepthrough', 'explore', 'sort', 'order', 'scenario', 'cards'];

const DASH_CSS = `
:root { color-scheme: light; --ink: #000054; --soft: #3a3a6e; --line: #d9d9e6; --wash: #f5f5fa; --accent: #fac800; --ok: #00706b; --draft: #fdf223; --focus: #1a56c4; }
* { box-sizing: border-box; }
body { margin: 0; background: #ffffff; color: var(--ink); font: 16px/1.5 Helvetica, Arial, sans-serif; }
main { max-width: 1180px; margin: 0 auto; padding: 28px 16px 56px; }
h1 { font-size: 30px; line-height: 1.15; margin: 0 0 6px; }
.lede { color: var(--soft); max-width: 70ch; margin: 0 0 8px; }
.rule { width: 56px; height: 4px; background: var(--accent); border-radius: 2px; margin: 14px 0 24px; }
h2 { font-size: 21px; margin: 34px 0 4px; }
.group-note { color: var(--soft); font-size: 14.5px; margin: 0 0 14px; }
.arc { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; align-items: start; }
.col h3 { font-size: 13px; letter-spacing: .07em; text-transform: uppercase; color: var(--ok); margin: 0 0 8px; }
.card { border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; margin: 0 0 12px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,84,.06); }
.kind { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--ok); }
.card h4 { font-size: 17.5px; line-height: 1.25; margin: 6px 0 4px; }
.card p { margin: 0 0 8px; font-size: 14.5px; color: var(--soft); }
.draft { display: inline-block; background: var(--draft); color: #000; font-size: 12.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin: 0 0 8px; }
.ready { display: inline-block; background: #e3f2f1; color: var(--ok); font-size: 12.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin: 0 0 8px; }
.links { display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 14px; margin: 4px 0 0; padding: 0; list-style: none; }
.links a { color: var(--focus); font-weight: 700; }
.links a.primary { color: #fff; background: var(--ink); padding: 5px 12px; border-radius: 8px; text-decoration: none; }
a:focus-visible, summary:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; border-radius: 4px; }
details { margin-top: 10px; }
summary { cursor: pointer; font-weight: 700; font-size: 14px; }
iframe { width: 100%; height: 560px; border: 1px solid var(--line); border-radius: 10px; margin-top: 8px; background: #fff; }
.empty { border: 1px dashed var(--line); border-radius: 14px; padding: 14px; color: var(--soft); font-size: 14px; }
footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--soft); }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;

/**
 * The build-level page: every activity, grouped the way a designer plans a
 * week, with a live preview and every file one click away.
 *
 * items: [{ group, slug, b, files }]
 */
export function dashboard(items, { title = 'Learning activities' } = {}) {
  const groups = [];
  for (const it of items) {
    let g = groups.find((x) => x.name === it.group);
    if (!g) groups.push(g = { name: it.group, items: [] });
    g.items.push(it);
  }
  const drafts = items.filter((it) => it.b.draft.isDraft).length;

  const card = (it) => {
    const { b, slug } = it;
    const base = `${it.group ? `${encodeURIComponent(it.group)}/` : ''}${encodeURIComponent(slug)}`;
    const has = (n) => it.files.some((f) => f.name === n);
    const links = [
      `<li><a class="primary" href="${base}/index.html">Open</a></li>`,
      `<li><a href="${base}/index.html#present">Presenter view</a></li>`,
      `<li><a href="${base}/teacher-guide.html">Teacher guide</a></li>`,
      `<li><a href="${base}/review-sheet.html">Review sheet</a></li>`,
      `<li><a href="${base}/${encodeURIComponent(slug)}.scorm.zip">SCORM package</a></li>`,
      `<li><a href="${base}/canvas-page.html">Canvas page</a></li>`,
      has('figure.png') ? `<li><a href="${base}/figure.png">Figure</a></li>` : has('figure.svg') ? `<li><a href="${base}/figure.svg">Figure</a></li>` : '',
    ].join('');
    return `<article class="card">
  <span class="kind">${icon(b.lo.pattern, 14)} ${esc(b.meta.label)}</span>
  <h4>${esc(b.lo.title)}</h4>
  ${b.draft.isDraft ? `<span class="draft">Draft: ${esc(b.draft.reasons.join(' '))}</span>` : '<span class="ready">Ready</span>'}
  <p>${esc(b.lo.lede || b.lo.intent)}</p>
  <ul class="links">${links}</ul>
  <details><summary>Try it here</summary><iframe loading="lazy" src="${base}/index.html" title="${esc(b.lo.title)}"></iframe></details>
</article>`;
  };

  const sections = groups.map((g) => {
    const cols = PLACES.map(([key, label, gap]) => {
      const here = g.items
        .filter((it) => teachingNotes(it.b).placement === key)
        .sort((x, y) => ARC.indexOf(x.b.lo.pattern) - ARC.indexOf(y.b.lo.pattern));
      if (!here.length && key === 'any') return '';
      return `<div class="col"><h3>${label}</h3>${here.length ? here.map(card).join('') : `<p class="empty">${esc(gap)}</p>`}</div>`;
    }).join('');
    return `<section>
  ${g.name ? `<h2>${esc(g.name.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase()))}</h2>` : ''}
  <p class="group-note">${g.items.length} activit${g.items.length === 1 ? 'y' : 'ies'}, laid out across the week.</p>
  <div class="arc">${cols}</div>
</section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${DASH_CSS}</style>
</head>
<body><main>
<h1>${esc(title)}</h1>
<p class="lede">${items.length} activit${items.length === 1 ? 'y' : 'ies'}${drafts ? `, ${drafts} still in draft` : ''}. Open one to try it as a learner, use presenter view at the front of the room, and check the review sheet before release.</p>
<div class="rule"></div>
${sections}
<footer>Each folder also holds a paste-ready Canvas page, an iframe block, the text version and the spec it was built from.</footer>
</main></body>
</html>
`;
}

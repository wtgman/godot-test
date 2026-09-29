/**
 * A course workspace: one Canvas export, worked through page by page.
 *
 *   course/
 *     course.json          the outline: modules, pages, what each page holds
 *     outline.md           the same, to read at a glance
 *     source.imscc         the export, kept so the build can write it back
 *     pages/NN-slug.md     each page as clean text, in course order
 *     proposals/slug.json  options for a page, or { "kind": "skip" } with a reason
 *     specs/slug.json      the finished spec for a chosen option, when written
 *     choices.json         the designer's decisions, from the review app
 *     review/              the review app, rebuilt whenever proposals change
 *     build/               the output: activities, SCORM set, updated export
 *
 * Claude writes the proposals and the specs. The designer makes the choices.
 * The toolkit does everything else, and never overwrites anything a person
 * wrote: proposals, specs and choices are only ever read here.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';

import { readCourse, writeCourse } from './imscc.js';
import { splitPage, placeBlock, withBody } from './html.js';
import { validateProposal, numbered, DATA_STATUS } from '../proposal.js';
import { validateLO, buildLO, PATTERNS } from '../lo/index.js';
import { TEACHER_NOTE } from '../lo/native.js';
import { slugify, writeBundle } from '../delivery/bundle.js';
import { SpecError } from '../validate.js';

const pad = (n) => String(n).padStart(2, '0');
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

export function importCourse(exportPath, dir) {
  const buf = readFileSync(exportPath);
  const course = readCourse(buf);
  mkdirSync(join(dir, 'pages'), { recursive: true });
  mkdirSync(join(dir, 'proposals'), { recursive: true });
  mkdirSync(join(dir, 'specs'), { recursive: true });
  copyFileSync(exportPath, join(dir, 'source.imscc'));

  const pages = course.pages.map((p) => ({
    slug: p.slug,
    n: p.position,
    title: p.title,
    module: p.module,
    state: p.state,
    file: p.file,
    words: p.words,
    headings: p.headings,
    media: { images: p.media.images.length, embeds: p.media.embeds.map((e) => e.kind) },
    text: `pages/${pad(p.position)}-${p.slug}.md`,
  }));

  for (const p of course.pages) {
    const existing = [
      p.media.images.length ? `${p.media.images.length} image${p.media.images.length === 1 ? '' : 's'}` : '',
      ...p.media.embeds.map((e) => `an embedded ${e.kind}${e.title ? ` (${e.title})` : ''}`),
    ].filter(Boolean);
    writeFileSync(join(dir, `pages/${pad(p.position)}-${p.slug}.md`), [
      `# ${p.title}`,
      '',
      `- Page ${p.position} of ${course.pages.length}, in "${p.module}"`,
      `- Slug: \`${p.slug}\`. Write options to \`proposals/${p.slug}.json\``,
      `- ${p.words} words, ${p.state}${existing.length ? `. Already has ${existing.join(', ')}` : ''}`,
      p.headings.length ? `- Headings: ${p.headings.map((h) => `"${h.text}"`).join(', ')}` : '- No headings',
      '',
      '---',
      '',
      p.text,
      '',
    ].join('\n'));
  }

  const meta = {
    kind: 'course',
    title: course.title,
    source: basename(exportPath),
    sourceHash: createHash('sha256').update(buf).digest('hex').slice(0, 16),
    modules: course.modules.map((m) => ({ title: m.title, state: m.state, items: m.items })),
    pages,
  };
  writeFileSync(join(dir, 'course.json'), `${JSON.stringify(meta, null, 2)}\n`);
  writeFileSync(join(dir, 'outline.md'), outline(meta));
  return meta;
}

function outline(meta) {
  const lines = [`# ${meta.title}`, '', `${meta.pages.length} pages in ${meta.modules.length} modules. Imported from \`${meta.source}\`.`, ''];
  for (const m of meta.modules) {
    lines.push(`## ${m.title}${m.state !== 'active' ? ' (unpublished)' : ''}`, '');
    for (const it of m.items) {
      if (it.kind === 'heading') { lines.push(`- **${it.title}**`); continue; }
      if (it.kind === 'page') {
        const p = meta.pages.find((x) => x.slug === it.slug);
        lines.push(`- Page ${p.n}: ${p.title} (\`${p.slug}\`, ${p.words} words${p.headings.length ? `, ${p.headings.length} heading${p.headings.length === 1 ? '' : 's'}` : ''})`);
      } else {
        lines.push(`- ${it.kind[0].toUpperCase()}${it.kind.slice(1)}: ${it.title}`);
      }
    }
    lines.push('');
  }
  return `${lines.join('\n')}`;
}

/* ------------------------------------------------------------------ */
/* Reading the workspace                                               */
/* ------------------------------------------------------------------ */

export function loadWorkspace(dir) {
  if (!existsSync(join(dir, 'course.json'))) throw new Error(`${dir} is not a course workspace. Run: learnviz course import <export.imscc> --out ${dir}`);
  const meta = readJson(join(dir, 'course.json'));
  const pages = meta.pages.map((p) => ({ ...p, proposal: readProposal(dir, p.slug), spec: readSpec(dir, p.slug) }));
  const choicesFile = join(dir, 'choices.json');
  const choices = existsSync(choicesFile) ? readJson(choicesFile) : null;
  return { dir, meta, pages, choices };
}

/**
 * A page's proposal: { status: "missing" | "skip" | "ready" | "invalid", ... }.
 * A skip is { "kind": "skip", "reason": "..." }, for pages that do not need an
 * activity, such as a welcome page.
 */
function readProposal(dir, slug) {
  const file = join(dir, 'proposals', `${slug}.json`);
  if (!existsSync(file)) return { status: 'missing' };
  let raw;
  try {
    raw = readJson(file);
  } catch (e) {
    return { status: 'invalid', error: `Not valid JSON. ${e.message}` };
  }
  if (raw && raw.kind === 'skip') {
    if (typeof raw.reason !== 'string' || !raw.reason.trim()) return { status: 'invalid', error: 'A skip needs a "reason", in a sentence the designer can agree or disagree with.' };
    return { status: 'skip', reason: raw.reason };
  }
  try {
    for (const [i, c] of (raw.candidates || []).entries()) {
      if (c && typeof c.sketchFile === 'string') {
        c.sketch = readJson(join(dir, 'proposals', c.sketchFile));
        delete c.sketchFile;
        if (!c.sketch) throw new SpecError(`candidates[${i}].sketchFile is empty`);
      }
    }
    return { status: 'ready', proposal: validateProposal(raw) };
  } catch (e) {
    return { status: 'invalid', error: e.message };
  }
}

function readSpec(dir, slug) {
  const file = join(dir, 'specs', `${slug}.json`);
  if (!existsSync(file)) return null;
  try {
    return { lo: validateLO(readJson(file)) };
  } catch (e) {
    return { error: e.message };
  }
}

/** One line per page: what is proposed, what was chosen, what is left to do. */
export function status(ws) {
  return ws.pages.map((p) => {
    const d = ws.choices?.pages?.[p.slug];
    let next;
    if (p.proposal.status === 'missing') next = 'write options';
    else if (p.proposal.status === 'invalid') next = 'fix the proposal';
    else if (!d) next = 'waiting for the designer';
    else if (d.decision === 'options') next = 'write options: the designer wants some';
    else if (d.decision === 'skip') next = 'nothing, skipped';
    else if (!p.spec) {
      const c = p.proposal.proposal?.candidates?.[d.candidate];
      next = c?.sketch ? 'ready to build from the sketch, as a draft' : 'write the finished spec';
    }
    else if (p.spec.error) next = 'fix the spec';
    else next = 'ready to build';
    return { slug: p.slug, n: p.n, title: p.title, module: p.module, proposal: p.proposal.status, error: p.proposal.error || p.spec?.error, decision: d?.decision || null, next };
  });
}

/* ------------------------------------------------------------------ */
/* Review                                                              */
/* ------------------------------------------------------------------ */

/**
 * Everything the review app needs, and the sketch pages it shows. Sketches are
 * written as separate files so the app itself stays small whatever the size of
 * the course.
 */
export function reviewData(ws) {
  const sketches = [];
  const pages = ws.pages.map((p) => {
    const text = readFileSync(join(ws.dir, p.text), 'utf8').split('\n---\n').slice(1).join('\n---\n').trim();
    const base = { slug: p.slug, n: p.n, title: p.title, module: p.module, state: p.state, words: p.words, headings: p.headings.map((h) => h.text), text, status: p.proposal.status };
    if (p.proposal.status === 'skip') return { ...base, reason: p.proposal.reason };
    if (p.proposal.status === 'invalid') return { ...base, error: p.proposal.error };
    if (p.proposal.status !== 'ready') return base;
    const pr = p.proposal.proposal;
    return {
      ...base,
      analysis: pr.analysis,
      options: numbered(pr).map(({ c, n, index, sketch }) => {
        let file = null;
        if (sketch) {
          file = `sketches/${p.slug}-${n}.html`;
          sketches.push({ file, html: sketch.html });
        }
        return {
          n,
          index,
          name: c.name,
          pattern: c.pattern,
          label: PATTERNS[c.pattern].meta.label,
          why: PATTERNS[c.pattern].meta.why,
          scored: PATTERNS[c.pattern].meta.scored,
          placement: c.placement,
          angle: c.angle,
          payoff: c.payoff,
          addresses: c.addresses || '',
          effort: c.effort,
          recommended: Boolean(c.recommended),
          data: { label: DATA_STATUS[c.data.status].label, blocking: DATA_STATUS[c.data.status].blocking, needs: c.data.needs || '' },
          insert: c.insert || 'end',
          sketch: file,
        };
      }),
    };
  });
  return {
    data: { title: ws.meta.title, key: `learnviz:${ws.meta.sourceHash}`, pages, saved: ws.choices?.pages || {} },
    sketches,
  };
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

/**
 * Build every chosen activity and write the course back out.
 *
 * @returns {{ built: [], skipped: [], problems: [], refused: [] }}
 */
export async function buildCourse(ws, { out, release = false, png = null, video = null } = {}) {
  const decisions = ws.choices?.pages || {};
  const results = { built: [], skipped: [], problems: [], refused: [], waiting: [] };
  const plans = [];

  for (const p of ws.pages) {
    const d = decisions[p.slug];
    if (!d || d.decision === 'options') { if (p.proposal.status !== 'skip') results.waiting.push(p); continue; }
    if (d.decision === 'skip') { results.skipped.push(p); continue; }
    if (d.decision !== 'build') { results.problems.push({ page: p, message: `Unknown decision "${d.decision}"` }); continue; }

    // The finished spec if Claude has written one, otherwise the chosen sketch.
    let lo = null;
    let fromSketch = false;
    if (p.spec?.lo) lo = p.spec.lo;
    else if (p.spec?.error) { results.problems.push({ page: p, message: `specs/${p.slug}.json: ${p.spec.error}` }); continue; } else if (p.proposal.status === 'ready') {
      const c = p.proposal.proposal.candidates[d.candidate];
      if (!c) { results.problems.push({ page: p, message: `The chosen option (${d.candidate + 1}) is not in the proposal any more. Choose again.` }); continue; }
      if (!c.sketch) { results.problems.push({ page: p, message: `"${c.name}" has no sketch yet. Write specs/${p.slug}.json.` }); continue; }
      lo = validateLO(c.sketch);
      fromSketch = true;
    } else { results.problems.push({ page: p, message: 'Chosen, but the proposal is missing or invalid.' }); continue; }

    const probe = buildLO(lo);
    if (release && probe.draft.isDraft) { results.refused.push({ page: p, reasons: probe.draft.reasons }); continue; }
    plans.push({ page: p, decision: d, lo, fromSketch });
  }
  if (release && results.refused.length) return results;

  mkdirSync(join(out, 'scorm'), { recursive: true });
  const courseSlug = slugify(ws.meta.title, 'course');
  const source = readCourse(readFileSync(join(ws.dir, 'source.imscc')));
  const pageHtml = new Map();
  const files = [];

  for (const plan of plans) {
    const { page, decision, lo, fromSketch } = plan;
    const moduleSlug = slugify(page.module, 'module');
    const slug = `${pad(page.n)}-${page.slug}`;
    const figurePath = `learnviz/${page.slug}/figure.png`;

    // The standalone bundle, as for any activity.
    const standalone = buildLO(lo);
    const dir = join(out, 'activities', moduleSlug, slug);
    const written = await writeBundle(standalone, { dir, slug: page.slug, source: `${JSON.stringify(lo, null, 2)}\n`, png, video });
    copyFileSync(join(dir, `${page.slug}.scorm.zip`), join(out, 'scorm', `${slug}.scorm.zip`));

    // The version for the page, with the figure as a real course file.
    const figurePng = written.find((f) => f.name === 'figure.png');
    const forPage = buildLO(lo, figurePng ? { figureUrl: `$IMS-CC-FILEBASE$/${figurePath}` } : {});
    if (figurePng) files.push({ path: `web_resources/${figurePath}`, data: readFileSync(join(dir, 'figure.png')) });

    let block = forPage.native.replace(TEACHER_NOTE, `For the teacher: the interactive version of this activity is scorm/${slug}.scorm.zip in the course build. Upload it with the SCORM tool and add it to this module, then delete this line.`);
    if (forPage.draft.isDraft) {
      block = `<p><span style="background-color: #fdf223;"><strong>Draft for review.</strong> ${forPage.draft.reasons.join(' ')} Not for students until a subject expert has checked it.</span></p>\n${block}`;
    }
    const current = pageHtml.get(page.file) ?? source.entries.find((e) => e.name === page.file).data.toString('utf8');
    const { body } = splitPage(current);
    const placed = placeBlock(body, block, page.slug, decision.insert || 'end');
    pageHtml.set(page.file, withBody(current, placed.body));

    results.built.push({
      page, pattern: lo.pattern, title: lo.title, placed: placed.placed, scorm: `scorm/${slug}.scorm.zip`,
      scored: PATTERNS[lo.pattern].meta.scored, passMark: lo.passMark, draft: forPage.draft, fromSketch,
      problems: standalone.problems, folder: `activities/${moduleSlug}/${slug}`,
    });
  }

  const pkg = `${courseSlug}-with-activities.imscc`;
  writeFileSync(join(out, pkg), writeCourse(source.entries, { pages: pageHtml, files }));
  const checklist = uploadChecklist(ws, results, pkg);
  writeFileSync(join(out, 'upload-checklist.md'), checklist.md);
  writeFileSync(join(out, 'upload-checklist.html'), checklist.html);
  results.package = pkg;
  return results;
}

/* ------------------------------------------------------------------ */
/* The checklist that goes with the package                            */
/* ------------------------------------------------------------------ */

function uploadChecklist(ws, r, pkg) {
  const drafts = r.built.filter((b) => b.draft.isDraft).length;
  const rows = r.built.map((b) => [
    `${b.page.n}. ${b.page.title}`,
    b.page.module,
    `${b.title} (${PATTERNS[b.pattern].meta.label})`,
    b.placed,
    b.scorm,
    b.scored ? `Scored${typeof b.passMark === 'number' ? `, pass ${Math.round(b.passMark * 100)}%` : ''}` : 'Completion only',
    b.draft.isDraft ? `Draft: ${b.draft.reasons.join(' ')}` : 'Ready',
  ]);
  const steps = [
    `**Try it in a sandbox course first.** In a blank course, go to Settings, then Import Course Content, choose Canvas Course Export Package, and upload \`${pkg}\`. Canvas imports the whole course with each activity already on its page, and the figures as course files.`,
    '**Then bring it into the live course, knowing how Canvas matches content.** Re-importing into the course the export came from updates pages that have the same identifier, and any edits made there since the export are overwritten. Export the live course again just before you build, so nothing is lost.',
    '**Upload each SCORM package** in `scorm/` with the SCORM tool, if your course has it, choosing graded or ungraded, and add it to the module next to its page. Then delete the yellow teacher note on that page.',
    drafts ? `**Resolve the ${drafts} draft${drafts === 1 ? '' : 's'}.** Each has a yellow draft note on its page and a review sheet in its folder under \`activities/\`. Build again with \`--release\` once they are checked.` : '**Every activity is released.**',
    '**Check in Student View**: open each changed page, answer an activity, open a SCORM activity and look at the gradebook.',
  ];
  const md = [
    `# Upload checklist: ${ws.meta.title}`,
    '',
    `${r.built.length} activit${r.built.length === 1 ? 'y' : 'ies'} built into ${new Set(r.built.map((b) => b.page.slug)).size} pages. ${r.skipped.length} page${r.skipped.length === 1 ? '' : 's'} skipped.${r.waiting.length ? ` ${r.waiting.length} still undecided.` : ''}`,
    '',
    '## Steps',
    '',
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    '## What was built',
    '',
    '| Page | Module | Activity | Placed | SCORM | In Canvas | Status |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`),
    '',
  ].join('\n');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const html = `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(`Upload checklist: ${ws.meta.title}`)}</title>
<style>
body{margin:0;background:#fff;color:#000054;font:16px/1.55 Helvetica,Arial,sans-serif}main{max-width:1100px;margin:0 auto;padding:28px 16px 48px}
h1{font-size:28px;margin:0 0 6px}h2{font-size:20px;margin:28px 0 8px}code{background:#f5f5fa;padding:1px 5px;border-radius:4px;font-size:14px}
ol li{margin:0 0 8px}.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:14.5px;min-width:760px}th,td{text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid #d9d9e6}
th{font-size:12.5px;text-transform:uppercase;letter-spacing:.04em}.draft{background:#fdf223;padding:1px 6px;border-radius:4px}a{color:#1a56c4}
</style></head><body><main>
<h1>Upload checklist</h1>
<p>${esc(ws.meta.title)}. ${esc(md.split('\n')[2])}</p>
<p><a href="activities/index.html">Open the activities dashboard</a></p>
<h2>Steps</h2>
<ol>${steps.map((s) => `<li>${inline(s)}</li>`).join('')}</ol>
<h2>What was built</h2>
<div class="wrap"><table><thead><tr>${['Page', 'Module', 'Activity', 'Placed', 'SCORM', 'In Canvas', 'Status'].map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
<tbody>${r.built.map((b, i) => `<tr>${rows[i].map((c, j) => `<td>${j === 2 ? `<a href="${esc(b.folder)}/index.html">${esc(c)}</a>` : j === 6 && b.draft.isDraft ? `<span class="draft">${esc(c)}</span>` : esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
</main></body></html>
`;
  return { md, html };
}


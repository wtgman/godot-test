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
import { join, basename, dirname } from 'node:path';
import { createHash } from 'node:crypto';

import { readCourse, writeCourse, writePageUpdate } from './imscc.js';
import { splitPage, placeBlock, withBody } from './html.js';
import { validateProposal, numbered, renderGallery, DATA_STATUS } from '../proposal.js';
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

  // Alt text that tells a screen reader user nothing: missing, a file name,
  // or a placeholder that leaked through from a template.
  const badAlt = (a) => !a || /^(null|undefined|image|img|picture|photo|graphic)$/i.test(a.trim()) || /\.(png|jpe?g|gif|svg|webp)$/i.test(a.trim());
  const pages = course.pages.map((p) => ({
    slug: p.slug,
    n: p.position,
    title: p.title,
    module: p.module,
    state: p.state,
    file: p.file,
    words: p.words,
    headings: p.headings,
    media: { images: p.media.images.length, embeds: p.media.embeds.map((e) => e.kind), badAlt: p.media.images.filter(badAlt).length },
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
      ...(p.media.images.filter(badAlt).length ? [`- Accessibility: ${p.media.images.filter(badAlt).length} image${p.media.images.filter(badAlt).length === 1 ? '' : 's'} without useful alt text (${p.media.images.filter(badAlt).map((a) => (a ? `"${a}"` : 'none')).join(', ')})`] : []),
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
        lines.push(`- Page ${p.n}: ${p.title} (\`${p.slug}\`, ${p.words} words${p.headings.length ? `, ${p.headings.length} heading${p.headings.length === 1 ? '' : 's'}` : ''}${p.media.badAlt ? `, **${p.media.badAlt} image${p.media.badAlt === 1 ? '' : 's'} missing alt text**` : ''})`);
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
    else {
      // Every chosen option needs a finished spec or a sketch to build from.
      const items = itemsOf(d);
      const states = items.map((it) => {
        const spec = specFor(ws, p, it.candidate, items.length === 1);
        if (spec?.error) return 'error';
        if (spec?.lo) return 'spec';
        return p.proposal.proposal?.candidates?.[it.candidate]?.sketch ? 'sketch' : 'none';
      });
      if (states.includes('error')) next = 'fix the spec';
      else if (states.includes('none')) next = 'write the finished spec';
      else if (states.includes('sketch')) next = `ready to build${items.length > 1 ? ` (${items.length} activities)` : ''} from the sketch, as a draft`;
      else next = 'ready to build';
    }
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
    const base = { slug: p.slug, n: p.n, title: p.title, module: p.module, state: p.state, words: p.words, headings: p.headings.map((h) => h.text), text, status: p.proposal.status, badAlt: p.media.badAlt || 0 };
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
 * The activities chosen for a page. A decision is either one choice,
 * { candidate, insert }, or several, { items: [{ candidate, insert }] }, for a
 * page that wants more than one activity.
 */
export function itemsOf(d) {
  if (!d || d.decision !== 'build') return [];
  if (Array.isArray(d.items)) return d.items;
  return [{ candidate: d.candidate, insert: d.insert }];
}

/** The finished spec for one chosen option: specs/<slug>-<n>.json, or specs/<slug>.json for a single choice. */
function specFor(ws, p, candidate, single) {
  const file = join(ws.dir, 'specs', `${p.slug}-${candidate + 1}.json`);
  if (existsSync(file)) {
    try { return { lo: validateLO(readJson(file)), file }; } catch (e) { return { error: e.message, file }; }
  }
  if (single && p.spec) return { ...p.spec, file: join(ws.dir, 'specs', `${p.slug}.json`) };
  return null;
}

/** Turn one page's decision into build plans, or problems saying why not. */
function planPage(ws, p, d, release) {
  const plans = [];
  const problems = [];
  const refused = [];
  const items = itemsOf(d);
  items.forEach((it, k) => {
    let lo = null;
    let fromSketch = false;
    const spec = specFor(ws, p, it.candidate, items.length === 1);
    if (spec?.lo) lo = spec.lo;
    else if (spec?.error) { problems.push({ page: p, message: `${spec.file.split('/').slice(-2).join('/')}: ${spec.error}` }); return; } else if (p.proposal.status === 'ready') {
      const c = p.proposal.proposal.candidates[it.candidate];
      if (!c) { problems.push({ page: p, message: `The chosen option (${it.candidate + 1}) is not in the proposal any more. Choose again.` }); return; }
      if (!c.sketch) { problems.push({ page: p, message: `"${c.name}" has no sketch yet. Write specs/${p.slug}-${it.candidate + 1}.json.` }); return; }
      lo = validateLO(c.sketch);
      fromSketch = true;
    } else { problems.push({ page: p, message: 'Chosen, but the proposal is missing or invalid.' }); return; }
    const probe = buildLO(lo);
    if (release && probe.draft.isDraft) { refused.push({ page: p, reasons: probe.draft.reasons }); return; }
    const suffix = items.length > 1 ? `-${k + 1}` : '';
    plans.push({ page: p, insert: it.insert || 'end', lo, fromSketch, key: `${p.slug}${suffix}`, name: `${pad(p.n)}-${p.slug}${suffix}` });
  });
  return { plans, problems, refused };
}

/**
 * Build a set of plans: each activity's bundle and SCORM package, and its
 * Canvas version placed into its page. Returns the changed pages and the new
 * files, for whichever package the caller writes.
 */
async function makeActivities(ws, plans, { out, png, video, scormNote }) {
  mkdirSync(join(out, 'scorm'), { recursive: true });
  const source = readCourse(readFileSync(join(ws.dir, 'source.imscc')));
  const pageHtml = new Map();
  const files = [];
  const built = [];
  for (const plan of plans) {
    const { page, insert, lo, fromSketch, key, name } = plan;
    const moduleSlug = slugify(page.module, 'module');
    const figurePath = `learnviz/${key}/figure.png`;

    const standalone = buildLO(lo);
    const dir = join(out, 'activities', moduleSlug, name);
    const written = await writeBundle(standalone, { dir, slug: key, source: `${JSON.stringify(lo, null, 2)}\n`, png, video });
    copyFileSync(join(dir, `${key}.scorm.zip`), join(out, 'scorm', `${name}.scorm.zip`));

    const figurePng = written.find((f) => f.name === 'figure.png');
    const forPage = buildLO(lo, figurePng ? { figureUrl: `$IMS-CC-FILEBASE$/${figurePath}` } : {});
    if (figurePng) files.push({ path: `web_resources/${figurePath}`, data: readFileSync(join(dir, 'figure.png')) });

    let block = forPage.native.replace(TEACHER_NOTE, scormNote(`scorm/${name}.scorm.zip`));
    if (forPage.draft.isDraft) {
      block = `<p><span style="background-color: #fdf223;"><strong>Draft for review.</strong> ${forPage.draft.reasons.join(' ')} Not for students until a subject expert has checked it.</span></p>\n${block}`;
    }
    const current = pageHtml.get(page.file) ?? source.entries.find((e) => e.name === page.file).data.toString('utf8');
    const placed = placeBlock(splitPage(current).body, block, key, insert);
    pageHtml.set(page.file, withBody(current, placed.body));

    built.push({
      page, pattern: lo.pattern, title: lo.title, placed: placed.placed, scorm: `scorm/${name}.scorm.zip`,
      scored: PATTERNS[lo.pattern].meta.scored, passMark: lo.passMark, draft: forPage.draft, fromSketch,
      problems: standalone.problems, folder: `activities/${moduleSlug}/${name}`,
    });
  }
  return { source, pageHtml, files, built };
}

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
    const r = planPage(ws, p, d, release);
    plans.push(...r.plans);
    results.problems.push(...r.problems);
    results.refused.push(...r.refused);
  }
  if (release && results.refused.length) return results;

  const made = await makeActivities(ws, plans, {
    out, png, video,
    scormNote: (f) => `For the teacher: the interactive version of this activity is ${f} in the course build. Upload it with the SCORM tool and add it to this module, then delete this line.`,
  });
  results.built = made.built;
  const pkg = `${slugify(ws.meta.title, 'course')}-with-activities.imscc`;
  writeFileSync(join(out, pkg), writeCourse(made.source.entries, { pages: made.pageHtml, files: made.files }));
  const checklist = uploadChecklist(ws, results, pkg);
  writeFileSync(join(out, 'upload-checklist.md'), checklist.md);
  writeFileSync(join(out, 'upload-checklist.html'), checklist.html);
  results.package = pkg;
  return results;
}

/* ------------------------------------------------------------------ */
/* One page at a time                                                  */
/* ------------------------------------------------------------------ */

/** Find a page by slug, by number, or "next": the first with options and no decision. */
export function findPage(ws, which) {
  if (which === 'next') {
    return ws.pages.find((p) => p.proposal.status === 'ready' && !ws.choices?.pages?.[p.slug]) || null;
  }
  if (/^\d+$/.test(String(which))) return ws.pages.find((p) => p.n === Number(which)) || null;
  return ws.pages.find((p) => p.slug === which) || null;
}

/** The gallery for one page, as a self-contained HTML file. */
export function pageGallery(ws, p, nav) {
  if (p.proposal.status !== 'ready') throw new Error(`${p.slug} has no options to show (${p.proposal.status}${p.proposal.error ? `: ${p.proposal.error}` : ''}).`);
  const text = readFileSync(join(ws.dir, p.text), 'utf8').split('\n---\n').slice(1).join('\n---\n').trim();
  return renderGallery(p.proposal.proposal, {
    page: { slug: p.slug, n: p.n, total: ws.pages.length, title: p.title, module: p.module, text, headings: p.headings.map((h) => h.text), nav },
  });
}

const galleryFile = (p) => `${pad(p.n)}-${p.slug}.html`;

/**
 * Every page's gallery at once, linked to each other, with an index. For a
 * designer who wants to go through them all and send back a stack of replies.
 */
export function allGalleries(ws) {
  const pages = ws.pages.filter((p) => p.proposal.status === 'ready');
  const files = pages.map((p, i) => ({
    file: galleryFile(p),
    page: p,
    html: pageGallery(ws, p, {
      index: 'index.html',
      prev: pages[i - 1] ? { file: galleryFile(pages[i - 1]), n: pages[i - 1].n } : null,
      next: pages[i + 1] ? { file: galleryFile(pages[i + 1]), n: pages[i + 1].n } : null,
    }),
  }));
  const decided = (p) => ws.choices?.pages?.[p.slug];
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rows = ws.pages.map((p) => {
    const d = decided(p);
    const status = d ? (d.decision === 'build' ? `Chosen: ${itemsOf(d).length} activit${itemsOf(d).length === 1 ? 'y' : 'ies'}` : d.decision === 'skip' ? 'No activity' : 'Asked for other options')
      : p.proposal.status === 'skip' ? 'Suggested: no activity' : p.proposal.status === 'ready' ? '' : 'No options yet';
    const link = p.proposal.status === 'ready' ? `<a href="${esc(galleryFile(p))}">${esc(p.title)}</a>` : esc(p.title);
    return `<tr${p.proposal.status === 'ready' ? '' : ' class="quiet"'}><td>${p.n}</td><td>${link}</td><td>${esc(p.module)}</td><td>${esc(status)}</td></tr>`;
  }).join('');
  const index = `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(`Pages: ${ws.meta.title}`)}</title>
<style>
body{margin:0;background:#fff;color:#000054;font:16px/1.55 Helvetica,Arial,sans-serif}main{max-width:980px;margin:0 auto;padding:28px 16px 48px}
h1{font-size:28px;line-height:1.2;margin:0 0 8px}ol{padding-left:22px}li{margin:0 0 6px}.wrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:15px}th,td{text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid #d9d9e6}
th{font-size:12.5px;text-transform:uppercase;letter-spacing:.04em}tr.quiet td{color:#5a5a86}a{color:#1a56c4;font-weight:700}
.note{border-left:4px solid #fac800;background:#fffbe6;padding:10px 14px;border-radius:0 8px 8px 0}
</style></head><body><main>
<p style="font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#00706b;margin:0 0 6px">${pages.length} pages with options</p>
<h1>${esc(ws.meta.title)}</h1>
<ol>
<li>Open each page with options, try them, tick what you want and where it goes.</li>
<li>Press <strong>Copy my reply</strong> and paste it into a note. Keep adding each page's reply underneath the last.</li>
<li>Paste the whole stack back to Claude at once. Every page is built and put in one folder, ready to import.</li>
</ol>
<p class="note">Pages suggested for no activity are listed in grey. Say so in your stack if you want options for one of them.</p>
<div class="wrap"><table><thead><tr><th scope="col">Page</th><th scope="col">Title</th><th scope="col">Module</th><th scope="col">Status</th></tr></thead><tbody>${rows}</tbody></table></div>
</main></body></html>
`;
  return { files, index };
}

/** Every build code in a pasted stack of gallery replies, in order. */
export function extractBuildCodes(text) {
  const marked = [...String(text).matchAll(/Build code:\s*(.+)/gi)].map((m) => m[1].trim());
  if (marked.length) return marked;
  return String(text).split(/\n+/).map((l) => l.trim()).filter((l) => /^\S+\s+(none|\d+@)/i.test(l));
}

/**
 * Read a build code from the gallery reply: "slug 1@end 3@after:Heading text",
 * or "slug none". Option numbers are the gallery's, recommended first.
 */
export function parseBuildCode(ws, code) {
  const m = String(code).trim().replace(/^Build code:\s*/i, '').match(/^(\S+)\s+([\s\S]*)$/);
  if (!m) throw new Error('A build code looks like: page-slug 1@end 2@after:Heading text');
  const p = findPage(ws, m[1]);
  if (!p) throw new Error(`No page "${m[1]}" in this course.`);
  if (/^none$/i.test(m[2].trim())) return { page: p, decision: { decision: 'skip' } };
  if (p.proposal.status !== 'ready') throw new Error(`${p.slug} has no options to choose from.`);
  const list = numbered(p.proposal.proposal);
  const items = [];
  const re = /(\d+)@(start|end|after:[\s\S]*?)(?=\s+\d+@|\s*$)/g;
  let pick;
  while ((pick = re.exec(m[2]))) {
    const opt = list.find((x) => x.n === Number(pick[1]));
    if (!opt) throw new Error(`There is no option ${pick[1]} for ${p.slug}. The options go from 1 to ${list.length}.`);
    const w = pick[2];
    items.push({ candidate: opt.index, option: opt.n, name: opt.c.name, pattern: opt.c.pattern, insert: w.startsWith('after:') ? { after: w.slice(6).trim() } : w });
  }
  if (!items.length) throw new Error('No choices found in the build code. Each looks like 1@end.');
  return { page: p, decision: { decision: 'build', items } };
}

/** Record a page's decision in choices.json, keeping everything else there. */
export function recordDecision(ws, slug, decision) {
  const file = join(ws.dir, 'choices.json');
  const choices = existsSync(file) ? readJson(file) : { kind: 'course-choices', course: ws.meta.title, pages: {} };
  choices.pages = { ...choices.pages, [slug]: decision };
  writeFileSync(file, `${JSON.stringify(choices, null, 2)}\n`);
  ws.choices = choices;
  return choices;
}

/**
 * Build one page's chosen activities, and a package that updates just that
 * page in the original course.
 */
export async function buildPage(ws, slug, { out, release = false, png = null, video = null } = {}) {
  const p = findPage(ws, slug);
  if (!p) throw new Error(`No page "${slug}" in this course.`);
  const d = ws.choices?.pages?.[p.slug];
  if (!d || d.decision !== 'build') throw new Error(`Nothing chosen to build for ${p.slug}.`);
  const r = planPage(ws, p, d, release);
  const results = { page: p, built: [], problems: r.problems, refused: r.refused };
  // All or nothing: a package holding some of what was chosen could be
  // imported without anyone noticing the rest is missing.
  if (r.problems.length || r.refused.length || !r.plans.length) return results;

  const made = await makeActivities(ws, r.plans, {
    out, png, video,
    scormNote: (f) => `For the teacher: the interactive version of this activity is ${f}. Upload it with the SCORM tool and add it to this module next to this page, then delete this line.`,
  });
  results.built = made.built;
  const html = made.pageHtml.get(p.file);
  const name = `${pad(p.n)}-${p.slug}`;
  results.package = `${name}-update.imscc`;
  writeFileSync(join(out, results.package), writePageUpdate(made.source.entries, { file: p.file, html, files: made.files }));
  writeFileSync(join(out, 'page-with-activities.html'), `${splitPage(html).body.trim()}\n`);
  for (const f of made.files) {
    const dest = join(out, 'files', f.path.replace(/^web_resources\/learnviz\//, ''));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, f.data);
  }
  writeFileSync(join(out, 'how-to-add-it.html'), pageInstructions(ws, p, results, made.files));
  return results;
}

function pageInstructions(ws, p, r, files) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const drafts = r.built.filter((b) => b.draft.isDraft).length;
  return `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(`Adding activities to ${p.title}`)}</title>
<style>
body{margin:0;background:#fff;color:#000054;font:16px/1.55 Helvetica,Arial,sans-serif}main{max-width:820px;margin:0 auto;padding:28px 16px 48px}
h1{font-size:27px;line-height:1.2;margin:0 0 6px}h2{font-size:19px;margin:26px 0 8px}code{background:#f5f5fa;padding:1px 5px;border-radius:4px;font-size:14px}
li{margin:0 0 8px}.note{border-left:4px solid #fac800;background:#fffbe6;padding:10px 14px;border-radius:0 8px 8px 0}.draft{background:#fdf223;padding:1px 6px;border-radius:4px}a{color:#1a56c4}
</style></head><body><main>
<p style="font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#00706b;margin:0 0 6px">Page ${p.n} &middot; ${esc(p.module)}</p>
<h1>${esc(p.title)}</h1>
<p>${r.built.length} activit${r.built.length === 1 ? 'y' : 'ies'} built for this page:</p>
<ul>${r.built.map((b) => `<li><strong>${esc(b.title)}</strong>, ${esc(b.placed)}.${b.draft.isDraft ? ` <span class="draft">Draft: ${esc(b.draft.reasons.join(' '))}</span>` : ''}</li>`).join('')}</ul>
<h2>Either: import it (updates the page in place)</h2>
<ol>
<li>In your course, go to <strong>Settings</strong>, then <strong>Import Course Content</strong>.</li>
<li>Choose <strong>Canvas Course Export Package</strong> and upload <code>${esc(r.package)}</code>.</li>
<li>Choose <strong>Select specific content</strong>, and after it uploads, tick only this page${files.length ? ' and its files' : ''}. Leave everything else unticked.</li>
<li>Open the page and check the activities are there.</li>
</ol>
<p class="note">The package carries this page under the identifier it has in your course, so Canvas matches it and updates the page. It is built from your export, so any edit made to this page in Canvas since you exported will be replaced. The first time, try it on a copy of the course.</p>
<h2>Or: paste it in</h2>
<ol>
<li>Open the page in Canvas, choose <strong>Edit</strong>, and switch to the HTML editor.</li>
<li>Replace everything with the contents of <code>page-with-activities.html</code>, then save.</li>
${files.length ? `<li>Upload the image${files.length === 1 ? '' : 's'} in <code>files/</code> to Course Files, then in the page use <strong>Insert, then Image, then Course Images</strong> to put ${files.length === 1 ? 'it' : 'each one'} where the activity shows it. The alt text is already written.</li>` : ''}
</ol>
<h2>Then</h2>
<ul>
<li>Upload each SCORM package in <code>scorm/</code> with the SCORM tool if you want the full interactive version, and delete the yellow teacher note on the page.</li>
${drafts ? `<li>${drafts === 1 ? 'The activity is a draft' : `${drafts} activities are drafts`}: work through the review sheet in <code>activities/</code> before students see ${drafts === 1 ? 'it' : 'them'}.</li>` : ''}
<li>Each activity's teacher guide is in its folder under <code>activities/</code>.</li>
</ul>
</main></body></html>
`;
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


/* ------------------------------------------------------------------ */
/* The folder everything goes into                                     */
/* ------------------------------------------------------------------ */

/**
 * Record a built page in the ready-to-import folder and rewrite its index, so
 * the folder always says what is in it, however many runs it took.
 */
export function recordReady(ws, readyDir, r) {
  const logFile = join(readyDir, 'built.json');
  const log = existsSync(logFile) ? readJson(logFile) : [];
  const entry = {
    n: r.page.n,
    slug: r.page.slug,
    title: r.page.title,
    module: r.page.module,
    package: `${pad(r.page.n)}-${r.page.slug}-update.imscc`,
    folder: `${pad(r.page.n)}-${r.page.slug}`,
    activities: r.built.map((b) => ({ title: b.title, pattern: b.pattern, placed: b.placed, draft: b.draft.isDraft })),
  };
  const next = [...log.filter((x) => x.slug !== entry.slug), entry].sort((a, b) => a.n - b.n);
  writeFileSync(logFile, `${JSON.stringify(next, null, 2)}\n`);
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  writeFileSync(join(readyDir, 'index.html'), `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(`Ready to import: ${ws.meta.title}`)}</title>
<style>
body{margin:0;background:#fff;color:#000054;font:16px/1.55 Helvetica,Arial,sans-serif}main{max-width:980px;margin:0 auto;padding:28px 16px 48px}
h1{font-size:28px;line-height:1.2;margin:0 0 8px}ol li{margin:0 0 6px}.wrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:15px}th,td{text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid #d9d9e6}
th{font-size:12.5px;text-transform:uppercase;letter-spacing:.04em}a{color:#1a56c4;font-weight:700}code{background:#f5f5fa;padding:1px 5px;border-radius:4px;font-size:14px}
.draft{background:#fdf223;padding:0 5px;border-radius:4px;font-size:13px}.note{border-left:4px solid #fac800;background:#fffbe6;padding:10px 14px;border-radius:0 8px 8px 0}
</style></head><body><main>
<p style="font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#00706b;margin:0 0 6px">Ready to import</p>
<h1>${esc(ws.meta.title)}</h1>
<p>${next.length} page${next.length === 1 ? '' : 's'} built. Each <code>.imscc</code> in this folder updates one page of the course.</p>
<ol>
<li>In the course, go to <strong>Settings</strong>, then <strong>Import Course Content</strong>, then <strong>Canvas Course Export Package</strong>.</li>
<li>Upload one page's <code>.imscc</code>, choose <strong>Select specific content</strong>, and tick only that page and its files.</li>
<li>Repeat for each page. Each page's folder has the paste-in version, SCORM packages, teacher guides and review sheets.</li>
</ol>
<p class="note">Each package is that page as it was in the export, plus its activities. Edits made to the page in Canvas since the export are replaced. Try the first one on a copy of the course.</p>
<div class="wrap"><table><thead><tr><th scope="col">Page</th><th scope="col">Import this</th><th scope="col">Activities</th></tr></thead><tbody>
${next.map((e) => `<tr><td>${e.n}. <a href="${esc(e.folder)}/how-to-add-it.html">${esc(e.title)}</a><br><small>${esc(e.module)}</small></td><td><code>${esc(e.package)}</code></td><td>${e.activities.map((a) => `${esc(a.title)}, ${esc(a.placed)}${a.draft ? ' <span class="draft">draft</span>' : ''}`).join('<br>')}</td></tr>`).join('')}
</tbody></table></div>
</main></body></html>
`);
  return entry;
}

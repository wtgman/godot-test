/**
 * The proposal. What gets produced before anything is built.
 *
 * Building the first activity that comes to mind is the main way this tool
 * could waste a teacher's time. The obvious visual is usually the one the prose
 * already implies, so it adds nothing, and it crowds out the angle nobody had
 * thought of. Once an artefact exists, people edit it rather than ask whether
 * it was the right one.
 *
 * So the first output is a menu, and it starts from the learning rather than
 * from the chart types. What are the few ideas that matter here, which one
 * changes how learners see the rest, and what do they already believe that is
 * wrong? Each candidate then says which of those it works on, what the learner
 * does, when in the week it belongs, and where its content comes from. Where it
 * can, it carries a sketch: a working draft of the activity that can be tried
 * in the gallery before anyone chooses.
 *
 * Data provenance is enforced rather than trusted. A candidate that needs
 * figures nobody has is caught here, at the cost of one line, rather than after
 * someone has published numbers that were quietly invented.
 */

import { SpecError, fail, str, arr, oneOf, bool } from './validate.js';
import { validateLO, buildLO, PATTERNS } from './lo/index.js';
import { PLACEMENTS } from './lo/schema.js';
import { icon } from './lo/shell.js';
import { esc } from './svg.js';

/**
 * Where a candidate's content comes from. `in-source` and invented must never
 * blur, which is the whole point of the field.
 */
export const DATA_STATUS = {
  'none-needed': {
    label: 'No data needed',
    note: 'Structural. Everything required is already described in the source.',
    blocking: false,
  },
  'in-source': {
    label: 'Data is in the source',
    note: 'Every figure comes from the supplied content and can be checked against it.',
    blocking: false,
  },
  'needs-teacher': {
    label: 'Needs content from you',
    note: 'The shape is right, but the figures or cases have to come from the unit guide, the cohort or the workplace.',
    blocking: true,
  },
  'needs-research': {
    label: 'Needs sourcing and checking',
    note: 'The figures exist publicly but must be found, cited and checked before release.',
    blocking: true,
  },
  unavailable: {
    label: 'Data does not exist',
    note: 'Proposed, then ruled out because the figures are not public or not separable.',
    blocking: true,
  },
};

export const EFFORT = ['low', 'medium', 'high'];

const PLACE_WORDS = { before: 'Before class', during: 'During class', after: 'After class', any: 'Any time' };

/** Validate a proposal. Sketches must already be inlined (the CLI loads sketchFile). */
export function validateProposal(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('proposal', 'must be a JSON object');
  if (raw.kind !== 'proposal') fail('kind', 'must be the string "proposal", so a proposal cannot be mistaken for a spec');

  str(raw.topic, 'topic', { max: 160 });
  str(raw.sourceSummary, 'sourceSummary', { max: 900 });
  str(raw.audience, 'audience', { required: false, max: 200 });

  // The analysis comes first because it is what the candidates answer to.
  const a = raw.analysis;
  if (!a || typeof a !== 'object') {
    fail('analysis', 'is required. Say what matters in the content before proposing what to build: { "keyIdeas": [...], "misconceptions": [...] }');
  }
  arr(a.keyIdeas, 'analysis.keyIdeas', {
    min: 1,
    max: 6,
    overMessage: (n) => `has ${n} key ideas. More than 6 is a summary, not an analysis. Which ones would a learner be lost without?`,
  }).forEach((k, i) => str(k, `analysis.keyIdeas[${i}]`, { max: 240 }));
  str(a.threshold, 'analysis.threshold', { required: false, max: 400 });
  str(a.knowledge, 'analysis.knowledge', { required: false, max: 300 });
  str(a.skill, 'analysis.skill', { required: false, max: 300 });
  if (a.misconceptions !== undefined) {
    arr(a.misconceptions, 'analysis.misconceptions', { min: 0, max: 5 }).forEach((m, i) => {
      str(m.belief, `analysis.misconceptions[${i}].belief`, { max: 240 });
      str(m.reality, `analysis.misconceptions[${i}].reality`, { max: 320 });
    });
  }

  if (raw.questions !== undefined) {
    arr(raw.questions, 'questions', {
      min: 0,
      max: 6,
      overMessage: (n) => `has ${n} questions. More than 6 stops being a clarification and becomes an interview, and it will not get answered. Ask the ones that change what you build.`,
    }).forEach((q, i) => {
      str(q.ask, `questions[${i}].ask`, { max: 240 });
      str(q.why, `questions[${i}].why`, { max: 400 });
      if (q.options !== undefined) {
        arr(q.options, `questions[${i}].options`, { min: 2, max: 5 }).forEach((o, j) => str(o, `questions[${i}].options[${j}]`, { max: 160 }));
      }
    });
  }

  const candidates = arr(raw.candidates, 'candidates', {
    min: 2,
    max: 8,
    overMessage: (n) => `has ${n} candidates. More than 8 is a catalogue, not a choice, and nobody reads to the bottom. Cut to the ones you would actually build.`,
  });

  const sketches = candidates.map((c, i) => {
    const at = `candidates[${i}]`;
    str(c.name, `${at}.name`, { max: 120 });
    oneOf(c.pattern, `${at}.pattern`, Object.keys(PATTERNS), { what: 'pattern' });
    str(c.angle, `${at}.angle`, { max: 500 });
    str(c.payoff, `${at}.payoff`, { max: 300 });
    str(c.addresses, `${at}.addresses`, { required: false, max: 240 });
    oneOf(c.placement, `${at}.placement`, PLACEMENTS, { what: 'placement' });
    oneOf(c.effort, `${at}.effort`, EFFORT, { what: 'effort level' });
    bool(c.recommended, `${at}.recommended`);
    // For a page in a course: where on the page it belongs. "start", "end",
    // or { "after": "Heading" } for the end of that heading's section.
    if (c.insert !== undefined && c.insert !== 'start' && c.insert !== 'end') {
      if (!c.insert || typeof c.insert !== 'object') fail(`${at}.insert`, 'must be "start", "end" or { "after": "Heading text" }');
      str(c.insert.after, `${at}.insert.after`, { max: 200 });
    }

    if (!c.data || typeof c.data !== 'object') {
      fail(`${at}.data`, 'is required. Every candidate must say where its content comes from before anyone builds it.');
    }
    oneOf(c.data.status, `${at}.data.status`, Object.keys(DATA_STATUS), { what: 'data status' });
    // A blocking status without what is missing is useless: nobody can act on
    // "needs figures" without knowing which figures.
    str(c.data.needs, `${at}.data.needs`, { required: DATA_STATUS[c.data.status].blocking, max: 400 });

    if (c.sketch === undefined) return null;
    let lo;
    try {
      lo = validateLO(c.sketch);
    } catch (e) {
      if (e instanceof SpecError) throw new SpecError(`${at}.sketch.${e.message}`);
      throw e;
    }
    if (lo.pattern !== c.pattern) fail(`${at}.sketch.pattern`, `is "${lo.pattern}" but the candidate says "${c.pattern}"`);
    // A preview in a proposal is never a finished activity. It must say so on
    // its face, with the draft banner.
    const built = buildLO(lo);
    if (!built.draft.isDraft) {
      fail(`${at}.sketch`, 'builds as finished, but a sketch in a proposal must be a draft. Add "sketch": true, or leave its sources marked "to-check".');
    }
    return built;
  });

  const recommended = candidates.filter((c) => c.recommended);
  if (recommended.length === 0) {
    fail('candidates', 'has no candidate marked `recommended`. A menu with no recommendation pushes the decision back onto the teacher, which is the work they asked you to do.');
  }
  if (recommended.length > 3) {
    fail('candidates', `marks ${recommended.length} candidates as recommended. Recommend a short arc, one to three activities, not most of the list.`);
  }

  if (raw.rejected !== undefined) {
    arr(raw.rejected, 'rejected', { min: 0, max: 8 }).forEach((r, i) => {
      str(r.name, `rejected[${i}].name`, { max: 120 });
      str(r.because, `rejected[${i}].because`, { max: 500 });
    });
  }

  const copy = structuredClone(raw);
  return Object.freeze({ ...copy, _sketches: sketches });
}

/* ------------------------------------------------------------------ */
/* The brief, as Markdown                                              */
/* ------------------------------------------------------------------ */

/** Recommended first, then the rest, numbered across both so a reply can say "1 and 4". */
export function numbered(proposal) {
  const all = proposal.candidates.map((c, i) => ({ c, index: i, sketch: proposal._sketches?.[i] || null }));
  return [...all.filter((x) => x.c.recommended), ...all.filter((x) => !x.c.recommended)]
    .map((x, i) => ({ ...x, n: i + 1 }));
}

export function renderProposal(proposal) {
  const { topic, sourceSummary, audience, analysis } = proposal;
  const questions = proposal.questions || [];
  const rejected = proposal.rejected || [];
  const list = numbered(proposal);
  const out = [`# Activity options: ${topic}`, '', sourceSummary];
  if (audience) out.push('', `**Who it is for.** ${audience}`);

  out.push('', '## What matters here', '', analysis.keyIdeas.map((k) => `- ${k}`).join('\n'));
  if (analysis.threshold) out.push('', `**The idea that unlocks the rest.** ${analysis.threshold}`);
  if (analysis.misconceptions?.length) {
    out.push('', '**What learners often arrive believing**', '');
    out.push(analysis.misconceptions.map((m) => `- *${m.belief}* ${m.reality}`).join('\n'));
  }

  if (questions.length) {
    out.push('', `## ${questions.length} question${questions.length === 1 ? '' : 's'} before I build`, '');
    questions.forEach((q, i) => {
      out.push(`**${i + 1}. ${q.ask}**`, '', q.why);
      if (q.options?.length) out.push('', q.options.map((o) => `- ${o}`).join('\n'));
      out.push('');
    });
  }

  const rec = list.filter((x) => x.c.recommended);
  out.push('', '## Recommended arc', '');
  out.push(rec.map((x) => `- **${PLACE_WORDS[x.c.placement]}.** ${x.n}. ${x.c.name}`).join('\n'));

  const block = ({ c, n, sketch }) => {
    const status = DATA_STATUS[c.data.status];
    const lines = [
      `### ${n}. ${c.name}`,
      '',
      `${PATTERNS[c.pattern].meta.label} · ${PLACE_WORDS[c.placement]} · ${status.label} · ${c.effort} effort${sketch ? ' · sketch to try' : ''}`,
      '',
      `**The angle.** ${c.angle}`,
      '',
      `**What a learner can do after it.** ${c.payoff}`,
    ];
    if (c.addresses) lines.push('', `**Works on.** ${c.addresses}`);
    if (c.data.needs) lines.push('', `**What it needs.** ${c.data.needs}`);
    return lines.join('\n');
  };
  out.push('', '## The options', '');
  for (const x of list) out.push(block(x), '');

  if (rejected.length) {
    out.push('## Considered and ruled out', '');
    out.push(rejected.map((r) => `- **${r.name}.** ${r.because}`).join('\n'), '');
  }

  const blocking = list.filter((x) => DATA_STATUS[x.c.data.status].blocking);
  if (blocking.length) {
    out.push('## Before these can be released', '');
    out.push(blocking.map((x) => `- **${x.n}. ${x.c.name}**: ${DATA_STATUS[x.c.data.status].label.toLowerCase()}. ${x.c.data.needs}`).join('\n'), '');
  }

  out.push('## Next step', '');
  out.push(`Open the gallery to try the sketches, then reply with the numbers you want built, from 1 to ${list.length}. Nothing is built until you choose.`, '');
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** One row per candidate, for the terminal, in the brief's numbering. */
export function summariseProposal(proposal) {
  return numbered(proposal).map(({ c, n, sketch }) => ({
    n,
    name: c.name,
    pattern: c.pattern,
    placement: c.placement,
    status: c.data.status,
    effort: c.effort,
    recommended: Boolean(c.recommended),
    sketch: Boolean(sketch),
  }));
}

/* ------------------------------------------------------------------ */
/* The gallery                                                         */
/* ------------------------------------------------------------------ */

const GALLERY_CSS = `
:root { color-scheme: light; --ink: #000054; --soft: #3a3a6e; --line: #d9d9e6; --wash: #f5f5fa; --accent: #fac800; --ok: #00706b; --miss: #a4177c; --part: #8a5a00; --focus: #1a56c4; --draft: #fdf223; }
* { box-sizing: border-box; }
body { margin: 0; background: #ffffff; color: var(--ink); font: 16px/1.55 Helvetica, Arial, sans-serif; }
main { max-width: 1040px; margin: 0 auto; padding: 28px 16px 120px; }
.kicker { font-size: 13px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: var(--ok); margin: 0 0 6px; }
h1 { font-size: 32px; line-height: 1.15; margin: 0 0 10px; }
h2 { font-size: 22px; margin: 36px 0 10px; }
h3 { font-size: 18px; margin: 0 0 6px; line-height: 1.3; }
p { margin: 0 0 10px; }
.lede { font-size: 18px; max-width: 70ch; }
.muted { color: var(--soft); }
.rule { width: 56px; height: 4px; background: var(--accent); border-radius: 2px; margin: 16px 0 8px; }
.panel { background: var(--wash); border-radius: 14px; padding: 16px 18px; }
.two { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
.threshold { border-left: 5px solid var(--accent); background: #fffbe6; padding: 12px 16px; border-radius: 0 12px 12px 0; margin: 12px 0 0; }
table { width: 100%; border-collapse: collapse; font-size: 15px; }
th, td { text-align: left; vertical-align: top; padding: 9px 10px; border-bottom: 1px solid var(--line); }
th { font-size: 12.5px; letter-spacing: .05em; text-transform: uppercase; }
.q { border: 1px solid var(--line); border-radius: 12px; padding: 12px 16px; margin: 0 0 10px; }
.q ul { margin: 6px 0 0; }
.arc { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.arc-col { border: 2px solid var(--line); border-radius: 12px; padding: 12px 14px; }
.arc-col h3 { font-size: 13px; letter-spacing: .07em; text-transform: uppercase; color: var(--ok); }
.arc-col a { color: var(--ink); font-weight: 700; }
.opt { border: 1px solid var(--line); border-radius: 16px; padding: 18px; margin: 0 0 16px; box-shadow: 0 1px 2px rgba(0,0,84,.06); scroll-margin-top: 16px; }
.opt.is-rec { border: 2px solid var(--ink); }
.opt-head { display: flex; gap: 14px; align-items: flex-start; }
.num { flex: 0 0 38px; height: 38px; border-radius: 50%; background: var(--ink); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 17px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px; padding: 0; list-style: none; }
.chip { display: inline-flex; gap: 5px; align-items: center; font-size: 12.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: var(--wash); }
.chip.pattern { color: var(--ok); }
.chip.rec { background: var(--ink); color: #fff; }
.chip.block { background: #fbeaf3; color: var(--miss); }
.chip.ok { background: #e3f2f1; color: var(--ok); }
.opt dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 14px; margin: 0 0 10px; }
.opt dt { font-weight: 800; }
.opt dd { margin: 0; }
@media (max-width: 560px) { .opt dl { grid-template-columns: 1fr; } .opt dd { margin-bottom: 6px; } }
.choose { display: inline-flex; gap: 10px; align-items: center; font-weight: 800; border: 2px solid var(--ink); border-radius: 10px; padding: 8px 14px; cursor: pointer; margin-top: 6px; min-height: 44px; }
.choose input { width: 20px; height: 20px; accent-color: var(--ink); margin: 0; }
.choose:has(input:checked) { background: var(--ink); color: #fff; }
.choose:has(input:focus-visible) { outline: 3px solid var(--focus); outline-offset: 2px; }
details.try { margin-top: 12px; }
details.try summary { cursor: pointer; font-weight: 800; color: var(--focus); min-height: 32px; }
details.try summary:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; border-radius: 4px; }
.frame { width: 100%; height: 640px; border: 1px solid var(--line); border-radius: 12px; margin-top: 8px; background: #fff; display: block; }
.nopreview { margin-top: 12px; padding: 10px 14px; border: 1px dashed var(--line); border-radius: 12px; color: var(--soft); font-size: 14.5px; }
.ruled li { margin-bottom: 8px; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #ffffff; border-top: 2px solid var(--ink); padding: 10px 16px; box-shadow: 0 -4px 14px rgba(0,0,84,.08); }
.bar-in { max-width: 1040px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
.bar output { font-weight: 800; }
.bar button { font: inherit; font-weight: 800; background: var(--ink); color: #fff; border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer; min-height: 44px; }
.bar button:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.bar button:disabled { opacity: .45; cursor: default; }
.bar button.sec { background: #fff; color: var(--ink); border: 2px solid var(--ink); }
.bar output { white-space: pre-line; flex: 1 1 320px; }
.where { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; margin: 10px 0 0; font-weight: 700; font-size: 14.5px; max-width: 100%; }
.where select { flex: 1 1 220px; min-width: 0; width: 100%; font: inherit; font-weight: 400; border: 2px solid var(--line); border-radius: 10px; padding: 8px 10px; min-height: 44px; background: #fff; color: var(--ink); text-overflow: ellipsis; }
.pagetext { border: 1px solid var(--line); border-radius: 12px; margin: 10px 0 0; }
.pagetext summary { cursor: pointer; font-weight: 800; padding: 10px 14px; min-height: 44px; }
.pagetext > div { max-height: 420px; overflow: auto; padding: 0 16px 12px; border-top: 1px solid var(--line); }
.pagetext h4 { margin: 14px 0 4px; font-size: 16px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; scroll-behavior: auto !important; } }
`;

/* eslint-disable no-var, prefer-arrow-callback, func-names */
function galleryClient() {
  var boxes = Array.prototype.slice.call(document.querySelectorAll('.choose input'));
  var out = document.getElementById('g-chosen');
  var copy = document.getElementById('g-copy');
  var live = document.getElementById('g-live');
  var none = document.getElementById('g-none');
  var page = document.body.getAttribute('data-page');
  var nothing = false;
  var join = function (a) { return a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
  function where(n) {
    var sel = document.getElementById('where-' + n);
    return sel ? sel.value : null;
  }
  function words(w) {
    if (w === 'start') return 'at the top of the page';
    if (w && w.indexOf('after:') === 0) return 'at the end of the section "' + w.slice(6) + '"';
    return 'at the end of the page';
  }
  function reply() {
    var picked = boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
    if (!page) return picked.length ? 'Please build ' + join(picked) + '.' : '';
    var title = document.body.getAttribute('data-page-title');
    if (nothing) return title + ': no activity for this page.\nBuild code: ' + page + ' none';
    if (!picked.length) return '';
    return title + ': please build ' + join(picked.map(function (n) { return 'option ' + n + ' ' + words(where(n)); })) + '.'
      + '\nBuild code: ' + page + ' ' + picked.map(function (n) { return n + '@' + (where(n) || 'end'); }).join(' ');
  }
  function sync() {
    var text = reply();
    out.textContent = text ? text.split('\n')[0] : 'Tick the options you want built.';
    copy.disabled = !text;
  }
  boxes.forEach(function (b) { b.addEventListener('change', function () { if (b.checked) nothing = false; sync(); }); });
  document.querySelectorAll('.where select').forEach(function (s) { s.addEventListener('change', sync); });
  if (none) none.addEventListener('click', function () {
    nothing = true;
    boxes.forEach(function (b) { b.checked = false; });
    sync();
  });
  copy.addEventListener('click', function () {
    var text = reply();
    var done = function () { live.textContent = 'Copied: ' + text; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { live.textContent = 'Could not copy. Select the text beside the button instead.'; });
    } else {
      live.textContent = 'Select the text beside the button to copy it.';
    }
  });
  // Previews report their height, so each frame fits its activity.
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'lv:height') return;
    var frames = document.querySelectorAll('iframe.frame');
    for (var i = 0; i < frames.length; i += 1) {
      if (frames[i].contentWindow === e.source) frames[i].style.height = Math.min(Math.max(360, e.data.height + 8), 2400) + 'px';
    }
  });
  sync();
}
/* eslint-enable */

const attr = (s) => esc(s).replace(/"/g, '&quot;');

function placeOptions(headings, insert) {
  const cur = insert && typeof insert === 'object' ? `after:${insert.after}` : insert || 'end';
  const opts = [['end', 'At the end of the page'], ['start', 'At the top of the page'], ...headings.map((h) => [`after:${h}`, `At the end of "${h}"`])];
  if (!opts.some(([v]) => v === cur)) opts.push([cur, `After "${cur.slice(6)}" (not found on the page)`]);
  return opts.map(([v, l]) => `<option value="${attr(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('');
}

/** Page text (light Markdown from the course import) as simple HTML. */
function pageHtml(text) {
  return text.split('\n').map((line) => {
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) return `<h4>${esc(h[2])}</h4>`;
    if (!line.trim()) return '';
    if (/^\[(Image|Embedded)/.test(line)) return `<p class="muted"><em>${esc(line)}</em></p>`;
    return `<p>${esc(line)}</p>`;
  }).join('');
}

/**
 * The gallery: the analysis, the questions, the recommended arc, and every
 * option with a live preview and a box to tick. A teacher can try the sketches
 * as a learner would, choose, and copy a one-line reply.
 */
/**
 * @param {object} proposal a validated proposal
 * @param {{ page?: { slug, n, total, title, module, text, headings } }} [options]
 *   page: show it as one page of a course. Its text appears above the options,
 *   each option gets a "Place it" menu of the page's headings, several can be
 *   ticked, and the reply names the page and a build code for each choice.
 */
export function renderGallery(proposal, { page } = {}) {
  const { topic, sourceSummary, audience, analysis } = proposal;
  const questions = proposal.questions || [];
  const rejected = proposal.rejected || [];
  const list = numbered(proposal);

  const misconceptions = analysis.misconceptions?.length
    ? `<h3 style="margin-top:18px">What learners often arrive believing</h3>
<table><thead><tr><th scope="col">The belief</th><th scope="col">What is actually the case</th></tr></thead>
<tbody>${analysis.misconceptions.map((m) => `<tr><td>${esc(m.belief)}</td><td>${esc(m.reality)}</td></tr>`).join('')}</tbody></table>`
    : '';

  const knowSkill = analysis.knowledge || analysis.skill
    ? `<div class="two" style="margin-top:14px">${analysis.knowledge ? `<div class="panel"><strong>What learners need to know.</strong> ${esc(analysis.knowledge)}</div>` : ''}${analysis.skill ? `<div class="panel"><strong>What they need to be able to do.</strong> ${esc(analysis.skill)}</div>` : ''}</div>`
    : '';

  const arc = ['before', 'during', 'after'].map((p) => {
    const here = list.filter((x) => x.c.recommended && x.c.placement === p);
    return `<div class="arc-col"><h3>${PLACE_WORDS[p]}</h3>${here.length
      ? here.map((x) => `<p><a href="#opt-${x.n}">${x.n}. ${esc(x.c.name)}</a><br><span class="muted">${esc(PATTERNS[x.c.pattern].meta.label)}</span></p>`).join('')
      : '<p class="muted">Nothing recommended here. The other options below may fill it.</p>'}</div>`;
  }).join('');
  const anyRec = list.filter((x) => x.c.recommended && x.c.placement === 'any');
  const anyNote = anyRec.length ? `<p class="muted" style="margin-top:8px">Any time: ${anyRec.map((x) => `<a href="#opt-${x.n}">${x.n}. ${esc(x.c.name)}</a>`).join(', ')}</p>` : '';

  const options = list.map(({ c, n, sketch }) => {
    const status = DATA_STATUS[c.data.status];
    const meta = PATTERNS[c.pattern].meta;
    const preview = sketch
      ? `<details class="try"${c.recommended ? ' open' : ''}><summary>Try the sketch as a learner</summary>
  <iframe class="frame" title="Sketch of option ${n}: ${attr(c.name)}" loading="lazy" srcdoc="${attr(sketch.html)}"></iframe></details>`
      : `<p class="nopreview">No sketch yet. ${status.blocking ? esc(c.data.needs) : 'It will be drafted if you choose it.'}</p>`;
    return `<article class="opt${c.recommended ? ' is-rec' : ''}" id="opt-${n}" aria-labelledby="opt-${n}-h">
  <div class="opt-head"><span class="num" aria-hidden="true">${n}</span><div style="flex:1;min-width:0">
  <h3 id="opt-${n}-h"><span class="sr">Option ${n}. </span>${esc(c.name)}</h3>
  <ul class="chips">
    ${c.recommended ? '<li class="chip rec">Recommended</li>' : ''}
    <li class="chip pattern">${icon(c.pattern, 13)} ${esc(meta.label)}</li>
    <li class="chip">${PLACE_WORDS[c.placement]}</li>
    <li class="chip ${status.blocking ? 'block' : 'ok'}">${esc(status.label)}</li>
    <li class="chip">${esc(c.effort)} effort</li>
  </ul>
  <dl>
    <dt>The angle</dt><dd>${esc(c.angle)}</dd>
    <dt>Afterwards</dt><dd>${esc(c.payoff)}</dd>
    ${c.addresses ? `<dt>Works on</dt><dd>${esc(c.addresses)}</dd>` : ''}
    <dt>Why this format</dt><dd>${esc(meta.why)}</dd>
    ${c.data.needs ? `<dt>What it needs</dt><dd>${esc(c.data.needs)}</dd>` : ''}
  </dl>
  <label class="choose"><input type="checkbox" value="${n}"> Build option ${n}</label>
  ${page ? `<span class="where"><label for="where-${n}">Place it</label> <select id="where-${n}">${placeOptions(page.headings, c.insert)}</select></span>` : ''}
  ${preview}
  </div></div>
</article>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(`Options: ${topic}`)}</title>
<style>${GALLERY_CSS}</style>
</head>
<body${page ? ` data-page="${attr(page.slug)}" data-page-title="${attr(`Page ${page.n}, ${page.title}`)}"` : ''}><main>
<p class="kicker">${page ? `${esc(page.module)} &middot; Page ${page.n} of ${page.total}` : 'Activity options'}</p>
<h1>${esc(page ? page.title : topic)}</h1>
<p class="lede">${esc(sourceSummary)}</p>
${page ? `<details class="pagetext"><summary>What the page says</summary><div>${pageHtml(page.text)}</div></details>` : ''}
${audience ? `<p class="muted"><strong>Who it is for.</strong> ${esc(audience)}</p>` : ''}
<div class="rule"></div>

<h2>What matters here</h2>
<ul>${analysis.keyIdeas.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>
${analysis.threshold ? `<p class="threshold"><strong>The idea that unlocks the rest.</strong> ${esc(analysis.threshold)}</p>` : ''}
${knowSkill}
${misconceptions}

${questions.length ? `<h2>Questions that would change what I build</h2>
${questions.map((q, i) => `<div class="q"><p><strong>${i + 1}. ${esc(q.ask)}</strong></p><p class="muted">${esc(q.why)}</p>${q.options?.length ? `<ul>${q.options.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}</div>`).join('')}` : ''}

${page ? '' : `<h2>Recommended arc</h2>
<p class="muted">How the recommended options fit across a week. Every option can be tried below before you choose.</p>
<div class="arc">${arc}</div>${anyNote}`}

<h2>The options</h2>
${page ? '<p class="muted">Tick one or more, and choose where each goes on the page. Try any of them first.</p>' : ''}
${options}

${rejected.length ? `<h2>Considered and ruled out</h2>
<ul class="ruled">${rejected.map((r) => `<li><strong>${esc(r.name)}.</strong> ${esc(r.because)}</li>`).join('')}</ul>` : ''}
</main>
<div class="bar" role="region" aria-label="Your choice"><div class="bar-in">
  <output id="g-chosen" aria-live="polite"></output>
  ${page ? '<button type="button" id="g-none" class="sec">Nothing for this page</button>' : ''}
  <button type="button" id="g-copy">Copy my reply</button>
  <p id="g-live" class="sr" aria-live="polite"></p>
</div></div>
<script>(${galleryClient.toString()})();</script>
</body>
</html>
`;
}

export { SpecError };

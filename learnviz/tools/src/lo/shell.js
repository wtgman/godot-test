/**
 * The page every learning object is built into.
 *
 * Three audiences share this one file. A student works through it. A teacher
 * opens it with `#present` and drives it from the front of a room. A SCORM
 * player wraps it and reads the score. So it has to be self-contained, it has
 * to look finished, and it has to work with a keyboard, a screen reader, a
 * phone and a projector.
 *
 * Design rules that are enforced here rather than left to each pattern:
 *   - No external requests of any kind. No fonts, no CDN, no analytics.
 *   - Every control is a real button, input or link.
 *   - Feedback is carried by a word and a symbol as well as a colour.
 *   - Motion is short, and is switched off when the reader asks for less motion.
 *   - The intent is shown to the learner in their terms, not the teacher's.
 */

import { esc } from '../svg.js';
import { runtimeSource, exprSource } from '../runtime/client.js';

/** Small inline icons, one per pattern, so each activity type is recognisable at a glance. */
export const ICONS = {
  predict: '<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6.2 6.1a1.9 1.9 0 1 1 2.6 1.8c-.6.3-.8.6-.8 1.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.6" r=".9" fill="currentColor"/>',
  stepthrough: '<rect x="1.5" y="10" width="4" height="4.5" rx="1" fill="currentColor"/><rect x="6" y="6" width="4" height="8.5" rx="1" fill="currentColor" opacity=".7"/><rect x="10.5" y="2" width="4" height="12.5" rx="1" fill="currentColor" opacity=".4"/>',
  sort: '<rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" fill="currentColor"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="9" width="5.5" height="5.5" rx="1.2" fill="currentColor"/>',
  order: '<path d="M2 3.5h8M2 8h8M2 12.5h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M13 2.5v11M11 11l2 2.5 2-2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  scenario: '<path d="M2 3.5A2 2 0 0 1 4 1.5h8a2 2 0 0 1 2 2V9a2 2 0 0 1-2 2H7l-3.5 3v-3H4a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  estimate: '<rect x="1.5" y="3" width="9" height="3" rx="1" fill="currentColor"/><rect x="1.5" y="9.5" width="6" height="3" rx="1" fill="currentColor" opacity=".45"/><path d="M12.5 8v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12.5" cy="8" r="1.8" fill="currentColor"/>',
  explore: '<path d="M2 4h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="4" r="2.1" fill="currentColor"/><circle cx="10.5" cy="12" r="2.1" fill="currentColor"/>',
  cards: '<rect x="4" y="1.5" width="10" height="11" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="3.5" width="10" height="11" rx="1.6" fill="currentColor"/>',
};

export function icon(pattern, size = 16) {
  const body = ICONS[pattern];
  if (!body) return '';
  return `<svg class="lv-icon" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${body}</svg>`;
}

/**
 * Turn the teacher-facing intent into a learner-facing goal.
 * "Learners can explain X" reads as a sentence about someone else.
 * "After this, you can explain X" is a promise to the person reading it.
 */
export function learnerGoal(intent, goal) {
  if (goal) return { lead: 'After this, you can', rest: goal.replace(/^\s*(?:after this,?\s*)?you can\s+/i, '') };
  const m = /^\s*(?:learners|students|participants)\s+(?:can|will be able to|are able to)\s+(.*)$/i.exec(intent);
  // Only rewrite when nothing else in the sentence refers back to "learners".
  // "how they respond" would become wrong in the second person, and guessing
  // which "they" means the learner is how a tool puts words in a teacher's
  // mouth. Write a "goal" in the spec to control this line exactly.
  if (m && !/\b(they|their|them|themselves)\b/i.test(m[1])) return { lead: 'After this, you can', rest: m[1] };
  return { lead: 'Goal:', rest: intent };
}

export const CSS = `
:root {
  color-scheme: light;
  --ink: #000054;
  --ink-soft: #3a3a6e;
  --paper: #ffffff;
  --wash: #f5f5fa;
  --line: #d9d9e6;
  --line-strong: #b9b9cc;
  --accent: #fac800;
  --ok: #00706b;
  --ok-wash: #e6f3f2;
  --miss: #a4177c;
  --miss-wash: #f8e8f3;
  --part: #8a5a00;
  --part-wash: #f7efe0;
  --focus: #1a56c4;
  --draft: #fdf223;
  --radius: 14px;
  --radius-s: 9px;
  --shadow: 0 1px 2px rgba(0, 0, 84, .06), 0 6px 20px rgba(0, 0, 84, .07);
  --font: "Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif;
  --t: 180ms;
}
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font: 16px/1.55 var(--font);
}
.lv { max-width: 880px; margin: 0 auto; padding: 22px 18px 28px; }
.lv-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

/* ---------- Draft banner ---------- */
.lv-draft {
  display: flex; gap: 10px; align-items: flex-start;
  background: var(--draft); color: var(--ink);
  border-radius: var(--radius-s); padding: 10px 14px; margin: 0 0 18px;
  font-size: 14px;
}
.lv-draft strong { white-space: nowrap; }

/* ---------- Heading ---------- */
.lv-head { margin: 0 0 20px; }
.lv-kicker {
  display: inline-flex; align-items: center; gap: 7px;
  margin: 0 0 10px; padding: 4px 10px 4px 8px;
  border-radius: 999px; background: var(--wash);
  color: var(--ok); font-size: 12.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
}
.lv-icon { flex: none; }
.lv h1 { font-size: clamp(22px, 3.4vw, 30px); line-height: 1.18; margin: 0 0 10px; letter-spacing: -.01em; }
.lv-lede { font-size: 17.5px; margin: 0 0 12px; max-width: 66ch; color: var(--ink); }
.lv-goal { margin: 0; font-size: 14.5px; color: var(--ink-soft); max-width: 70ch; }
.lv-goal strong { color: var(--ink); }
.lv-head::after { content: ""; display: block; width: 56px; height: 4px; background: var(--accent); border-radius: 2px; margin-top: 16px; }

/* ---------- Surfaces ---------- */
.lv-card {
  background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius);
  box-shadow: var(--shadow); padding: 20px; margin: 0 0 16px;
}
.lv-card.is-quiet { box-shadow: none; background: var(--wash); border-color: transparent; }
.lv-prompt { font-size: 18px; font-weight: 700; margin: 0 0 14px; line-height: 1.35; }
.lv-hint { font-size: 14px; color: var(--ink-soft); margin: -6px 0 14px; }
.lv h2 { font-size: 18px; margin: 0 0 10px; }
.lv h3 { font-size: 16px; margin: 0 0 6px; }
.lv p { margin: 0 0 10px; }
.lv ul, .lv ol { margin: 0 0 10px; padding-left: 22px; }

/* ---------- Buttons ---------- */
.lv-actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0 0; align-items: center; }
.lv-btn {
  appearance: none; font: inherit; font-weight: 700; font-size: 15px;
  min-height: 44px; padding: 10px 18px; border-radius: 10px; cursor: pointer;
  border: 2px solid var(--ink); background: var(--ink); color: var(--paper);
  transition: transform var(--t) ease, background var(--t) ease, opacity var(--t) ease;
}
.lv-btn:hover { background: #14146a; }
.lv-btn:active { transform: translateY(1px); }
.lv-btn.is-secondary { background: var(--paper); color: var(--ink); }
.lv-btn.is-secondary:hover { background: var(--wash); }
.lv-btn.is-ghost { background: transparent; border-color: transparent; color: var(--ink); text-decoration: underline; text-underline-offset: 3px; padding-left: 6px; padding-right: 6px; }
.lv-btn[disabled] { opacity: .45; cursor: not-allowed; }
.lv-btn .lv-key { display: none; }

/* Focus is never removed from controls, only made more visible. Headings that
   the page moves focus to, so a screen reader lands on new content, are not
   controls and do not need a ring. */
:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; border-radius: 6px; }
[tabindex="-1"]:focus { outline: none; }

/* ---------- Choice controls (real radio inputs, styled as cards) ---------- */
.lv-options { display: grid; gap: 10px; margin: 0; padding: 0; border: 0; }
.lv-options legend { padding: 0; }
.lv-option {
  position: relative; display: flex; align-items: flex-start; gap: 12px;
  border: 2px solid var(--line); border-radius: 12px; padding: 12px 14px; cursor: pointer;
  background: var(--paper); transition: border-color var(--t) ease, background var(--t) ease;
}
.lv-option:hover { border-color: var(--line-strong); }
.lv-option input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.lv-option .lv-dot {
  flex: none; width: 20px; height: 20px; margin-top: 2px; border-radius: 50%;
  border: 2px solid var(--line-strong); background: var(--paper);
  transition: border-color var(--t) ease, box-shadow var(--t) ease;
}
.lv-option input:checked + .lv-dot { border-color: var(--ink); box-shadow: inset 0 0 0 4px var(--paper), inset 0 0 0 10px var(--ink); }
.lv-option:has(input:checked) { border-color: var(--ink); background: var(--wash); }
.lv-option:focus-within { outline: 3px solid var(--focus); outline-offset: 2px; }
.lv-option.is-ok { border-color: var(--ok); background: var(--ok-wash); }
.lv-option.is-miss { border-color: var(--miss); background: var(--miss-wash); }

/* Segmented choice, used where each item has the same small set of answers. */
.lv-seg { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; padding: 0; border: 0; }
.lv-seg label {
  position: relative; display: inline-flex; align-items: center; min-height: 40px;
  padding: 7px 12px; border: 2px solid var(--line); border-radius: 999px; cursor: pointer;
  font-size: 14px; font-weight: 700; background: var(--paper);
  transition: border-color var(--t) ease, background var(--t) ease, color var(--t) ease;
}
.lv-seg label:hover { border-color: var(--line-strong); }
.lv-seg input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.lv-seg label:has(input:checked) { background: var(--ink); border-color: var(--ink); color: var(--paper); }
.lv-seg label:focus-within { outline: 3px solid var(--focus); outline-offset: 2px; }

/* ---------- Reorderable rows (move up and down with buttons, never drag) ---------- */
.lv .lv-rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.lv-row {
  display: flex; align-items: center; gap: 12px;
  border: 2px solid var(--line); border-radius: 12px; padding: 8px 8px 8px 12px; background: var(--paper);
  transition: border-color var(--t) ease, background var(--t) ease;
}
.lv-row-n {
  flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
  background: var(--ink); color: var(--paper); font-weight: 800; font-size: 14px;
}
.lv-row-label { flex: 1; font-weight: 700; }
.lv-row-why { display: block; font-weight: 400; font-size: 14.5px; color: var(--ink); margin-top: 3px; }
.lv-row-move { display: flex; gap: 6px; flex: none; }
.lv-move {
  appearance: none; font: inherit; font-size: 18px; line-height: 1; width: 44px; height: 44px; border-radius: 10px;
  border: 2px solid var(--line-strong); background: var(--paper); color: var(--ink); cursor: pointer;
}
.lv-move:hover:not([disabled]) { border-color: var(--ink); background: var(--wash); }
.lv-move[disabled] { opacity: .3; cursor: default; }
.lv-row.is-ok { border-color: var(--ok); background: var(--ok-wash); }
.lv-row.is-ok .lv-row-n { background: var(--ok); }
.lv-row.is-miss { border-color: var(--miss); background: var(--miss-wash); }
.lv-row.is-miss .lv-row-n { background: var(--miss); }

/* ---------- Big number readout, for sliders ---------- */
.lv-readout { display: flex; align-items: baseline; gap: 8px; margin: 4px 0 8px; }
.lv-readout output { font-size: 34px; font-weight: 800; letter-spacing: -.02em; }
.lv-range { width: 100%; accent-color: var(--ink); min-height: 32px; }
.lv-number { font: inherit; font-size: 16px; width: 9em; min-height: 44px; padding: 8px 10px; border: 2px solid var(--line-strong); border-radius: 10px; color: var(--ink); }

/* ---------- Feedback ---------- */
.lv-feedback {
  display: flex; gap: 10px; align-items: flex-start;
  border-radius: 12px; padding: 12px 14px; margin: 12px 0 0;
  border-left: 5px solid var(--line-strong); background: var(--wash);
}
.lv-feedback .lv-mark { flex: none; font-weight: 800; white-space: nowrap; }
.lv-feedback p:last-child { margin-bottom: 0; }
.lv-feedback.is-ok { border-left-color: var(--ok); background: var(--ok-wash); }
.lv-feedback.is-ok .lv-mark { color: var(--ok); }
.lv-feedback.is-miss { border-left-color: var(--miss); background: var(--miss-wash); }
.lv-feedback.is-miss .lv-mark { color: var(--miss); }
.lv-feedback.is-part { border-left-color: var(--part); background: var(--part-wash); }
.lv-feedback.is-part .lv-mark { color: var(--part); }
.lv-tag { display: inline-block; font-size: 12px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; background: var(--wash); }
.lv-tag.is-ok { background: var(--ok-wash); color: var(--ok); }
.lv-tag.is-miss { background: var(--miss-wash); color: var(--miss); }
.lv-tag.is-part { background: var(--part-wash); color: var(--part); }

/* ---------- Progress ---------- */
.lv-progress { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--ink-soft); margin: 0 0 14px; }
.lv-bar { flex: 1; height: 8px; background: var(--wash); border-radius: 999px; overflow: hidden; }
.lv-bar > span { display: block; height: 100%; width: 0; background: var(--ok); border-radius: 999px; transition: width 320ms ease; }

/* ---------- Figures ---------- */
.lv-figure { margin: 0; }
.lv-figure svg { display: block; width: 100%; height: auto; }
.lv-figure [data-item] { transition: opacity 260ms ease; }
.lv-figure [data-item][visibility="hidden"] { opacity: 0; }
.lv-figure figcaption { font-size: 14px; color: var(--ink-soft); margin-top: 8px; }

/* ---------- Reveal ---------- */
.lv-reveal { animation: lv-rise 260ms ease both; }
@keyframes lv-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
[hidden] { display: none !important; }

/* ---------- Footer ---------- */
.lv-foot { margin-top: 26px; border-top: 1px solid var(--line); padding-top: 14px; font-size: 14.5px; }
.lv-foot details { margin: 0 0 8px; }
.lv-foot summary { cursor: pointer; font-weight: 700; padding: 6px 0; }
.lv-foot summary:hover { text-decoration: underline; }
.lv-foot .lv-text { white-space: pre-wrap; font: inherit; margin: 6px 0 10px; color: var(--ink); background: var(--wash); padding: 12px 14px; border-radius: 10px; }
.lv-foot ul { margin: 6px 0 10px; }
.lv-foot-row { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; margin-top: 8px; color: var(--ink-soft); }
.lv-foot a { color: var(--ink); font-weight: 700; text-underline-offset: 3px; }
.lv-keys { display: none; }

/* ---------- Presenter view ---------- */
html.lv-present body { font-size: 21px; background: var(--paper); }
html.lv-present .lv { max-width: 1240px; padding: 26px 40px 70px; }
html.lv-present .lv h1 { font-size: clamp(30px, 3.6vw, 46px); }
html.lv-present .lv-lede { font-size: 24px; }
html.lv-present .lv-goal,
html.lv-present .lv-draft,
html.lv-present .lv-foot details { display: none; }
html.lv-present .lv-card { box-shadow: none; }
html.lv-present .lv-prompt { font-size: 28px; }
html.lv-present .lv h2 { font-size: 28px; }
html.lv-present .lv h3 { font-size: 22px; }
html.lv-present .lv-btn { font-size: 19px; min-height: 52px; padding: 12px 22px; }
html.lv-present .lv-btn .lv-key { display: inline; opacity: .6; font-weight: 400; margin-left: 6px; }
html.lv-present .lv-keys {
  display: block; position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%);
  background: var(--ink); color: var(--paper); font-size: 14px; padding: 6px 14px; border-radius: 999px; opacity: .8;
}
html.lv-present .lv-foot { border: 0; }

/* ---------- Small screens ---------- */
@media (max-width: 520px) {
  .lv { padding: 16px 14px 24px; }
  .lv-card { padding: 16px; }
  .lv-actions .lv-btn:not(.is-ghost) { flex: 1 1 auto; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}

@media print {
  .lv-btn, .lv-actions, #lv-present-toggle { display: none !important; }
  .lv-card { box-shadow: none; break-inside: avoid; }
  [hidden] { display: block !important; }
}
`;

/**
 * Assemble a complete, standalone activity page.
 *
 * @param {object} o
 * @param {object} o.lo       the validated learning object
 * @param {object} o.meta     the pattern's meta (label, keys)
 * @param {object} o.a11y     accessibility artefacts, for the text version
 * @param {string} o.body     the activity markup
 * @param {string} o.script   the pattern's behaviour
 * @param {string} [o.css]    pattern-specific CSS
 * @param {boolean} [o.needsExpr] include the formula engine
 * @param {object} o.draft    { isDraft, reasons: [] }
 */
export function page({ lo, meta, a11y, body, script, css = '', needsExpr = false, draft }) {
  const goal = learnerGoal(lo.intent, lo.goal);
  const sources = (lo.sources || []);
  const keys = meta.keys || '→ next · ← back · Esc leave presenter view';

  const draftBanner = draft.isDraft
    ? `<div class="lv-draft" role="note"><strong>Draft for review.</strong><span>${esc(draft.reasons.join(' '))} Not for students until a subject expert has checked it.</span></div>`
    : '';

  const sourceList = sources.length
    ? `<details><summary>Sources</summary><ul>${sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.label)}</a>` : esc(s.label)}${s.note ? `. ${esc(s.note)}` : ''}${s.status === 'to-check' ? ' <span class="lv-tag is-part">To check</span>' : ''}</li>`).join('')}</ul></details>`
    : '';

  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="learnviz">
<title>${esc(lo.title)}</title>
<style>${CSS}${css}</style>
</head>
<body>
<main class="lv">
${draftBanner}
<header class="lv-head">
  <p class="lv-kicker">${icon(lo.pattern)}<span>${esc(meta.label)}</span></p>
  <h1>${esc(lo.title)}</h1>
  ${lo.lede ? `<p class="lv-lede">${esc(lo.lede)}</p>` : ''}
  <p class="lv-goal"><strong>${esc(goal.lead)}</strong> ${esc(goal.rest)}</p>
</header>
<section class="lv-activity" aria-label="Activity">
${body}
</section>
<footer class="lv-foot">
  <details><summary>Text version of this activity</summary><pre class="lv-text">${esc(a11y.textEquivalent)}</pre></details>
  ${sourceList}
  <div class="lv-foot-row"><a id="lv-present-toggle" href="#present">Presenter view</a></div>
  <div class="lv-keys" aria-hidden="true">${esc(keys)}</div>
</footer>
<div id="lv-live" class="lv-sr" role="status" aria-live="polite"></div>
</main>
<script>${runtimeSource({ passMark: lo.passMark })}</script>
${needsExpr ? `<script>${exprSource()}</script>` : ''}
<script>${script}</script>
</body>
</html>
`;
}

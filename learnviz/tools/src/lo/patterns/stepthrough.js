/**
 * Step through. A figure that builds one piece at a time, with narration.
 *
 * Why it works: a complex diagram shown all at once asks the learner to find
 * the starting point, decide the reading order and hold everything in mind at
 * the same time. Showing it one part at a time, with a sentence about each
 * part, removes all three jobs (the segmenting principle). The layout never
 * moves as it builds, so nothing already read has to be found again.
 *
 * It is also the teacher's presenter mode. The same file, opened with
 * #present, is a diagram that builds with the arrow keys while the teacher
 * talks, which is the single most useful thing a projector can show.
 */

import { esc } from '../../svg.js';
import { accordion, nativeActivity, spacer } from '../native.js';
import { diagramBlock } from '../../emble.js';
import { unitsOf } from '../../renderers/index.js';

export const meta = {
  label: 'Step by step',
  verb: 'advances through a diagram that builds one piece at a time',
  why: 'Showing one part at a time, with a sentence about each, removes the work of finding where to start and what to read next.',
  keys: '→ next step · ← back · Esc leave presenter view',
  scored: false,
  embleIcon: 'icon-arrow-end',
};

export function validate(s, h) {
  const figure = h.figure(s.figure, 'figure');
  const units = unitsOf(figure);
  h.str(s.intro, 'intro', { required: false, max: 500 });
  const steps = h.arr(s.steps, 'steps', { min: 1, max: 30 });
  steps.forEach((st, i) => {
    h.str(st.say, `steps[${i}].say`, { max: 600 });
    if (st.show !== undefined && (!Number.isInteger(st.show) || st.show < 1 || st.show > units.length)) {
      h.fail(`steps[${i}].show`, `must be a whole number from 1 to ${units.length}, the number of parts visible after this step`);
    }
  });

  const explicit = steps.some((st) => st.show !== undefined);
  let shows;
  if (explicit) {
    if (!steps.every((st) => st.show !== undefined)) {
      h.fail('steps', 'give every step a "show" count, or none of them. Mixing the two is ambiguous.');
    }
    shows = steps.map((st) => st.show);
  } else {
    if (steps.length !== units.length) {
      h.fail('steps', `has ${steps.length} steps but the figure has ${units.length} parts (${units.join(', ')}). Write one step per part, or give each step a "show" count saying how many parts are visible after it.`);
    }
    shows = steps.map((_, i) => i + 1);
  }
  for (let i = 1; i < shows.length; i += 1) {
    if (shows[i] < shows[i - 1]) h.fail(`steps[${i}].show`, 'cannot be lower than the step before it. A step-through only ever adds.');
  }
  if (shows[shows.length - 1] !== units.length) {
    h.fail('steps', `the last step must show all ${units.length} parts, so the learner ends with the whole picture`);
  }

  return { figure, steps: steps.map((st, i) => ({ say: st.say, show: shows[i] })) };
}

export function describe(s) {
  const units = unitsOf(s.figure);
  return {
    shape: `A step-by-step walkthrough of a diagram, in ${s.steps.length} steps.`,
    marks: 'The diagram starts with its outline and gains one part at each step. A sentence under the diagram explains each new part. Back and next buttons move between steps.',
    structure: `The parts appear in this order: ${units.join(', ')}.`,
    items: [
      ...(s.intro ? [{ key: 'Before the first step', value: s.intro }] : []),
      ...s.steps.map((st, i) => ({ key: `Step ${i + 1}`, value: st.say })),
    ],
    visibleText: [s.intro, ...s.steps.map((st) => st.say)].filter(Boolean),
  };
}

export function figure(s) {
  return s.figure;
}

/* eslint-disable no-var, prefer-arrow-callback, func-names */
function client(D) {
  var LV = window.LV;
  var $ = function (id) { return document.getElementById(id); };
  var fig = $('lv-s-fig');
  var groups = fig.querySelectorAll('[data-item]');
  var say = $('lv-s-say');
  var count = $('lv-s-count');
  var bar = $('lv-s-bar');
  var prev = $('lv-s-prev');
  var next = $('lv-s-next');
  var dots = $('lv-s-dots');
  var total = D.steps.length;
  var first = D.intro ? -1 : 0;
  var at = first;
  var done = false;

  dots.innerHTML = D.steps.map(function (_, i) {
    return '<button type="button" class="lv-dotbtn" data-i="' + i + '" aria-label="Go to step ' + (i + 1) + '"></button>';
  }).join('');

  function show(i, focusSay) {
    at = Math.max(first, Math.min(total - 1, i));
    var visible = at < 0 ? 0 : D.steps[at].show;
    for (var g = 0; g < groups.length; g += 1) {
      var idx = Number(groups[g].getAttribute('data-item'));
      groups[g].setAttribute('visibility', idx < visible ? 'visible' : 'hidden');
      groups[g].classList.toggle('lv-new', at >= 0 && idx < visible && (at === 0 ? true : idx >= D.steps[at - 1].show));
    }
    var text = at < 0 ? D.intro : D.steps[at].say;
    say.textContent = text;
    count.textContent = at < 0 ? 'Before we start' : 'Step ' + (at + 1) + ' of ' + total;
    bar.style.width = (at < 0 ? 0 : ((at + 1) / total) * 100) + '%';
    prev.disabled = at <= first;
    next.textContent = at === total - 1 ? 'Replay' : (at < 0 ? 'Start' : 'Next');
    var btns = dots.querySelectorAll('.lv-dotbtn');
    for (var d = 0; d < btns.length; d += 1) {
      btns[d].classList.toggle('is-on', d <= at);
      btns[d].setAttribute('aria-current', d === at ? 'step' : 'false');
    }
    LV.announce(count.textContent + '. ' + text);
    if (at === total - 1 && !done) {
      done = true;
      LV.report({ complete: true, score: null });
    }
    if (focusSay) say.focus();
    LV.reportHeight();
  }

  next.addEventListener('click', function () { show(at === total - 1 ? first : at + 1); });
  prev.addEventListener('click', function () { show(at - 1); });
  dots.addEventListener('click', function (e) {
    var b = e.target.closest('.lv-dotbtn');
    if (b) show(Number(b.getAttribute('data-i')));
  });
  $('lv-s-all').addEventListener('click', function () { show(total - 1); });
  LV.presenter.on({
    next: function () { if (at < total - 1) show(at + 1); },
    prev: function () { show(at - 1); },
  });
  show(first);
}
/* eslint-enable */

const CSS = `
.lv-s-stage { padding: 16px 16px 8px; }
.lv-s-say { font-size: 18px; line-height: 1.5; min-height: 3.2em; margin: 14px 0 0; padding: 14px 16px; background: var(--wash); border-radius: 12px; border-left: 5px solid var(--accent); }
.lv-s-say:focus { outline: none; }
.lv-figure [data-item].lv-new { animation: lv-glow 900ms ease; }
@keyframes lv-glow { 0% { opacity: .2; } 100% { opacity: 1; } }
.lv-dots { display: flex; gap: 2px; flex-wrap: wrap; margin: 0 0 0 auto; }
/* A 24px target (WCAG 2.2 target size) around a 12px visible dot. */
.lv-dotbtn { width: 24px; height: 24px; padding: 0; border: 0; background: transparent; cursor: pointer; display: grid; place-items: center; border-radius: 50%; }
.lv-dotbtn::before { content: ""; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--line-strong); background: var(--paper); }
.lv-dotbtn.is-on::before { background: var(--ink); border-color: var(--ink); }
html.lv-present .lv-s-say { font-size: 28px; }
html.lv-present .lv-dotbtn::before { width: 16px; height: 16px; }
`;

export function interactive(s, ctx) {
  const body = `
<div class="lv-card lv-s-stage">
  <div class="lv-progress"><span id="lv-s-count">Step 1</span><div class="lv-bar"><span id="lv-s-bar"></span></div></div>
  ${ctx.inlineFigure(s.figure, { id: 'lv-s-fig' })}
  <p class="lv-s-say" id="lv-s-say" tabindex="-1"></p>
  <div class="lv-actions">
    <button type="button" class="lv-btn is-secondary" id="lv-s-prev">Back<span class="lv-key">←</span></button>
    <button type="button" class="lv-btn" id="lv-s-next">Next<span class="lv-key">→</span></button>
    <button type="button" class="lv-btn is-ghost" id="lv-s-all">Show it all</button>
    <div class="lv-dots" id="lv-s-dots" role="group" aria-label="Jump to a step"></div>
  </div>
</div>`;
  const data = { steps: s.steps, intro: s.intro || '' };
  return { body, css: CSS, script: `(${client.toString()})(${ctx.safeJson(data)});` };
}

export function native(s, ctx) {
  const instructions = `<p><strong>Look at the whole diagram first, then work through it step by step.</strong> Open the walkthrough and read each step while looking at the matching part of the diagram.</p>`;
  const walk = `${s.intro ? `<p>${esc(s.intro)}</p>` : ''}<ol>${s.steps.map((st) => `<li>${esc(st.say)}</li>`).join('')}</ol>`;
  const content = diagramBlock({ a11y: ctx.figureA11y }) + '\n' + accordion('Walk through it step by step', walk) + `\n${spacer}`;
  return nativeActivity({ title: `Step by step: ${s.title}`, iconClass: meta.embleIcon, instructions: `${instructions}`, content });
}

export function teach(s) {
  return {
    placement: 'during',
    before: 'Not usually a before-class activity. If you do set it, ask learners to note one step they would like explained further.',
    during: 'This is built for the front of the room. Open it in presenter view and press the right arrow for each step. Say each step in your own words rather than reading it, and pause on each new part to ask what the room notices before moving on.',
    after: 'Point learners back to it for revision. Working through it again at their own pace, with the narration, is the segmented version of what you showed in class.',
    presenter: ['Right arrow or space: next step. Left arrow: back.', 'The progress dots show the room how far through you are.', 'Each new part glows briefly as it appears.'],
    script: s.steps.map((st, i) => `Step ${i + 1}: ${st.say}`),
  };
}

export function answerKey() {
  return [];
}


/**
 * Order. Put the steps in order, or say when each one happens, then check.
 *
 * Why it works: recalling a procedure is harder, and far more durable, than
 * recognising one. And the mistakes are informative. A learner who puts
 * "parboil the potatoes" before "lamb in the oven" has not misremembered a
 * list, they have missed a dependency, and the reason shown against that step
 * teaches the dependency.
 *
 * Two modes. `order` asks for a sequence. `timing` asks for a number against
 * each step, for procedures where things overlap and the skill is working out
 * when, not just what next. Timing mode is the original recipe tool: dinner is
 * at 105 minutes, so when does the lamb go in?
 *
 * No drag and drop. Moving an item is two buttons, which work for a keyboard,
 * a switch, a screen reader and a thumb.
 */

import { esc } from '../../svg.js';
import { accordion, nativeActivity, spacer, list } from '../native.js';
import { diagramBlock } from '../../emble.js';

export const meta = {
  label: 'Put it in order',
  verb: 'puts the steps in order, or times them, then checks against the model',
  why: 'Recalling a procedure is more durable than recognising one, and each misplaced step exposes a dependency the reason can teach.',
  keys: 'R show the model answer · Esc leave presenter view',
  scored: true,
  embleIcon: 'icon-arrow-end',
};

export function validate(s, h) {
  h.str(s.prompt, 'prompt', { max: 300 });
  const mode = s.mode ?? 'order';
  h.oneOf(mode, 'mode', ['order', 'timing'], { what: 'mode' });
  if (mode === 'timing') h.str(s.timeUnit, 'timeUnit', { max: 40 });
  h.arr(s.items, 'items', { min: 3, max: 12 }).forEach((it, i) => {
    h.str(it.label, `items[${i}].label`, { max: 120 });
    h.str(it.why, `items[${i}].why`, { max: 420 });
    if (mode === 'timing') {
      h.num(it.at, `items[${i}].at`);
      h.num(it.tolerance, `items[${i}].tolerance`, { required: false });
      h.num(it.duration, `items[${i}].duration`, { required: false });
      if (it.duration !== undefined && it.duration <= 0) h.fail(`items[${i}].duration`, 'must be greater than zero');
    }
  });
  return { mode };
}

export function describe(s) {
  if (s.mode === 'timing') {
    return {
      shape: `A timing activity: say when each of ${s.items.length} steps should happen, in ${s.timeUnit}, then check against the model.`,
      marks: 'A number box beside each step. A time axis plots your answers as hollow circles and, after checking, the model timings as filled diamonds.',
      structure: s.prompt,
      items: s.items.map((it) => ({ key: it.label, value: `${it.at} ${s.timeUnit}. ${it.why}` })),
      visibleText: [s.prompt, s.timeUnit, ...s.items.map((it) => it.label)],
    };
  }
  return {
    shape: `An ordering activity: put ${s.items.length} steps in the right order, then check.`,
    marks: 'Each step is a numbered row with buttons to move it up or down. After checking, rows in the right place are marked, and each shows why it goes where it does.',
    structure: s.prompt,
    items: s.items.map((it, i) => ({ key: `Step ${i + 1}`, value: `${it.label}. ${it.why}` })),
    visibleText: [s.prompt, ...s.items.map((it) => it.label)],
  };
}

export function figure(s) {
  // The model schedule as a gantt, but only when every step has a real
  // duration. Drawing starts as zero-width bars would be a picture of
  // nothing, so without durations the native version uses a plain list.
  if (s.mode !== 'timing' || !s.items.every((it) => it.duration)) return null;
  return {
    type: 'gantt',
    title: s.title,
    intent: s.intent,
    timeUnit: s.timeUnit,
    tasks: s.items.map((it) => ({ label: it.label, start: it.at, duration: it.duration })),
  };
}

/* ------------------------------------------------------------------ */
/* Order mode                                                          */
/* ------------------------------------------------------------------ */

/* eslint-disable no-var, prefer-arrow-callback, func-names */
function orderClient(D) {
  var LV = window.LV;
  var $ = function (id) { return document.getElementById(id); };
  var order = D.shown.slice();
  var checked = false;
  var listEl = $('lv-o-list');

  function render(focusPos, dir) {
    listEl.innerHTML = order.map(function (itemIdx, pos) {
      var label = LV.esc(D.items[itemIdx].label);
      var cls = '';
      var why = '';
      if (checked) {
        var ok = itemIdx === pos;
        cls = ok ? ' is-ok' : ' is-miss';
        why = '<span class="lv-row-why">' + (ok ? '&#10003; Right place. ' : '&#10007; Belongs at number ' + (itemIdx + 1) + '. ') + LV.esc(D.items[itemIdx].why) + '</span>';
      }
      return '<li class="lv-row' + cls + '" data-pos="' + pos + '">'
        + '<span class="lv-row-n" aria-hidden="true">' + (pos + 1) + '</span>'
        + '<span class="lv-row-label">' + label + why + '</span>'
        + '<span class="lv-row-move">'
        + '<button type="button" class="lv-move" data-dir="-1" data-pos="' + pos + '" aria-label="Move ' + label + ' up"' + (pos === 0 ? ' disabled' : '') + '>&#8593;</button>'
        + '<button type="button" class="lv-move" data-dir="1" data-pos="' + pos + '" aria-label="Move ' + label + ' down"' + (pos === order.length - 1 ? ' disabled' : '') + '>&#8595;</button>'
        + '</span></li>';
    }).join('');
    if (focusPos !== undefined) {
      var sel = '[data-pos="' + focusPos + '"] .lv-move';
      var btn = listEl.querySelector(sel + '[data-dir="' + dir + '"]:not([disabled])') || listEl.querySelector(sel + ':not([disabled])');
      if (btn) btn.focus();
    }
    LV.reportHeight();
  }

  listEl.addEventListener('click', function (e) {
    var b = e.target.closest('.lv-move');
    if (!b) return;
    var pos = Number(b.getAttribute('data-pos'));
    var to = pos + Number(b.getAttribute('data-dir'));
    if (to < 0 || to >= order.length) return;
    var t = order[pos]; order[pos] = order[to]; order[to] = t;
    // Moving something after a check clears the marks: the old marks would
    // describe an order that no longer exists.
    checked = false;
    $('lv-o-result').hidden = true;
    render(to, Number(b.getAttribute('data-dir')));
    LV.announce(D.items[order[to]].label + ' is now number ' + (to + 1) + ' of ' + order.length + '.');
  });

  function check() {
    checked = true;
    render();
    var right = order.filter(function (itemIdx, pos) { return itemIdx === pos; }).length;
    var all = right === order.length;
    var res = $('lv-o-result');
    res.className = 'lv-feedback ' + (all ? 'is-ok' : 'is-part');
    res.innerHTML = '<span class="lv-mark">' + right + ' of ' + order.length + '</span><div><p>'
      + (all ? 'Every step is in the right place.' : 'in the right place. Read why each marked step goes where it does, move them, and check again.')
      + '</p></div>';
    res.hidden = false;
    LV.report({ complete: true, score: right / order.length });
    LV.announce(right + ' of ' + order.length + ' in the right place.');
    res.focus();
  }

  function showModel() {
    order = D.items.map(function (_, i) { return i; });
    check();
  }

  $('lv-o-check').addEventListener('click', check);
  $('lv-o-model').addEventListener('click', showModel);
  $('lv-o-reset').addEventListener('click', function () {
    order = D.shown.slice(); checked = false; $('lv-o-result').hidden = true; render();
  });
  LV.presenter.on({ reveal: showModel });
  render();
}

/* ------------------------------------------------------------------ */
/* Timing mode                                                         */
/* ------------------------------------------------------------------ */

function timingClient(D) {
  var LV = window.LV;
  var $ = function (id) { return document.getElementById(id); };
  var checked = false;
  var chart = $('lv-t-chart');

  function answer(i) {
    var v = $('lv-t-in-' + i).value;
    return v === '' ? null : Number(v);
  }

  function axisMax() {
    var given = D.items.map(function (_, i) { return answer(i); }).filter(function (v) { return v !== null && isFinite(v); });
    return Math.max(D.max, given.length ? Math.max.apply(null, given) : 0) * 1.08 + 1;
  }

  function draw() {
    var W = 720, L = 170, R = 16, top = 34, rowH = 26;
    var H = top + D.items.length * rowH + 34;
    var max = axisMax();
    var x = function (v) { return L + (v / max) * (W - L - R); };
    var step = Math.pow(10, Math.floor(Math.log10(max / 5)));
    [1, 2, 2.5, 5, 10].some(function (m) { if (step * m >= max / 5) { step *= m; return true; } return false; });
    var s = '<text x="' + L + '" y="14" font-size="12" font-weight="bold" fill="#000054">' + LV.esc(D.unit) + '</text>';
    for (var v = 0; v <= max; v += step) {
      s += '<line x1="' + x(v) + '" y1="' + top + '" x2="' + x(v) + '" y2="' + (top + D.items.length * rowH) + '" stroke="#d9d9e6"/>';
      s += '<text x="' + x(v) + '" y="' + (top - 6) + '" font-size="11" fill="#000054" text-anchor="middle">' + Math.round(v * 100) / 100 + '</text>';
    }
    D.items.forEach(function (it, i) {
      var y = top + i * rowH + rowH / 2;
      var label = it.label.length > 26 ? it.label.slice(0, 25) + '…' : it.label;
      s += '<text x="8" y="' + (y + 4) + '" font-size="12" font-weight="bold" fill="#000054">' + LV.esc(label) + '</text>';
      var a = answer(i);
      if (a !== null && isFinite(a) && a >= 0) {
        s += '<circle cx="' + x(a) + '" cy="' + y + '" r="6" fill="#fff" stroke="#000054" stroke-width="2.5"/>';
      }
      if (checked) {
        var m = x(it.at);
        if (a !== null && isFinite(a)) s += '<line x1="' + x(a) + '" y1="' + y + '" x2="' + m + '" y2="' + y + '" stroke="#a4177c" stroke-width="1.5" stroke-dasharray="3 3"/>';
        s += '<polygon points="' + m + ',' + (y - 6) + ' ' + (m + 6) + ',' + y + ' ' + m + ',' + (y + 6) + ' ' + (m - 6) + ',' + y + '" fill="#00706b"/>';
      }
    });
    var ly = H - 10;
    s += '<circle cx="14" cy="' + (ly - 4) + '" r="5" fill="#fff" stroke="#000054" stroke-width="2.5"/><text x="26" y="' + ly + '" font-size="12" fill="#000054">Your answer</text>';
    if (checked) s += '<polygon points="140,' + (ly - 10) + ' 146,' + (ly - 4) + ' 140,' + (ly + 2) + ' 134,' + (ly - 4) + '" fill="#00706b"/><text x="152" y="' + ly + '" font-size="12" fill="#000054">Model timing</text>';
    chart.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    chart.innerHTML = s;
    LV.reportHeight();
  }

  function verdict(i, a) {
    var it = D.items[i];
    var cell = $('lv-t-v-' + i);
    var tol = typeof it.tolerance === 'number' ? it.tolerance : D.tolerance;
    if (a === null || !isFinite(a)) {
      cell.className = 'lv-feedback is-part';
      cell.innerHTML = '<span class="lv-mark">Not answered</span><div><p>Model: ' + it.at + ' ' + LV.esc(D.unit) + '. ' + LV.esc(it.why) + '</p></div>';
      cell.hidden = false;
      return false;
    }
    var ok = Math.abs(a - it.at) <= tol;
    cell.className = 'lv-feedback ' + (ok ? 'is-ok' : 'is-miss');
    cell.innerHTML = '<span class="lv-mark">' + (ok ? '&#10003; Close enough' : '&#10007; Not yet') + '</span><div><p>Model: ' + it.at + ' ' + LV.esc(D.unit)
      + (ok ? '' : ', you said ' + a) + '. ' + LV.esc(it.why) + '</p></div>';
    cell.hidden = false;
    return ok;
  }

  function check() {
    checked = true;
    var right = 0;
    D.items.forEach(function (_, i) { if (verdict(i, answer(i))) right += 1; });
    var res = $('lv-t-result');
    var all = right === D.items.length;
    res.className = 'lv-feedback ' + (all ? 'is-ok' : 'is-part');
    res.innerHTML = '<span class="lv-mark">' + right + ' of ' + D.items.length + '</span><div><p>' + (all ? 'Every step is timed within range.' : 'within range. Read the reason on each one you missed, adjust, and check again.') + '</p></div>';
    res.hidden = false;
    draw();
    LV.report({ complete: true, score: right / D.items.length });
    LV.announce(right + ' of ' + D.items.length + ' within range.');
    res.focus();
  }

  function model() {
    D.items.forEach(function (it, i) { $('lv-t-in-' + i).value = it.at; });
    check();
  }

  $('lv-t-form').addEventListener('input', function () { if (!checked) draw(); });
  $('lv-t-check').addEventListener('click', check);
  $('lv-t-model').addEventListener('click', model);
  $('lv-t-reset').addEventListener('click', function () {
    checked = false;
    D.items.forEach(function (_, i) { $('lv-t-in-' + i).value = ''; $('lv-t-v-' + i).hidden = true; });
    $('lv-t-result').hidden = true;
    draw();
  });
  LV.presenter.on({ reveal: model });
  draw();
}
/* eslint-enable */

const CSS = `
.lv-t-rows { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.lv-t-row { border: 2px solid var(--line); border-radius: 12px; padding: 10px 12px; }
.lv-t-row label { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; font-weight: 700; }
.lv-t-row .lv-feedback { margin-top: 8px; }
.lv-t-unit { font-weight: 400; color: var(--ink-soft); font-size: 14px; }
.lv-t-chart { display: block; width: 100%; height: auto; margin-top: 14px; border: 1px solid var(--line); border-radius: 12px; }
`;

export function interactive(s, ctx) {
  if (s.mode === 'timing') {
    const max = Math.max(...s.items.map((it) => it.at));
    const tolerance = Math.max(1, Math.round(max * 0.05));
    const rows = s.items.map((it, i) => `
      <li class="lv-t-row">
        <label for="lv-t-in-${i}"><span>${esc(it.label)}</span>
          <span><input class="lv-number" id="lv-t-in-${i}" type="number" min="0" step="any" inputmode="decimal"> <span class="lv-t-unit">${esc(s.timeUnit)}</span></span>
        </label>
        <div class="lv-feedback" id="lv-t-v-${i}" hidden></div>
      </li>`).join('');
    const body = `
<form class="lv-card" id="lv-t-form" onsubmit="return false">
  <p class="lv-prompt">${esc(s.prompt)}</p>
  <ol class="lv-t-rows">${rows}</ol>
  <div class="lv-feedback" id="lv-t-result" hidden tabindex="-1"></div>
  <div class="lv-actions">
    <button type="button" class="lv-btn" id="lv-t-check">Check my timings</button>
    <button type="button" class="lv-btn is-secondary" id="lv-t-model">Show the model</button>
    <button type="button" class="lv-btn is-ghost" id="lv-t-reset">Start again</button>
  </div>
  <svg class="lv-t-chart" id="lv-t-chart" role="img" aria-label="Your timings plotted on a time axis, with the model timings shown after you check."></svg>
</form>`;
    const data = { items: s.items, unit: s.timeUnit, max, tolerance };
    return { body, css: CSS, script: `(${timingClient.toString()})(${ctx.safeJson(data)});` };
  }

  const shown = ctx.shuffleIndices(s.items.length, `${s.title}/order`, { notIdentity: true });
  const body = `
<div class="lv-card">
  <p class="lv-prompt">${esc(s.prompt)}</p>
  <p class="lv-hint">Use the arrow buttons to move each step. Number 1 happens first.</p>
  <ol class="lv-rows" id="lv-o-list"></ol>
  <div class="lv-feedback" id="lv-o-result" hidden tabindex="-1"></div>
  <div class="lv-actions">
    <button type="button" class="lv-btn" id="lv-o-check">Check my order</button>
    <button type="button" class="lv-btn is-secondary" id="lv-o-model">Show the right order</button>
    <button type="button" class="lv-btn is-ghost" id="lv-o-reset">Start again</button>
  </div>
</div>`;
  const data = { items: s.items, shown };
  return { body, css: CSS, script: `(${orderClient.toString()})(${ctx.safeJson(data)});` };
}

export function native(s, ctx) {
  if (s.mode === 'timing') {
    const instructions = `<p><strong>${esc(s.prompt)}</strong></p>
    <p>Write down a time, in ${esc(s.timeUnit)}, for each step. Then open the box to check.</p>
    ${list(s.items.map((it) => it.label))}`;
    const inside = `<ul>${s.items.map((it) => `<li><strong>${esc(it.label)}: ${it.at} ${esc(s.timeUnit)}.</strong> ${esc(it.why)}</li>`).join('')}</ul>`
      + (ctx.figureA11y ? diagramBlock({ a11y: ctx.figureA11y }) : '');
    return nativeActivity({ title: `Timing: ${s.title}`, iconClass: meta.embleIcon, instructions, content: `${accordion('Check your timings against the model', inside)}\n${spacer}` });
  }
  const shown = ctx.shuffleIndices(s.items.length, `${s.title}/order`, { notIdentity: true }).map((i) => s.items[i].label);
  const instructions = `<p><strong>${esc(s.prompt)}</strong></p>
    <p>These steps are out of order. Write down the order you think is right, then open the box to check.</p>
    ${list(shown)}`;
  const inside = `<ol>${s.items.map((it) => `<li><strong>${esc(it.label)}.</strong> ${esc(it.why)}</li>`).join('')}</ol>`;
  return nativeActivity({ title: `Put it in order: ${s.title}`, iconClass: meta.embleIcon, instructions, content: `${accordion('Check the order', inside)}\n${spacer}` });
}

export function teach(s) {
  return {
    placement: 'after',
    before: 'Works as a before-class check of what learners already know about the procedure.',
    during: s.mode === 'timing'
      ? 'Ask pairs to agree timings before anyone checks. The disagreements between pairs are the discussion. Then, in presenter view, press R to show the model.'
      : 'Put it up in presenter view and build the order with the room, one step at a time, asking why before each move. Press R to show the model order with the reasons.',
    after: 'Set it as practice. The score goes to the gradebook through the SCORM package if you want it to.',
    presenter: ['R: show the model answer with the reasons.'],
  };
}

export function answerKey(s) {
  return s.items.map((it, i) => ({
    prompt: it.label,
    answer: s.mode === 'timing' ? `${it.at} ${s.timeUnit}` : `Position ${i + 1}`,
    why: it.why,
  }));
}

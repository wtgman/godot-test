/**
 * Predict, then check.
 *
 * The learner commits to an answer before the answer is shown: a choice, a
 * number, or an order. Then the answer arrives, with the reasoning.
 *
 * Why it works: generating an answer, even a wrong one, makes the correct one
 * far more memorable than reading it cold (the generation effect), and wanting
 * to know whether you were right is the cheapest engagement there is. It also
 * does something no other pattern does as well. It drags the misconception the
 * learner walked in with out into the open, where it can be corrected. A
 * learner who reads "grief has no fixed order" nods. A learner who has just put
 * the five stages in order, confidently, and is then told there is no order,
 * remembers.
 *
 * Predictions are never marked. Marking a guess punishes honesty, and an honest
 * wrong guess is the most useful thing this pattern can produce.
 */

import { esc } from '../../svg.js';
import { accordion, para, list, olist, nativeActivity, spacer } from '../native.js';
import { diagramBlock } from '../../emble.js';

export const meta = {
  label: 'Predict, then check',
  verb: 'commits to a guess before the answer is shown',
  why: 'Generating an answer first makes the real one stick, and surfaces the belief the learner walked in with.',
  keys: 'R reveal the answer · Esc leave presenter view',
  scored: false,
  embleIcon: 'icon-question',
};

export function validate(s, h) {
  h.str(s.question, 'question', { max: 300 });
  const r = s.response;
  if (!r || typeof r !== 'object') h.fail('response', 'is required: { "kind": "choice" | "number" | "order", ... }');
  h.oneOf(r.kind, 'response.kind', ['choice', 'number', 'order'], { what: 'response kind' });

  if (r.kind === 'choice') {
    const opts = h.arr(r.options, 'response.options', { min: 2, max: 6 });
    opts.forEach((o, i) => {
      h.str(o.label, `response.options[${i}].label`, { max: 160 });
      h.str(o.feedback, `response.options[${i}].feedback`, { required: false, max: 400 });
    });
    if (r.answer !== null && r.answer !== undefined) {
      if (!Number.isInteger(r.answer) || r.answer < 0 || r.answer >= opts.length) {
        h.fail('response.answer', `must be the index of the correct option, 0 to ${opts.length - 1}, or null when there is no single right answer`);
      }
    }
  }

  if (r.kind === 'number') {
    h.num(r.min, 'response.min');
    h.num(r.max, 'response.max');
    if (r.min >= r.max) h.fail('response', 'min must be less than max');
    h.num(r.answer, 'response.answer');
    h.num(r.step, 'response.step', { required: false });
    h.num(r.tolerance, 'response.tolerance', { required: false });
    h.num(r.decimals, 'response.decimals', { required: false });
    h.str(r.unit, 'response.unit', { required: false, max: 30 });
    h.str(r.prefix, 'response.prefix', { required: false, max: 6 });
    // The answer may sit outside the slider on purpose (the surprise is that it
    // is off the scale), so that is allowed, but the start value must not be.
  }

  if (r.kind === 'order') {
    h.arr(r.items, 'response.items', { min: 3, max: 7 }).forEach((it, i) => h.str(it, `response.items[${i}]`, { max: 120 }));
    if (typeof r.fixedOrder !== 'boolean') {
      h.fail('response.fixedOrder', 'is required. Set true when the items are listed in the correct order, or false when there is no correct order at all, which is itself a legitimate and often powerful answer.');
    }
  }

  const rv = s.reveal;
  if (!rv || typeof rv !== 'object') h.fail('reveal', 'is required: what the learner sees after committing');
  h.str(rv.heading, 'reveal.heading', { required: false, max: 140 });
  h.str(rv.explanation, 'reveal.explanation', { max: 900 });
  if (rv.points !== undefined) h.arr(rv.points, 'reveal.points', { min: 1, max: 6 }).forEach((p, i) => h.str(p, `reveal.points[${i}]`, { max: 240 }));

  return { reveal: { ...rv, figure: rv.figure ? h.figure(rv.figure, 'reveal.figure') : undefined } };
}

function answerText(s) {
  const r = s.response;
  const fmt = (v) => `${r.prefix || ''}${v}${r.unit ? ` ${r.unit}` : ''}`;
  if (r.kind === 'choice') return r.answer === null || r.answer === undefined ? 'There is no single correct answer.' : r.options[r.answer].label;
  if (r.kind === 'number') return fmt(r.answer);
  return r.fixedOrder ? r.items.join(', then ') : 'There is no correct order.';
}

export function describe(s) {
  const r = s.response;
  const items = [{ key: 'Question', value: s.question }];
  if (r.kind === 'choice') {
    r.options.forEach((o, i) => items.push({ key: `Option ${i + 1}`, value: o.feedback ? `${o.label}. ${o.feedback}` : o.label }));
  } else if (r.kind === 'number') {
    items.push({ key: 'How to answer', value: `Choose a number between ${r.min} and ${r.max}${r.unit ? ` ${r.unit}` : ''}` });
  } else {
    items.push({ key: 'Items to put in order', value: r.items.join(', ') });
  }
  items.push({ key: s.reveal.heading || 'The answer', value: answerText(s) });
  items.push({ key: 'Why', value: s.reveal.explanation });
  (s.reveal.points || []).forEach((p, i) => items.push({ key: `Point ${i + 1}`, value: p }));

  return {
    shape: `A prediction activity. The learner answers a question before the answer is shown, then sees the answer and the reasoning.`,
    marks: r.kind === 'order'
      ? 'Items are listed with buttons to move each one up or down. After locking in, the answer is shown beneath.'
      : r.kind === 'number'
        ? 'A slider and a number box for the estimate. After locking in, the real figure is shown beside the estimate.'
        : 'A set of options to choose from. After locking in, the right answer is marked and each option explained.',
    structure: 'Question first, then the learner\'s answer, then the reveal.',
    items,
    visibleText: [s.question, ...(r.options || []).map((o) => o.label), ...(r.items || []), s.reveal.heading || '', s.reveal.explanation].filter(Boolean),
  };
}

export function figure(s) {
  return s.reveal.figure || null;
}

/* ------------------------------------------------------------------ */
/* Interactive                                                         */
/* ------------------------------------------------------------------ */

/* eslint-disable no-var, prefer-arrow-callback, func-names */
function client(D) {
  var LV = window.LV;
  var $ = function (id) { return document.getElementById(id); };
  var locked = false;
  var order = D.kind === 'order' ? D.shown.slice() : null;
  var hint = $('lv-p-hint');

  function fmtNum(v) {
    return (D.prefix || '') + LV.fmt(v, D.decimals) + (D.unit ? ' ' + D.unit : '');
  }

  /* ----- order ----- */
  function renderOrder(focusPos, dir) {
    var list = $('lv-p-order');
    list.innerHTML = order.map(function (itemIdx, pos) {
      var label = LV.esc(D.items[itemIdx]);
      return '<li class="lv-row" data-pos="' + pos + '">'
        + '<span class="lv-row-n" aria-hidden="true">' + (pos + 1) + '</span>'
        + '<span class="lv-row-label">' + label + '</span>'
        + '<span class="lv-row-move">'
        + '<button type="button" class="lv-move" data-dir="-1" data-pos="' + pos + '" aria-label="Move ' + label + ' up"' + (pos === 0 || locked ? ' disabled' : '') + '>&#8593;</button>'
        + '<button type="button" class="lv-move" data-dir="1" data-pos="' + pos + '" aria-label="Move ' + label + ' down"' + (pos === order.length - 1 || locked ? ' disabled' : '') + '>&#8595;</button>'
        + '</span></li>';
    }).join('');
    if (focusPos !== undefined) {
      var sel = '[data-pos="' + focusPos + '"] .lv-move';
      var btn = list.querySelector(sel + '[data-dir="' + dir + '"]:not([disabled])') || list.querySelector(sel + ':not([disabled])');
      if (btn) btn.focus();
    }
  }
  if (order) {
    renderOrder();
    $('lv-p-order').addEventListener('click', function (e) {
      var b = e.target.closest('.lv-move');
      if (!b || locked) return;
      var pos = Number(b.getAttribute('data-pos'));
      var dir = Number(b.getAttribute('data-dir'));
      var to = pos + dir;
      if (to < 0 || to >= order.length) return;
      var t = order[pos]; order[pos] = order[to]; order[to] = t;
      renderOrder(to, dir);
      LV.announce(D.items[order[to]] + ' is now number ' + (to + 1) + ' of ' + order.length + '.');
    });
  }

  /* ----- number ----- */
  if (D.kind === 'number') {
    var range = $('lv-p-range');
    var box = $('lv-p-box');
    var out = $('lv-p-out');
    var sync = function (v) { out.textContent = fmtNum(Number(v)); };
    range.addEventListener('input', function () { box.value = range.value; sync(range.value); });
    box.addEventListener('input', function () { if (box.value !== '') { range.value = box.value; sync(box.value); } });
    sync(range.value);
  }

  function read() {
    if (D.kind === 'choice') {
      var c = document.querySelector('input[name="lv-p-choice"]:checked');
      return c ? Number(c.value) : null;
    }
    if (D.kind === 'number') {
      var v = Number($('lv-p-box').value);
      return isFinite(v) ? v : null;
    }
    return order.slice();
  }

  function mineHtml(ans, skipped, room) {
    if (room) return '';
    if (skipped) return '<p>You went straight to the answer. Next time, try committing to a guess first. It is the guess that makes the answer stick.</p>';
    if (D.kind === 'choice') {
      var opt = D.options[ans];
      var right = D.answer === null ? null : ans === D.answer;
      var mark = right === null ? '' : right ? '<span class="lv-tag is-ok">&#10003; Right</span> ' : '<span class="lv-tag is-miss">&#10007; Not this time</span> ';
      return '<p>' + mark + 'You chose <strong>' + LV.esc(opt.label) + '</strong>.</p>'
        + (opt.feedback ? '<p>' + LV.esc(opt.feedback) + '</p>' : '')
        + (right === false ? '<p>The answer is <strong>' + LV.esc(D.options[D.answer].label) + '</strong>.</p>' : '');
    }
    if (D.kind === 'number') {
      var gap = ans - D.answerValue;
      var tol = typeof D.tolerance === 'number' ? D.tolerance : Math.abs(D.answerValue) * 0.1;
      var close = Math.abs(gap) <= tol;
      var pct = D.answerValue !== 0 ? Math.round(Math.abs(gap) / Math.abs(D.answerValue) * 100) : null;
      var how = close ? 'Close. You were within range.'
        : 'You were ' + (pct !== null ? pct + ' per cent ' : '') + (gap < 0 ? 'under' : 'over') + '.';
      return '<p><span class="lv-tag ' + (close ? 'is-ok' : 'is-part') + '">' + (close ? '&#10003; Close' : '&#8776; ' + (gap < 0 ? 'Under' : 'Over')) + '</span> '
        + 'You guessed <strong>' + fmtNum(ans) + '</strong>. The answer is <strong>' + fmtNum(D.answerValue) + '</strong>. ' + how + '</p>';
    }
    // order
    var yours = ans.map(function (i) { return D.items[i]; });
    if (!D.fixedOrder) {
      return '<p>Your order: <strong>' + yours.map(LV.esc).join(', then ') + '</strong>.</p>';
    }
    var rightCount = ans.filter(function (itemIdx, pos) { return itemIdx === pos; }).length;
    return '<p><span class="lv-tag ' + (rightCount === ans.length ? 'is-ok' : 'is-part') + '">' + rightCount + ' of ' + ans.length + ' in place</span> '
      + 'Here is your order against the answer.</p>'
      + '<ol class="lv-rows">' + ans.map(function (itemIdx, pos) {
        var ok = itemIdx === pos;
        return '<li class="lv-row ' + (ok ? 'is-ok' : 'is-miss') + '"><span class="lv-row-n" aria-hidden="true">' + (pos + 1) + '</span>'
          + '<span class="lv-row-label">' + LV.esc(D.items[itemIdx])
          + '<span class="lv-row-why">' + (ok ? '&#10003; In the right place' : '&#10007; Should be number ' + (itemIdx + 1)) + '</span></span></li>';
      }).join('') + '</ol>';
  }

  function setLocked(on) {
    locked = on;
    var inputs = document.querySelectorAll('#lv-p-form input, #lv-p-form button.lv-move');
    for (var i = 0; i < inputs.length; i += 1) inputs[i].disabled = on;
    $('lv-p-lock').disabled = on;
    $('lv-p-skip').hidden = on;
    if (order) renderOrder();
  }

  function markOptions(chosen) {
    if (D.kind !== 'choice' || D.answer === null) return;
    var labels = document.querySelectorAll('.lv-option');
    for (var i = 0; i < labels.length; i += 1) {
      if (i === D.answer) labels[i].classList.add('is-ok');
      else if (i === chosen) labels[i].classList.add('is-miss');
    }
  }

  function lock(skipped, room) {
    if (locked) return;
    var ans = skipped ? null : read();
    if (!skipped && ans === null) {
      hint.hidden = false;
      LV.announce(hint.textContent);
      return;
    }
    hint.hidden = true;
    setLocked(true);
    markOptions(ans);
    $('lv-p-mine').innerHTML = mineHtml(ans, skipped, room);
    var reveal = $('lv-p-reveal');
    reveal.hidden = false;
    reveal.classList.remove('lv-reveal');
    void reveal.offsetWidth;
    reveal.classList.add('lv-reveal');
    var h = $('lv-p-reveal-h');
    if (h) h.focus();
    LV.report({ complete: true, score: null });
    LV.announce('Answer shown. ' + D.heading);
    LV.reportHeight();
  }

  function reset() {
    setLocked(false);
    if (order) { order = D.shown.slice(); renderOrder(); }
    var checked = document.querySelector('input[name="lv-p-choice"]:checked');
    if (checked) checked.checked = false;
    var labels = document.querySelectorAll('.lv-option');
    for (var i = 0; i < labels.length; i += 1) labels[i].classList.remove('is-ok', 'is-miss');
    if (D.kind === 'number') { $('lv-p-range').value = D.start; $('lv-p-box').value = D.start; $('lv-p-out').textContent = fmtNum(D.start); }
    $('lv-p-reveal').hidden = true;
    $('lv-p-lock').focus();
    LV.reportHeight();
  }

  $('lv-p-lock').addEventListener('click', function () { lock(false); });
  $('lv-p-skip').addEventListener('click', function () { lock(true); });
  $('lv-p-again').addEventListener('click', reset);
  LV.presenter.on({ reveal: function () { lock(true, true); } });
}
/* eslint-enable */

export function interactive(s, ctx) {
  const r = s.response;
  let control = '';
  const data = {
    kind: r.kind,
    heading: s.reveal.heading || 'The answer',
  };

  if (r.kind === 'choice') {
    control = `<fieldset class="lv-options"><legend class="lv-sr">${esc(s.question)}</legend>${r.options.map((o, i) => `
      <label class="lv-option"><input type="radio" name="lv-p-choice" value="${i}"><span class="lv-dot" aria-hidden="true"></span><span>${esc(o.label)}</span></label>`).join('')}
    </fieldset>`;
    Object.assign(data, { options: r.options, answer: r.answer ?? null });
  }

  if (r.kind === 'number') {
    const step = r.step ?? niceStep(r.max - r.min);
    const start = r.start ?? roundTo((r.min + r.max) / 2, step);
    control = `
      <div class="lv-readout"><output id="lv-p-out" for="lv-p-range lv-p-box" aria-live="off"></output></div>
      <input class="lv-range" id="lv-p-range" type="range" min="${r.min}" max="${r.max}" step="${step}" value="${start}" aria-label="Your estimate">
      <p><label>Or type it: <input class="lv-number" id="lv-p-box" type="number" inputmode="decimal" min="${r.min}" max="${r.max}" step="any" value="${start}"></label>${r.unit ? ` ${esc(r.unit)}` : ''}</p>`;
    Object.assign(data, {
      answerValue: r.answer, tolerance: r.tolerance, unit: r.unit || '', prefix: r.prefix || '',
      decimals: r.decimals, start,
    });
  }

  if (r.kind === 'order') {
    const shown = ctx.shuffleIndices(r.items.length, `${s.title}/predict`, { notIdentity: r.fixedOrder });
    control = `<p class="lv-hint">Use the arrow buttons to move each one. Number 1 is first.</p><ol class="lv-rows" id="lv-p-order"></ol>`;
    Object.assign(data, { items: r.items, shown, fixedOrder: r.fixedOrder });
  }

  const fig = s.reveal.figure ? ctx.inlineFigure(s.reveal.figure) : '';
  const answerBlock = r.kind === 'order' && !r.fixedOrder
    ? '' // The heading and explanation carry it: there is no answer to show.
    : r.kind === 'order'
      ? `<p><strong>The order:</strong></p>${`<ol>${r.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ol>`}`
      : '';

  const body = `
<form class="lv-card" id="lv-p-form" onsubmit="return false">
  <p class="lv-prompt" id="lv-p-q">${esc(s.question)}</p>
  ${control}
  <p class="lv-hint" id="lv-p-hint" hidden role="alert">Make your prediction first. The point is to commit before you see the answer.</p>
  <div class="lv-actions">
    <button type="button" class="lv-btn" id="lv-p-lock">Lock in my answer</button>
    <button type="button" class="lv-btn is-ghost" id="lv-p-skip">Skip and show me</button>
  </div>
</form>
<section class="lv-card" id="lv-p-reveal" hidden aria-labelledby="lv-p-reveal-h">
  <h2 id="lv-p-reveal-h" tabindex="-1">${esc(data.heading)}</h2>
  <div id="lv-p-mine"></div>
  ${answerBlock}
  <p>${esc(s.reveal.explanation)}</p>
  ${s.reveal.points ? `<ul>${s.reveal.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
  ${fig}
  <div class="lv-actions"><button type="button" class="lv-btn is-secondary" id="lv-p-again">Start again</button></div>
</section>`;

  return { body, script: `(${client.toString()})(${ctx.safeJson(data)});` };
}

function niceStep(range) {
  const rough = range / 100;
  const mag = 10 ** Math.floor(Math.log10(rough));
  for (const m of [1, 2, 2.5, 5, 10]) if (mag * m >= rough) return mag * m;
  return mag * 10;
}
function roundTo(v, step) { return Math.round(v / step) * step; }

/* ------------------------------------------------------------------ */
/* Canvas native                                                       */
/* ------------------------------------------------------------------ */

export function native(s, ctx) {
  const r = s.response;
  let instructions = `<p><strong>Before you read on, decide your answer.</strong> Write it down or say it out loud. Then open the box below to check.</p>\n    <p>${esc(s.question)}</p>`;
  if (r.kind === 'choice') instructions += `\n    ${olist(r.options.map((o) => o.label))}`;
  if (r.kind === 'number') instructions += `\n    <p>Give a number between ${r.prefix || ''}${r.min} and ${r.prefix || ''}${r.max}${r.unit ? ` ${esc(r.unit)}` : ''}.</p>`;
  if (r.kind === 'order') {
    const shown = ctx.shuffleIndices(r.items.length, `${s.title}/predict`, { notIdentity: r.fixedOrder }).map((i) => r.items[i]);
    instructions += `\n    <p>Put these in order:</p>\n    ${list(shown)}`;
  }

  let inside = '';
  if (r.kind === 'choice' && r.answer !== null && r.answer !== undefined) inside += `<p><strong>Answer:</strong> ${esc(r.options[r.answer].label)}</p>`;
  if (r.kind === 'number') inside += `<p><strong>Answer:</strong> ${esc(answerText(s))}</p>`;
  if (r.kind === 'order' && r.fixedOrder) inside += `<p><strong>The order:</strong></p>${olist(r.items)}`;
  inside += para(s.reveal.explanation);
  if (s.reveal.points) inside += list(s.reveal.points);
  if (r.kind === 'choice' && r.options.some((o) => o.feedback)) {
    inside += `<p><strong>About each option:</strong></p><ul>${r.options.map((o) => `<li><strong>${esc(o.label)}.</strong> ${esc(o.feedback || '')}</li>`).join('')}</ul>`;
  }
  if (s.reveal.figure) inside += diagramBlock({ a11y: ctx.figureA11y, fileUrl: ctx.figureUrl });

  const content = accordion(`Decided? Open to check: ${s.reveal.heading || 'the answer'}`, inside) + `\n${spacer}`;
  return nativeActivity({ title: `Predict: ${s.title}`, iconClass: meta.embleIcon, instructions, content });
}

/* ------------------------------------------------------------------ */
/* Teaching                                                            */
/* ------------------------------------------------------------------ */

export function teach(s) {
  return {
    placement: 'before',
    before: 'Set this as the hook before class. Learners arrive having committed to an answer, and they want to know whether they were right.',
    during: 'Open it in presenter view. Read the question and have the room commit: a show of hands for each option, or everyone writes a number or an order down. Then press R to reveal. Ask two or three people why they chose what they chose before explaining.',
    after: 'Revisit the question at the end of the topic and ask whether anyone would now answer differently, and why.',
    presenter: ['Press R to reveal the answer without anyone locking one in.', 'Read out the explanation, then open the floor.'],
  };
}

export function answerKey(s) {
  const r = s.response;
  const rows = [{ prompt: s.question, answer: answerText(s), why: s.reveal.explanation }];
  if (r.kind === 'choice') {
    r.options.forEach((o, i) => {
      if (o.feedback) rows.push({ prompt: `Feedback for option ${i + 1}: ${o.label}`, answer: i === r.answer ? 'Correct option' : 'Distractor', why: o.feedback });
    });
  }
  return rows;
}

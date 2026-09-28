/**
 * Sort. Classify real examples, with feedback on each one.
 *
 * Why it works: recognising a thing in the wild is a discrimination skill, and
 * discrimination is learned from contrasting cases, not from definitions. A
 * learner who can recite the definition of bargaining still has to learn what
 * bargaining sounds like when a client says it. Sorting a set of real examples,
 * and being told why each belongs where it does, is that practice.
 *
 * Every item must carry a reason. "Incorrect" teaches nothing; "this is anger,
 * because it is aimed at the staff member in the room" teaches the cue.
 */

import { esc } from '../../svg.js';
import { accordion, nativeActivity, spacer } from '../native.js';

export const meta = {
  label: 'Sort it',
  verb: 'classifies real examples and is told why each belongs where it does',
  why: 'Recognition is learned from contrasting examples, not from definitions, and the reason given for each item teaches the cue to look for.',
  keys: '→ next item · R reveal this item · Esc leave presenter view',
  scored: true,
  embleIcon: 'icon-check',
};

export function validate(s, h) {
  h.str(s.prompt, 'prompt', { max: 300 });
  const cats = h.arr(s.categories, 'categories', { min: 2, max: 6 });
  const keys = new Set();
  cats.forEach((c, i) => {
    h.str(c.key, `categories[${i}].key`, { max: 40 });
    if (keys.has(c.key)) h.fail(`categories[${i}].key`, `"${c.key}" is used twice`);
    keys.add(c.key);
    h.str(c.label, `categories[${i}].label`, { max: 60 });
    h.str(c.hint, `categories[${i}].hint`, { required: false, max: 220 });
  });
  h.arr(s.items, 'items', { min: 3, max: 16 }).forEach((it, i) => {
    h.str(it.text, `items[${i}].text`, { max: 320 });
    if (!keys.has(it.category)) {
      h.fail(`items[${i}].category`, `is "${it.category}", which is not one of the category keys: ${[...keys].join(', ')}`);
    }
    h.str(it.why, `items[${i}].why`, { max: 420 });
  });
  return {};
}

const labelOf = (s, key) => s.categories.find((c) => c.key === key).label;

export function describe(s) {
  return {
    shape: `A sorting activity: ${s.items.length} examples, each to be placed in one of ${s.categories.length} categories.`,
    marks: 'Each example is a card with a row of category buttons under it. After checking, each card is marked right or not yet, with the correct category and the reason.',
    structure: `Categories: ${s.categories.map((c) => c.label).join(', ')}. ${s.prompt}`,
    items: s.items.map((it) => ({ key: it.text, value: `${labelOf(s, it.category)}. ${it.why}` })),
    visibleText: [s.prompt, ...s.categories.map((c) => c.label), ...s.items.map((it) => it.text)],
  };
}

export function figure() {
  return null;
}

/* eslint-disable no-var, prefer-arrow-callback, func-names */
function client(D) {
  var LV = window.LV;
  var $ = function (id) { return document.getElementById(id); };
  var cards = document.querySelectorAll('.lv-sort-card');
  var summary = $('lv-sort-summary');
  var current = 0;

  function chosen(i) {
    var c = document.querySelector('input[name="lv-sort-' + i + '"]:checked');
    return c ? c.value : null;
  }

  function mark(i, reveal) {
    var card = cards[i];
    var item = D.items[D.order[i]];
    var pick = chosen(i);
    var ok = pick === item.category;
    var fb = card.querySelector('.lv-feedback');
    var cls = reveal ? 'is-part' : ok ? 'is-ok' : 'is-miss';
    var word = reveal ? 'Answer' : ok ? '&#10003; Right' : pick ? '&#10007; Not quite' : 'Not answered';
    fb.className = 'lv-feedback ' + cls;
    fb.innerHTML = '<span class="lv-mark">' + word + '</span><div><p><strong>' + LV.esc(D.labels[item.category]) + '.</strong> ' + LV.esc(item.why) + '</p></div>';
    fb.hidden = false;
    card.classList.remove('is-ok', 'is-miss');
    if (!reveal) card.classList.add(ok ? 'is-ok' : 'is-miss');
    return ok;
  }

  function check() {
    var right = 0;
    var answered = 0;
    for (var i = 0; i < cards.length; i += 1) {
      if (chosen(i)) answered += 1;
      if (mark(i, false)) right += 1;
    }
    var all = right === cards.length;
    summary.className = 'lv-feedback ' + (all ? 'is-ok' : 'is-part');
    summary.innerHTML = '<span class="lv-mark">' + right + ' of ' + cards.length + '</span><div><p>'
      + (all ? 'All sorted correctly. Read the reasons anyway: they are the cues you will use on the job.'
        : (answered < cards.length ? (cards.length - answered) + ' not answered. ' : '')
          + 'Read the reason on each one you missed, then try those again.')
      + '</p></div>';
    summary.hidden = false;
    $('lv-sort-retry').hidden = all;
    LV.report({ complete: true, score: right / cards.length });
    LV.announce(right + ' of ' + cards.length + ' correct.');
    summary.focus();
    LV.reportHeight();
  }

  function retryMissed() {
    var first = null;
    for (var i = 0; i < cards.length; i += 1) {
      if (cards[i].classList.contains('is-ok')) continue;
      var c = document.querySelector('input[name="lv-sort-' + i + '"]:checked');
      if (c) c.checked = false;
      cards[i].classList.remove('is-miss');
      cards[i].querySelector('.lv-feedback').hidden = true;
      if (first === null) first = i;
    }
    summary.hidden = true;
    if (first !== null) {
      var input = cards[first].querySelector('input');
      if (input) input.focus();
    }
    LV.reportHeight();
  }

  function reset() {
    for (var i = 0; i < cards.length; i += 1) {
      var c = document.querySelector('input[name="lv-sort-' + i + '"]:checked');
      if (c) c.checked = false;
      cards[i].classList.remove('is-ok', 'is-miss', 'is-current');
      cards[i].querySelector('.lv-feedback').hidden = true;
    }
    summary.hidden = true;
    $('lv-sort-retry').hidden = true;
    LV.reportHeight();
  }

  // In presenter view, the teacher takes the room through one example at a
  // time: read it out, take a vote, press R to show the answer and the reason.
  function focusCard(i) {
    current = Math.max(0, Math.min(cards.length - 1, i));
    for (var k = 0; k < cards.length; k += 1) cards[k].classList.toggle('is-current', k === current);
    cards[current].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  LV.presenter.on({
    next: function () { focusCard(current + 1); },
    prev: function () { focusCard(current - 1); },
    reveal: function () { mark(current, true); },
  });
  if (LV.presenter.active()) focusCard(0);

  $('lv-sort-check').addEventListener('click', check);
  $('lv-sort-retry').addEventListener('click', retryMissed);
  $('lv-sort-reset').addEventListener('click', reset);
}
/* eslint-enable */

const CSS = `
.lv-sort-legend { display: grid; gap: 6px; margin: 0 0 14px; padding: 0; list-style: none; }
.lv-sort-legend li { font-size: 14.5px; }
.lv-sort-list { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.lv-sort-card { border: 2px solid var(--line); border-radius: 12px; padding: 14px 14px 12px; background: var(--paper); transition: border-color var(--t) ease; }
.lv-sort-card.is-ok { border-color: var(--ok); }
.lv-sort-card.is-miss { border-color: var(--miss); }
.lv-sort-card.is-current { border-color: var(--accent); box-shadow: 0 0 0 4px rgba(250, 200, 0, .35); }
.lv-sort-text { margin: 0; font-size: 16.5px; }
.lv-sort-quote { font-weight: 700; }
.lv-sort-card fieldset { margin: 0; }
html.lv-present .lv-sort-text { font-size: 26px; }
`;

export function interactive(s, ctx) {
  const order = ctx.shuffleIndices(s.items.length, `${s.title}/sort`);
  const labels = Object.fromEntries(s.categories.map((c) => [c.key, c.label]));
  const legend = s.categories.some((c) => c.hint)
    ? `<ul class="lv-sort-legend">${s.categories.map((c) => `<li><strong>${esc(c.label)}.</strong> ${esc(c.hint || '')}</li>`).join('')}</ul>`
    : '';

  const cards = order.map((itemIdx, i) => {
    const it = s.items[itemIdx];
    return `<li class="lv-sort-card">
      <p class="lv-sort-text" id="lv-sort-t-${i}"><span class="lv-sr">Example ${i + 1}. </span>${esc(it.text)}</p>
      <fieldset class="lv-seg" aria-labelledby="lv-sort-t-${i}">
        ${s.categories.map((c) => `<label><input type="radio" name="lv-sort-${i}" value="${esc(c.key)}">${esc(c.label)}</label>`).join('')}
      </fieldset>
      <div class="lv-feedback" hidden></div>
    </li>`;
  }).join('');

  const body = `
<div class="lv-card">
  <p class="lv-prompt">${esc(s.prompt)}</p>
  ${legend}
  <ol class="lv-sort-list">${cards}</ol>
  <div class="lv-feedback" id="lv-sort-summary" hidden tabindex="-1"></div>
  <div class="lv-actions">
    <button type="button" class="lv-btn" id="lv-sort-check">Check my answers</button>
    <button type="button" class="lv-btn is-secondary" id="lv-sort-retry" hidden>Try the ones I missed</button>
    <button type="button" class="lv-btn is-ghost" id="lv-sort-reset">Start again</button>
  </div>
</div>`;

  const data = { order, items: s.items, labels };
  return { body, css: CSS, script: `(${client.toString()})(${ctx.safeJson(data)});` };
}

export function native(s, ctx) {
  const order = ctx.shuffleIndices(s.items.length, `${s.title}/sort`);
  const instructions = `<p><strong>${esc(s.prompt)}</strong></p>
    <p>Decide which it is for each example before you open it. The answer and the reason are inside.</p>
    <ul>${s.categories.map((c) => `<li><strong>${esc(c.label)}</strong>${c.hint ? `. ${esc(c.hint)}` : ''}</li>`).join('')}</ul>`;
  const items = order.map((idx, i) => {
    const it = s.items[idx];
    return accordion(`${i + 1}. ${it.text}`, `<p><strong>${esc(labelOf(s, it.category))}.</strong> ${esc(it.why)}</p>`);
  }).join('\n');
  return nativeActivity({ title: `Sort it: ${s.title}`, iconClass: meta.embleIcon, instructions, content: `${items}\n${spacer}` });
}

export function teach(s) {
  return {
    placement: 'after',
    before: 'Can work as a before-class diagnostic: the score tells you which categories the group already confuses.',
    during: `In presenter view, the right arrow moves through the examples one at a time. Read each one out, ask the room to vote on the category, then press R to show the answer and the reason. The disagreements are where the teaching is.`,
    after: 'Set it as practice after the topic. Learners can retry the ones they missed until the cues are secure.',
    presenter: ['Right arrow: highlight the next example. Left arrow: back.', 'R: show the answer and reason for the highlighted example.'],
  };
}

export function answerKey(s) {
  return s.items.map((it) => ({ prompt: it.text, answer: labelOf(s, it.category), why: it.why }));
}

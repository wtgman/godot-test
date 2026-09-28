/**
 * Cards. Recall it, check it, say how it went, and meet the misses again.
 *
 * Why it works: pulling something out of memory strengthens it far more than
 * reading it again (the testing effect), and meeting the ones you missed again
 * a few cards later, rather than immediately, spaces the practice. This is the
 * pattern for things that have to become automatic: the terms of a trade, the
 * rules of a procedure, what to say instead of what not to say.
 *
 * Self-rated, so never marked. Completion is reported when every card has been
 * rated "got it".
 */

import { esc } from '../../svg.js';
import { accordion, nativeActivity, spacer } from '../native.js';

export const meta = {
  label: 'Recall practice',
  verb: 'recalls each answer, checks it, and repeats the ones missed',
  why: 'Recalling an answer strengthens memory far more than rereading it, and meeting the misses again a few cards later spaces the practice.',
  keys: 'Space turn the card · Esc leave presenter view',
  scored: false,
  embleIcon: 'icon-document',
};

export function validate(s, h) {
  h.str(s.prompt, 'prompt', { required: false, max: 240 });
  h.str(s.frontLabel, 'frontLabel', { required: false, max: 40 });
  h.str(s.backLabel, 'backLabel', { required: false, max: 40 });
  h.arr(s.cards, 'cards', { min: 3, max: 30 }).forEach((c, i) => {
    h.str(c.front, `cards[${i}].front`, { max: 240 });
    h.str(c.back, `cards[${i}].back`, { max: 600 });
  });
  return {};
}

export function describe(s) {
  return {
    shape: `A set of ${s.cards.length} recall cards.`,
    marks: 'One card at a time. The learner tries to recall the answer, turns the card to check, and rates themselves. Cards marked not yet come back later in the set.',
    structure: s.prompt || 'Work through the set until every card is marked got it.',
    items: s.cards.map((c) => ({ key: c.front, value: c.back })),
    visibleText: [s.prompt, ...s.cards.map((c) => c.front)].filter(Boolean),
  };
}

export function figure() {
  return null;
}

/* eslint-disable no-var, prefer-arrow-callback, func-names */
function client(D) {
  var LV = window.LV;
  var $ = function (id) { return document.getElementById(id); };
  var queue = D.order.slice();
  var secure = 0;
  var extra = 0;
  var flipped = false;
  var card = $('lv-c-card');

  function render() {
    var total = D.cards.length;
    $('lv-c-count').textContent = secure + ' of ' + total + ' secure';
    $('lv-c-bar').style.width = (secure / total * 100) + '%';
    if (!queue.length) {
      card.hidden = true;
      $('lv-c-rate').hidden = true;
      $('lv-c-flip').hidden = true;
      var done = $('lv-c-done');
      done.innerHTML = '<h2 tabindex="-1" id="lv-c-done-h">All ' + total + ' secure</h2><p>'
        + (extra ? 'It took ' + extra + ' extra go' + (extra === 1 ? '' : 'es') + ' on the ones that were not there yet. That is the practice working.' : 'Every card first time.')
        + '</p><div class="lv-actions"><button type="button" class="lv-btn" id="lv-c-again">Go through them again</button></div>';
      done.hidden = false;
      $('lv-c-again').addEventListener('click', restart);
      $('lv-c-done-h').focus();
      LV.report({ complete: true, score: null });
      LV.reportHeight();
      return;
    }
    var c = D.cards[queue[0]];
    flipped = false;
    $('lv-c-front').textContent = c.front;
    $('lv-c-back').textContent = c.back;
    $('lv-c-backwrap').hidden = true;
    card.classList.remove('is-flipped');
    $('lv-c-flip').hidden = false;
    $('lv-c-rate').hidden = true;
    LV.reportHeight();
  }

  function flip() {
    if (flipped || !queue.length) return;
    flipped = true;
    card.classList.add('is-flipped');
    $('lv-c-backwrap').hidden = false;
    $('lv-c-flip').hidden = true;
    $('lv-c-rate').hidden = false;
    LV.announce(D.cards[queue[0]].back);
    $('lv-c-got').focus();
  }

  function rate(got) {
    var idx = queue.shift();
    if (got) {
      secure += 1;
    } else {
      extra += 1;
      // Back into the deck a few cards later, not straight away: a gap is what
      // makes the second attempt a real act of recall.
      var at = Math.min(queue.length, 3);
      queue.splice(at, 0, idx);
    }
    LV.announce(got ? 'Marked got it.' : 'This one will come back.');
    render();
    if (queue.length) $('lv-c-flip').focus();
  }

  function restart() {
    queue = D.order.slice(); secure = 0; extra = 0;
    card.hidden = false;
    $('lv-c-done').hidden = true;
    render();
    $('lv-c-flip').focus();
  }

  $('lv-c-flip').addEventListener('click', flip);
  $('lv-c-got').addEventListener('click', function () { rate(true); });
  $('lv-c-not').addEventListener('click', function () { rate(false); });
  LV.presenter.on({ next: function () { if (!flipped) flip(); else rate(true); }, reveal: flip });
  render();
}
/* eslint-enable */

const CSS = `
.lv-c-card { border: 2px solid var(--line); border-radius: 16px; padding: 22px 22px 18px; min-height: 180px; display: grid; align-content: center; background: var(--paper); transition: border-color var(--t) ease; }
.lv-c-card.is-flipped { border-color: var(--ink); }
.lv-c-label { font-size: 12.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--ok); margin: 0 0 6px !important; }
.lv-c-front { font-size: 22px; font-weight: 800; line-height: 1.3; margin: 0 !important; }
.lv-c-backwrap { border-top: 1px dashed var(--line-strong); margin-top: 16px; padding-top: 14px; animation: lv-rise 220ms ease both; }
.lv-c-back { font-size: 17.5px; margin: 0 !important; }
html.lv-present .lv-c-front { font-size: 36px; }
html.lv-present .lv-c-back { font-size: 26px; }
`;

export function interactive(s, ctx) {
  const order = ctx.shuffleIndices(s.cards.length, `${s.title}/cards`);
  const body = `
<div class="lv-card">
  ${s.prompt ? `<p class="lv-prompt">${esc(s.prompt)}</p>` : ''}
  <div class="lv-progress"><span id="lv-c-count"></span><div class="lv-bar"><span id="lv-c-bar"></span></div></div>
  <div class="lv-c-card" id="lv-c-card">
    <p class="lv-c-label">${esc(s.frontLabel || 'Recall')}</p>
    <p class="lv-c-front" id="lv-c-front"></p>
    <div class="lv-c-backwrap" id="lv-c-backwrap" hidden>
      <p class="lv-c-label">${esc(s.backLabel || 'Answer')}</p>
      <p class="lv-c-back" id="lv-c-back"></p>
    </div>
  </div>
  <div class="lv-actions">
    <button type="button" class="lv-btn" id="lv-c-flip">Turn the card<span class="lv-key">space</span></button>
    <div class="lv-actions" id="lv-c-rate" hidden style="margin:0">
      <button type="button" class="lv-btn" id="lv-c-got">Got it</button>
      <button type="button" class="lv-btn is-secondary" id="lv-c-not">Not yet</button>
    </div>
  </div>
  <section id="lv-c-done" hidden></section>
</div>`;
  return { body, css: CSS, script: `(${client.toString()})(${ctx.safeJson({ cards: s.cards, order })});` };
}

export function native(s) {
  const instructions = `<p><strong>${esc(s.prompt || 'Recall the answer before you open each card.')}</strong></p><p>Say or write your answer first. Opening the card before you have tried is reading, not practising.</p>`;
  const items = s.cards.map((c) => accordion(c.front, `<p>${esc(c.back)}</p>`)).join('\n');
  return nativeActivity({ title: `Recall practice: ${s.title}`, iconClass: meta.embleIcon, instructions, content: `${items}\n${spacer}` });
}

export function teach() {
  return {
    placement: 'after',
    before: 'Can open a class as a quick check of what stuck from last time.',
    during: 'In presenter view, read a card, give the room a few seconds of silence to recall, then turn it. Space turns the card, then moves to the next one.',
    after: 'The natural after-class practice. Encourage learners to come back to it on a later day as well: spacing across days is where the biggest gains are.',
    presenter: ['Space: turn the card. Space again: next card.'],
  };
}

export function answerKey(s) {
  return s.cards.map((c) => ({ prompt: c.front, answer: c.back, why: '' }));
}

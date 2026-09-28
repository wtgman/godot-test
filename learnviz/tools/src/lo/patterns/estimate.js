/**
 * Estimate. Guess the hidden values on a chart, then see the truth.
 *
 * Why it works: people carry intuitions about scale that are badly wrong and
 * that reading a number does not fix. Asking for the guess first, with some
 * reference bars visible, and then showing the real bar against the guess,
 * turns "one billion dollars" from a figure into a size. The gap between guess
 * and truth is what gets remembered. The format is the one popularised by the
 * New York Times as "You Draw It".
 *
 * Guesses are never marked. What matters is the moment of comparison.
 *
 * The chart is plain HTML rather than SVG so the sliders are real range inputs,
 * sitting exactly where the bar will be: operable by keyboard, announced by a
 * screen reader, and usable with a thumb.
 */

import { esc } from '../../svg.js';
import { accordion, nativeActivity, spacer, list } from '../native.js';
import { diagramBlock } from '../../emble.js';

export const meta = {
  label: 'Estimate, then compare',
  verb: 'guesses hidden values on a chart before they are revealed',
  why: 'Committing to a guess and then seeing the gap turns a figure into a felt sense of size, which reading the number never does.',
  keys: 'R reveal the real values · Esc leave presenter view',
  scored: false,
  embleIcon: 'icon-question',
};

export function validate(s, h) {
  h.str(s.question, 'question', { max: 300 });
  h.str(s.unit, 'unit', { max: 40 });
  h.str(s.prefix, 'prefix', { required: false, max: 6 });
  h.str(s.suffix, 'suffix', { required: false, max: 8 });
  h.num(s.decimals, 'decimals', { required: false });
  const bars = h.arr(s.bars, 'bars', { min: 2, max: 8 });
  bars.forEach((b, i) => {
    h.str(b.label, `bars[${i}].label`, { max: 70 });
    h.num(b.value, `bars[${i}].value`);
    if (b.value < 0) h.fail(`bars[${i}].value`, 'must be zero or more. Bars start at zero, always.');
    h.bool(b.hidden, `bars[${i}].hidden`);
    h.str(b.note, `bars[${i}].note`, { required: false, max: 220 });
  });
  if (!bars.some((b) => b.hidden)) h.fail('bars', 'needs at least one bar with "hidden": true, or there is nothing to estimate');
  if (!bars.some((b) => !b.hidden)) h.fail('bars', 'needs at least one visible bar, so the learner has something to estimate against');
  h.num(s.max, 'max', { required: false });
  const rv = s.reveal;
  if (!rv || typeof rv !== 'object') h.fail('reveal', 'is required');
  h.str(rv.heading, 'reveal.heading', { required: false, max: 140 });
  h.str(rv.explanation, 'reveal.explanation', { max: 900 });
  if (rv.points !== undefined) h.arr(rv.points, 'reveal.points', { min: 1, max: 6 }).forEach((p, i) => h.str(p, `reveal.points[${i}]`, { max: 240 }));
  return {};
}

/**
 * Fixed decimals when the spec sets them. Otherwise up to two decimals below
 * ten and one above, with no trailing zeros: 1.65, 1.1, 26.2, 19.
 */
function fmt(s, v) {
  const max = s.decimals ?? (Math.abs(v) < 10 ? 2 : 1);
  const min = s.decimals ?? 0;
  return `${s.prefix || ''}${Number(v).toLocaleString('en-AU', { minimumFractionDigits: min, maximumFractionDigits: max })}${s.suffix || ''}`;
}

/** Round gridline steps (1, 2, 2.5 or 5 times a power of ten), so every axis label is exact. */
function axis(max) {
  const rough = max / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  let step = mag * 10;
  for (const m of [1, 2, 2.5, 5, 10]) if (mag * m >= rough - 1e-12) { step = mag * m; break; }
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 1000; v += step) ticks.push(Number(v.toPrecision(12)));
  const dp = Number.isInteger(Number(step.toPrecision(12))) ? 0 : String(Number(step.toPrecision(12))).split('.')[1].length;
  return { top, step, ticks, dp };
}

/** A round scale maximum a little above the largest value, so no bar touches the edge. */
function scaleMax(s) {
  if (s.max) return s.max;
  const top = Math.max(...s.bars.map((b) => b.value)) * 1.15;
  const mag = 10 ** Math.floor(Math.log10(top));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (mag * m >= top) return mag * m;
  return mag * 10;
}

export function describe(s) {
  return {
    shape: `An estimation chart with ${s.bars.length} bars, ${s.bars.filter((b) => b.hidden).length} of them hidden until the learner has guessed.`,
    marks: 'Horizontal bars, one per item, all starting at zero. Hidden bars have a slider instead, set by the learner. After revealing, the real bar appears with a marker showing where the guess was.',
    structure: `${s.question} Values are in ${s.unit}.`,
    items: s.bars.map((b) => ({ key: b.label, value: `${fmt(s, b.value)} ${s.unit}${b.hidden ? ' (hidden until the reveal)' : ''}${b.note ? `. ${b.note}` : ''}` })),
    visibleText: [s.question, ...s.bars.map((b) => b.label), s.reveal.heading || '', s.reveal.explanation].filter(Boolean),
  };
}

export function figure(s) {
  return {
    type: 'chart',
    mode: 'bar',
    title: s.title,
    intent: s.intent,
    yLabel: s.unit,
    categories: s.bars.map((b) => b.label),
    series: [{ label: s.unit, values: s.bars.map((b) => b.value) }],
  };
}

/* eslint-disable no-var, prefer-arrow-callback, func-names */
function client(D) {
  var LV = window.LV;
  var $ = function (id) { return document.getElementById(id); };
  var revealed = false;

  function fmt(v) {
    var fixed = typeof D.decimals === 'number';
    return (D.prefix || '') + v.toLocaleString('en-AU', { minimumFractionDigits: fixed ? D.decimals : 0, maximumFractionDigits: fixed ? D.decimals : (Math.abs(v) < 10 ? 2 : 1) }) + (D.suffix || '');
  }
  function pct(v) { return Math.max(0, Math.min(100, (v / D.max) * 100)); }
  // The value sits just past the end of its bar, or inside a nearly full one.
  function place(el, v, solid) {
    var p = pct(v);
    var inside = p > D.inside;
    el.classList.toggle('is-inside', inside && solid);
    el.style.left = inside ? 'auto' : 'calc(' + p + '% + 8px)';
    el.style.right = inside ? 'calc(' + (100 - p) + '% + 6px)' : 'auto';
  }

  D.bars.forEach(function (b, i) {
    if (!b.hidden) return;
    var r = $('lv-e-r-' + i);
    var out = $('lv-e-o-' + i);
    var ghost = $('lv-e-g-' + i);
    var pill = out.parentNode;
    var sync = function () {
      out.textContent = fmt(Number(r.value));
      place(pill, Number(r.value), false);
      ghost.style.width = pct(Number(r.value)) + '%';
      // Spoken as the number and the unit in words, without the symbols: "20 billion US dollars".
      r.setAttribute('aria-valuetext', Number(r.value).toLocaleString('en-AU', { maximumFractionDigits: 2 }) + ' ' + D.unit);
    };
    r.addEventListener('input', sync);
    sync();
  });

  function reveal(room) {
    if (revealed) return;
    revealed = true;
    var lines = [];
    D.bars.forEach(function (b, i) {
      if (!b.hidden) return;
      var r = $('lv-e-r-' + i);
      var guess = Number(r.value);
      r.disabled = true;
      var row = $('lv-e-row-' + i);
      row.classList.add('is-revealed');
      var fill = $('lv-e-f-' + i);
      fill.style.width = pct(b.value) + '%';
      // The pill showed the guess; now it shows the truth.
      var pill = row.querySelector('.lv-e-value');
      pill.textContent = fmt(b.value);
      place(pill, b.value, true);
      var tick = $('lv-e-t-' + i);
      if (!room) {
        tick.style.left = pct(guess) + '%';
        // Near the right edge the label sits to the left of the line, so it stays inside the card.
        tick.classList.toggle('is-right', pct(guess) > 72);
        tick.hidden = false;
        var gap = b.value ? Math.round(Math.abs(guess - b.value) / b.value * 100) : 0;
        var close = gap <= 10;
        // Percentages stop meaning much past double. "About 8 times" is how
        // people actually talk about a guess that far out.
        var times = function (r) { return LV.fmt(r, r < 10 ? 1 : 0) + ' times'; };
        var how = close ? '&#10003; Close'
          : guess >= b.value * 2 ? '&#8776; ' + times(guess / b.value) + ' too high'
            : guess > 0 && guess <= b.value / 2 ? '&#8776; ' + times(b.value / guess) + ' too low'
              : guess <= 0 ? 'Too low'
                : '&#8776; ' + gap + '% too ' + (guess < b.value ? 'low' : 'high');
        var fb = $('lv-e-fb-' + i);
        fb.innerHTML = '<span class="lv-tag ' + (close ? 'is-ok' : 'is-part') + '">' + how + '</span> You said ' + fmt(guess) + '.';
        fb.hidden = false;
        lines.push(b.label + ': you said ' + fmt(guess) + ', the real value is ' + fmt(b.value) + '.');
      } else {
        lines.push(b.label + ': ' + fmt(b.value) + '.');
      }
    });
    $('lv-e-go').hidden = true;
    var rv = $('lv-e-reveal');
    rv.hidden = false;
    rv.classList.add('lv-reveal');
    $('lv-e-reveal-h').focus();
    LV.announce('Revealed. ' + lines.join(' '));
    LV.report({ complete: true, score: null });
    LV.reportHeight();
  }

  $('lv-e-go').addEventListener('click', function () { reveal(false); });
  LV.presenter.on({ reveal: function () { reveal(true); } });
}
/* eslint-enable */

const CSS = `
.lv-e-chart { display: grid; gap: 14px; margin: 6px 0 4px; }
.lv-e-row { display: grid; grid-template-columns: minmax(110px, 26%) 1fr; gap: 12px; align-items: center; }
.lv-e-label { font-weight: 700; line-height: 1.25; }
.lv-e-label small { display: block; font-weight: 400; font-size: 13px; color: var(--ink-soft); }
.lv-e-track { position: relative; height: 34px; border-radius: 8px; background: repeating-linear-gradient(90deg, transparent 0 calc(var(--lv-grid) - 1px), var(--line) calc(var(--lv-grid) - 1px) var(--lv-grid)); }
.lv-e-fill { position: absolute; left: 0; top: 4px; bottom: 4px; border-radius: 6px; background: var(--ink); transition: width 900ms cubic-bezier(.2, .8, .2, 1); }
.lv-e-row.is-hidden .lv-e-fill { width: 0; background: var(--ok); }
.lv-e-ghost { position: absolute; left: 0; top: 4px; bottom: 4px; border-radius: 6px; background: repeating-linear-gradient(135deg, rgba(0,0,84,.18) 0 6px, rgba(0,0,84,.08) 6px 12px); border: 2px dashed var(--ink); pointer-events: none; }
.lv-e-row.is-revealed .lv-e-ghost { opacity: .0; }
.lv-e-value { position: absolute; top: 50%; transform: translateY(-50%); font-weight: 800; font-size: 14px; color: var(--ink); background: rgba(255,255,255,.9); padding: 0 6px; border-radius: 6px; white-space: nowrap; pointer-events: none; transition: left 900ms cubic-bezier(.2, .8, .2, 1); }
.lv-e-value.is-inside { background: transparent; color: #fff; }
.lv-e-range { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: ew-resize; }
.lv-e-range:focus-visible + .lv-e-focus { outline: 3px solid var(--focus); outline-offset: 3px; }
.lv-e-focus { position: absolute; inset: 0; border-radius: 8px; pointer-events: none; }
.lv-e-tick { position: absolute; top: -6px; bottom: -6px; width: 0; border-left: 3px solid var(--miss); }
.lv-e-tick::after { content: "Your guess"; position: absolute; top: -18px; left: 4px; font-size: 11.5px; font-weight: 800; color: var(--miss); white-space: nowrap; }
.lv-e-tick.is-right::after { left: auto; right: 7px; }
.lv-e-fb { grid-column: 2; font-size: 14px; margin: -6px 0 0; }
.lv-e-hint { font-size: 14px; color: var(--ink-soft); margin: 0 0 12px; }
.lv-e-axis { display: grid; grid-template-columns: minmax(110px, 26%) 1fr; gap: 12px; font-size: 12px; color: var(--ink-soft); }
.lv-e-axis-scale { position: relative; height: 1.4em; }
.lv-e-axis-scale span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
.lv-e-axis-scale span:first-child { transform: none; }
.lv-e-axis-scale span:last-child { transform: translateX(-100%); }
@media (max-width: 520px) { .lv-e-row, .lv-e-axis { grid-template-columns: 1fr; gap: 4px; } .lv-e-fb { grid-column: 1; } .lv-e-axis > span:first-child { display: none; } }
html.lv-present .lv-e-track { height: 46px; }
html.lv-present .lv-e-value { font-size: 18px; }
`;

/** Past this share of the track, a value label goes inside its bar rather than after it. */
const INSIDE = 75;

export function interactive(s, ctx) {
  const ax = axis(scaleMax(s));
  const max = ax.top;
  // Twenty slider positions per gridline: fine enough to guess with, round enough to read.
  const step = Number((ax.step / 20).toPrecision(6));
  const rows = s.bars.map((b, i) => {
    const w = (b.value / max) * 100;
    if (!b.hidden) {
      return `<div class="lv-e-row" id="lv-e-row-${i}">
        <div class="lv-e-label">${esc(b.label)}${b.note ? `<small>${esc(b.note)}</small>` : ''}</div>
        <div class="lv-e-track"><div class="lv-e-fill" style="width:${w.toFixed(2)}%"></div><span class="lv-e-value${w > INSIDE ? ' is-inside' : ''}" style="${w > INSIDE ? `right:calc(${(100 - w).toFixed(2)}% + 6px)` : `left:calc(${w.toFixed(2)}% + 8px)`}">${esc(fmt(s, b.value))}</span></div>
      </div>`;
    }
    const start = Math.round((max * 0.25) / step) * step;
    return `<div class="lv-e-row is-hidden" id="lv-e-row-${i}">
        <label class="lv-e-label" for="lv-e-r-${i}">${esc(b.label)}${b.note ? `<small>${esc(b.note)}</small>` : ''}</label>
        <div class="lv-e-track">
          <div class="lv-e-ghost" id="lv-e-g-${i}"></div>
          <div class="lv-e-fill" id="lv-e-f-${i}"></div>
          <input class="lv-e-range" type="range" id="lv-e-r-${i}" min="0" max="${max}" step="${step}" value="${start}">
          <span class="lv-e-focus"></span>
          <span class="lv-e-tick" id="lv-e-t-${i}" hidden></span>
          <span class="lv-e-value"><span class="lv-sr">Your guess: </span><output id="lv-e-o-${i}"></output></span>
        </div>
        <p class="lv-e-fb" id="lv-e-fb-${i}" hidden></p>
      </div>`;
  }).join('');

  const tickFmt = { prefix: s.prefix, suffix: s.suffix, decimals: ax.dp };
  const ticks = ax.ticks.map((v) => `<span style="left:${((v / max) * 100).toFixed(3)}%">${esc(fmt(tickFmt, v))}</span>`).join('');

  const body = `
<div class="lv-card">
  <p class="lv-prompt">${esc(s.question)}</p>
  <p class="lv-e-hint">Drag each dashed bar to your guess, or focus it and use the arrow keys. Values are in ${esc(s.unit)}.</p>
  <div class="lv-e-chart" style="--lv-grid:${((ax.step / max) * 100).toFixed(4)}%">${rows}</div>
  <div class="lv-e-axis" aria-hidden="true"><span></span><div class="lv-e-axis-scale">${ticks}</div></div>
  <div class="lv-actions"><button type="button" class="lv-btn" id="lv-e-go">Reveal the real values<span class="lv-key">R</span></button></div>
</div>
<section class="lv-card" id="lv-e-reveal" hidden aria-labelledby="lv-e-reveal-h">
  <h2 id="lv-e-reveal-h" tabindex="-1">${esc(s.reveal.heading || 'The real values')}</h2>
  <p>${esc(s.reveal.explanation)}</p>
  ${s.reveal.points ? `<ul>${s.reveal.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
</section>`;

  const data = { inside: INSIDE, bars: s.bars, max, unit: s.unit, prefix: s.prefix || '', suffix: s.suffix || '', decimals: s.decimals };
  return { body, css: CSS, script: `(${client.toString()})(${ctx.safeJson(data)});` };
}

export function native(s, ctx) {
  const known = s.bars.filter((b) => !b.hidden).map((b) => `${b.label}: ${fmt(s, b.value)} ${s.unit}`);
  const hidden = s.bars.filter((b) => b.hidden).map((b) => b.label);
  const instructions = `<p><strong>${esc(s.question)}</strong></p>
    <p>You know these:</p>${list(known)}
    <p>Write down your estimate for ${esc(hidden.join(' and '))} before you open the box.</p>`;
  const inside = `${list(s.bars.map((b) => `${b.label}: ${fmt(s, b.value)} ${s.unit}${b.note ? `. ${b.note}` : ''}`))}<p>${esc(s.reveal.explanation)}</p>`
    + (s.reveal.points ? list(s.reveal.points) : '')
    + diagramBlock({ a11y: ctx.figureA11y });
  return nativeActivity({ title: `Estimate: ${s.title}`, iconClass: meta.embleIcon, instructions, content: `${accordion(`Guessed? Open to see ${s.reveal.heading ? s.reveal.heading.toLowerCase() : 'the real values'}`, inside)}\n${spacer}` });
}

export function teach() {
  return {
    placement: 'before',
    before: 'A strong hook. Learners arrive with a number in their head and a reason to care whether it was right.',
    during: 'In presenter view, ask the room to shout out or write down guesses for the hidden bars, then press R. Ask whoever was furthest out what they assumed. That assumption is the lesson.',
    after: 'Return to it after the topic and ask what would have to be true for the hidden value to be as large, or as small, as it is.',
    presenter: ['R: reveal the real values without a guess, for the whole room.'],
  };
}

export function answerKey(s) {
  return s.bars.filter((b) => b.hidden).map((b) => ({ prompt: b.label, answer: `${fmt(s, b.value)} ${s.unit}`, why: b.note || s.reveal.explanation }));
}

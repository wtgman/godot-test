/**
 * Sequencer. A predict, check, explain activity on a time axis.
 *
 * The learner is asked when each item should happen, commits to an answer, and
 * only then sees the model timing and the reason behind it. That order matters:
 * a learner who has committed to "add the beans at 40 minutes" and finds out
 * they are 55 minutes early remembers the correction. A learner who is shown
 * the finished schedule reads it and forgets it.
 *
 * Deliberately not drag and drop. A number input is operable by keyboard, by
 * switch, by voice, and on a phone, and it also records a more precise answer
 * than dropping a tile into a lane.
 */

import { esc } from '../svg.js';
import { page, safeJson } from './shell.js';

export function build(spec, a11y) {
  const items = spec.items.map((it, i) => ({
    id: `item-${i}`,
    label: it.label,
    at: it.at,
    because: it.because,
    tolerance: it.tolerance ?? defaultTolerance(spec),
  }));

  const maxAt = Math.max(...items.map((i) => i.at));

  const rows = items.map((it, i) => `
    <tr>
      <th scope="row" id="${it.id}-label">${esc(it.label)}</th>
      <td>
        <input type="number" id="${it.id}" name="${it.id}"
               aria-labelledby="${it.id}-label"
               aria-describedby="unit-hint"
               min="0" step="any" inputmode="decimal">
      </td>
      <td id="${it.id}-verdict"></td>
    </tr>`).join('');

  const main = `
<form id="lv-form">
  <p id="unit-hint">Give each answer in ${esc(spec.timeUnit)}.</p>
  <table>
    <caption id="lv-prompt">${esc(spec.prompt)}</caption>
    <thead>
      <tr>
        <th scope="col">Item</th>
        <th scope="col">Your answer</th>
        <th scope="col">Result</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="lv-actions">
    <button type="submit" id="lv-check">Check my answers</button>
    <button type="button" class="lv-secondary" id="lv-model">Show the model schedule</button>
    <button type="button" class="lv-secondary" id="lv-reset">Start again</button>
  </div>
</form>

<div class="lv-feedback" id="lv-feedback" role="status" aria-live="polite"></div>

<h2 id="lv-stage-heading">Your schedule</h2>
<p class="lv-sub" id="lv-stage-desc">Your answers appear on this axis as you type. After you check, the model timing appears underneath each one.</p>
<div class="lv-stage">
  <svg id="lv-chart" viewBox="0 0 720 240" role="img"
       aria-labelledby="lv-stage-heading" aria-describedby="lv-stage-desc"></svg>
</div>
`;

  const script = `
(function () {
  var ITEMS = ${safeJson(items)};
  var UNIT = ${safeJson(spec.timeUnit)};
  var MAX = ${safeJson(maxAt)};
  var checked = false;

  var form = document.getElementById('lv-form');
  var feedback = document.getElementById('lv-feedback');
  var chart = document.getElementById('lv-chart');

  function inputFor(it) { return document.getElementById(it.id); }
  function answerFor(it) {
    var v = inputFor(it).value;
    return v === '' ? null : Number(v);
  }

  /** Axis runs a little past the last model event so nothing sits on the edge. */
  function axisMax() {
    var given = ITEMS.map(answerFor).filter(function (v) { return v !== null && isFinite(v); });
    return Math.max(MAX, given.length ? Math.max.apply(null, given) : 0) * 1.1 + 1;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function drawChart() {
    var W = 720, PADL = 12, PADR = 12, top = 34;
    var rowH = 26;
    var height = top + ITEMS.length * rowH + 34;
    var max = axisMax();
    var plotL = PADL + 150, plotR = W - PADR;
    var plotW = plotR - plotL;
    var x = function (v) { return plotL + (v / max) * plotW; };

    var s = '';
    s += '<text x="' + plotL + '" y="16" font-size="11" font-weight="bold" fill="#000054">' + esc(UNIT) + '</text>';

    // Ticks.
    var step = Math.pow(10, Math.floor(Math.log10(max / 5)));
    [1, 2, 2.5, 5, 10].some(function (m) {
      if (step * m >= max / 5) { step = step * m; return true; }
      return false;
    });
    for (var v = 0; v <= max; v += step) {
      s += '<line x1="' + x(v) + '" y1="' + top + '" x2="' + x(v) + '" y2="' + (top + ITEMS.length * rowH) + '" stroke="#d5d5dd"/>';
      s += '<text x="' + x(v) + '" y="' + (top - 6) + '" font-size="10" fill="#000054" text-anchor="middle" opacity=".85">' + (Math.round(v * 100) / 100) + '</text>';
    }

    ITEMS.forEach(function (it, i) {
      var y = top + i * rowH + rowH / 2;
      s += '<text x="' + PADL + '" y="' + (y + 4) + '" font-size="11.5" font-weight="bold" fill="#000054">'
        + esc(it.label.length > 24 ? it.label.slice(0, 23) + '\\u2026' : it.label) + '</text>';

      var given = answerFor(it);
      if (given !== null && isFinite(given) && given >= 0) {
        // The learner's answer: a hollow ring, so it reads as provisional.
        s += '<circle cx="' + x(given) + '" cy="' + y + '" r="6" fill="#ffffff" stroke="#000054" stroke-width="2.5"/>';
      }
      if (checked) {
        // The model answer: a filled diamond, plus a connector showing the gap.
        var mx = x(it.at);
        if (given !== null && isFinite(given)) {
          s += '<line x1="' + x(given) + '" y1="' + y + '" x2="' + mx + '" y2="' + y + '" stroke="#a4177c" stroke-width="1.5" stroke-dasharray="3 3"/>';
        }
        s += '<polygon points="' + mx + ',' + (y - 6) + ' ' + (mx + 6) + ',' + y + ' ' + mx + ',' + (y + 6) + ' ' + (mx - 6) + ',' + y + '" fill="#00706b"/>';
      }
    });

    // Legend, always spelled out in words.
    var ly = height - 12;
    s += '<circle cx="' + (PADL + 6) + '" cy="' + (ly - 4) + '" r="5" fill="#ffffff" stroke="#000054" stroke-width="2.5"/>';
    s += '<text x="' + (PADL + 18) + '" y="' + ly + '" font-size="11" fill="#000054">Your answer</text>';
    if (checked) {
      s += '<polygon points="' + (PADL + 140) + ',' + (ly - 9) + ' ' + (PADL + 146) + ',' + (ly - 4) + ' ' + (PADL + 140) + ',' + (ly + 1) + ' ' + (PADL + 134) + ',' + (ly - 4) + '" fill="#00706b"/>';
      s += '<text x="' + (PADL + 152) + '" y="' + ly + '" font-size="11" fill="#000054">Model timing</text>';
    }

    chart.setAttribute('viewBox', '0 0 ' + W + ' ' + height);
    chart.innerHTML = s;
  }

  function verdictCell(it, given) {
    var cell = document.getElementById(it.id + '-verdict');
    if (given === null || !isFinite(given)) {
      cell.innerHTML = '<span class="lv-mark">Not answered</span>'
        + '<p class="lv-why">Model timing: ' + it.at + ' ' + esc(UNIT) + '. ' + esc(it.because) + '</p>';
      return false;
    }
    var ok = Math.abs(given - it.at) <= it.tolerance;
    // The symbol and the word both carry the verdict, so it survives greyscale
    // and colour vision deficiency.
    cell.innerHTML = '<span class="lv-mark ' + (ok ? 'is-ok' : 'is-no') + '">'
      + (ok ? '\\u2713 Close enough' : '\\u2717 Not yet') + '</span>'
      + '<p class="lv-why">Model timing: ' + it.at + ' ' + esc(UNIT)
      + (ok ? '' : ' (you said ' + given + ')') + '. ' + esc(it.because) + '</p>';
    return ok;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    checked = true;
    var correct = 0;
    ITEMS.forEach(function (it) {
      if (verdictCell(it, answerFor(it))) correct += 1;
    });
    var all = correct === ITEMS.length;
    feedback.innerHTML = '<div class="lv-verdict ' + (all ? 'is-ok' : 'is-no') + '">'
      + '<strong>' + correct + ' of ' + ITEMS.length + ' within range.</strong> '
      + (all
        ? 'Every item is timed correctly. Read the reasons below to check that you got them right for the right reason.'
        : 'Look at the reason given for each one you missed, adjust your answers and check again.')
      + '</div>';
    drawChart();
    window.lvReportHeight && window.lvReportHeight();
  });

  document.getElementById('lv-model').addEventListener('click', function () {
    checked = true;
    ITEMS.forEach(function (it) {
      inputFor(it).value = it.at;
      verdictCell(it, it.at);
    });
    feedback.innerHTML = '<div class="lv-verdict is-ok"><strong>Model schedule shown.</strong> '
      + 'Every field now holds the model timing, with the reason beside it.</div>';
    drawChart();
    window.lvReportHeight && window.lvReportHeight();
  });

  document.getElementById('lv-reset').addEventListener('click', function () {
    checked = false;
    ITEMS.forEach(function (it) {
      inputFor(it).value = '';
      document.getElementById(it.id + '-verdict').innerHTML = '';
    });
    feedback.innerHTML = '';
    drawChart();
    inputFor(ITEMS[0]).focus();
    window.lvReportHeight && window.lvReportHeight();
  });

  form.addEventListener('input', function () { if (!checked) drawChart(); });

  drawChart();
})();
`;

  return page({ spec, a11y, main, script });
}

/** A tolerance of roughly 5% of the span, so an answer near enough counts. */
function defaultTolerance(spec) {
  const max = Math.max(...spec.items.map((i) => i.at));
  return Math.max(1, Math.round(max * 0.05));
}

export function describe(spec) {
  return {
    shape: `An interactive scheduling exercise. The learner is asked when each of ${spec.items.length} items should happen, in ${spec.timeUnit}, then checks their answers against the model timing.`,
    marks: 'Answers are typed into number fields. After checking, each row shows a tick or a cross, the model timing, and the reason for it. A chart plots the learner\'s answers as hollow circles and the model timings as filled diamonds.',
    structure: `A table with one row per item, followed by a time axis. ${spec.prompt}`,
    items: spec.items.map((it) => ({
      key: it.label,
      value: `model timing ${it.at} ${spec.timeUnit}. ${it.because}`,
    })),
    visibleText: [spec.prompt, spec.timeUnit, ...spec.items.map((i) => i.label)],
  };
}

/**
 * Simulation. A model the learner can push on.
 *
 * Two engines ship with the toolkit, chosen because they cover the two shapes
 * that come up constantly in course content: something orbiting under gravity,
 * and something compounding over time.
 *
 * The physics is real, not decorative. In the orbit engine the period comes
 * from Kepler's third law, so when a learner drags the star's mass and watches
 * the outer planet slow down, the relationship they are seeing is the one in
 * the textbook. A simulation that moves convincingly but computes nothing
 * teaches a learner to trust an animation, which is the opposite of the goal.
 *
 * Every simulation exposes `window.lvSeek(t)` with `t` from 0 to 1. That is
 * what lets the toolkit capture the same page as a deterministic MP4 for the
 * cases where an interactive cannot be hosted and a video has to do the job.
 */

import { page, safeJson } from './shell.js';
import { esc } from '../svg.js';

const ENGINES = {
  /* ---------------------------------------------------------------- */
  orbit(spec) {
    const bodies = (spec.bodies || []).map((b, i) => ({ ...b, index: i }));
    return {
      main: `
<div class="lv-controls" id="lv-controls"></div>

<h2 id="lv-stage-heading">The system</h2>
<p class="lv-sub" id="lv-stage-desc">Each planet moves at the speed its distance and the star's mass demand. Change the mass and watch which orbit changes most.</p>
<div class="lv-stage">
  <svg id="lv-stage" viewBox="0 0 720 460" role="img"
       aria-labelledby="lv-stage-heading" aria-describedby="lv-stage-desc"></svg>
</div>

<div class="lv-actions">
  <button type="button" id="lv-play">Pause</button>
  <button type="button" class="lv-secondary" id="lv-reset">Reset</button>
</div>

<div class="lv-readout">
  <table>
    <caption>Orbital period at the current star mass</caption>
    <thead>
      <tr>
        <th scope="col">Planet</th>
        <th scope="col">Distance (AU)</th>
        <th scope="col">Orbital period (years)</th>
        <th scope="col">Speed, relative to Earth</th>
      </tr>
    </thead>
    <tbody id="lv-readout-body"></tbody>
  </table>
</div>`,
      data: { bodies },
      engine: ORBIT_ENGINE,
    };
  },

  /* ---------------------------------------------------------------- */
  growth(spec) {
    void spec;
    return {
      main: `
<div class="lv-controls" id="lv-controls"></div>

<h2 id="lv-stage-heading">How the value changes</h2>
<p class="lv-sub" id="lv-stage-desc">The curve redraws as you move each control. The dashed line marks the starting value, so you can see when the total has doubled.</p>
<div class="lv-stage">
  <svg id="lv-stage" viewBox="0 0 720 400" role="img"
       aria-labelledby="lv-stage-heading" aria-describedby="lv-stage-desc"></svg>
</div>

<div class="lv-readout">
  <table>
    <caption>Value at each milestone</caption>
    <thead>
      <tr><th scope="col">After</th><th scope="col">Value</th><th scope="col">Growth so far</th></tr>
    </thead>
    <tbody id="lv-readout-body"></tbody>
  </table>
</div>`,
      data: {},
      engine: GROWTH_ENGINE,
    };
  },
};

/* -------------------------------------------------------------------- */
/* Shared browser-side helpers, inlined into every simulation page.       */
/* -------------------------------------------------------------------- */

const COMMON_JS = `
  var PARAMS = __PARAMS__;
  var DATA = __DATA__;
  var state = {};
  PARAMS.forEach(function (p) { state[p.key] = p.value; });

  var SERIES = ['#000054', '#00706b', '#a4177c', '#8a5a00', '#3d5566', '#5b3a8e'];
  var stage = document.getElementById('lv-stage');
  var readout = document.getElementById('lv-readout-body');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function round(v, dp) {
    var f = Math.pow(10, dp === undefined ? 2 : dp);
    return Math.round(v * f) / f;
  }

  /**
   * "1 solar masses" is wrong on screen, and a unit label is the one place a
   * learner will notice sloppiness. Singularise when the value is exactly one.
   */
  function unitFor(value, unit) {
    if (!unit) return '';
    if (value !== 1) return ' ' + unit;
    return ' ' + unit.replace(/(ss|ch|sh|x)es$/, '$1').replace(/([^se])s$/, '$1');
  }

  /**
   * A step on a 1, 2, 5 scale giving roughly 40 stops across the range.
   * Dividing the range by a round number instead lands the slider on values
   * like 1.0279999 solar masses, which is not a thing anyone wants to read.
   */
  function niceStep(range) {
    var rough = range / 40;
    var mag = Math.pow(10, Math.floor(Math.log10(rough)));
    var chosen = mag * 10;
    [1, 2, 2.5, 5, 10].some(function (m) {
      if (mag * m >= rough) { chosen = mag * m; return true; }
      return false;
    });
    return chosen;
  }

  /**
   * Build a labelled slider per parameter. A range input alone is not enough:
   * the current value is shown in an <output> so it is readable, and the
   * output is tied to the input so a screen reader announces it on change.
   */
  function buildControls() {
    var host = document.getElementById('lv-controls');
    host.innerHTML = PARAMS.map(function (p) {
      var stepAttr = p.step || niceStep(p.max - p.min);
      return '<div class="lv-control">'
        + '<label for="p-' + esc(p.key) + '">' + esc(p.label) + '</label>'
        + '<input type="range" id="p-' + esc(p.key) + '" min="' + p.min + '" max="' + p.max
        + '" step="' + stepAttr + '" value="' + p.value + '"'
        + ' aria-describedby="v-' + esc(p.key) + '">'
        + '<output id="v-' + esc(p.key) + '" for="p-' + esc(p.key) + '">'
        + p.value + esc(unitFor(p.value, p.unit)) + '</output>'
        + '</div>';
    }).join('');

    PARAMS.forEach(function (p) {
      var input = document.getElementById('p-' + p.key);
      var out = document.getElementById('v-' + p.key);
      input.addEventListener('input', function () {
        state[p.key] = Number(input.value);
        out.textContent = round(state[p.key], 3) + unitFor(round(state[p.key], 3), p.unit);
        render();
      });
    });
  }
`;

const ORBIT_ENGINE = `
  // Kepler's third law in solar units: T in years, a in AU, M in solar masses.
  // T = sqrt(a^3 / M). Earth at 1 AU around 1 solar mass gives T = 1 year.
  function periodOf(distance) {
    var m = state.mass !== undefined ? state.mass : 1;
    if (m <= 0) return Infinity;
    return Math.sqrt(Math.pow(distance, 3) / m);
  }

  var clock = 0;          // Simulated years elapsed.
  var running = true;
  var lastFrame = null;

  function outerPeriod() {
    return Math.max.apply(null, DATA.bodies.map(function (b) { return periodOf(b.distance); }));
  }

  /**
   * Orbit radii are drawn on a square-root scale, not a linear one.
   *
   * Drawn linearly with Jupiter at 5.2 AU setting the edge, Mercury at 0.39 AU
   * lands inside the star and Venus sits on its rim, so the four bodies the
   * lesson is about become invisible. Compressing the outer distances keeps
   * every orbit legible. It is a distortion, so the diagram says so on its face
   * and the text equivalent repeats it.
   */
  function radiusOf(distance, maxDist, maxR) {
    return (Math.sqrt(distance) / Math.sqrt(maxDist)) * maxR;
  }

  function render() {
    var W = 720, H = 460, cx = W / 2, cy = H / 2;
    var maxDist = Math.max.apply(null, DATA.bodies.map(function (b) { return b.distance; }));
    var maxR = Math.min(W, H) / 2 - 52;

    var s = '';
    s += '<rect width="' + W + '" height="' + H + '" fill="#fbfbfd"/>';

    // Orbit paths.
    DATA.bodies.forEach(function (b) {
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + round(radiusOf(b.distance, maxDist, maxR))
        + '" fill="none" stroke="#d5d5dd" stroke-width="1" stroke-dasharray="3 4"/>';
    });

    // The star. Its drawn size responds to mass so the control has a visible
    // effect even before anything has moved.
    var starR = 7 + 6 * Math.cbrt(Math.max(state.mass || 1, 0.01));
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + round(starR) + '" fill="#fac800" stroke="#8a5a00" stroke-width="2"/>';

    DATA.bodies.forEach(function (b, i) {
      var T = periodOf(b.distance);
      var angle = isFinite(T) && T > 0 ? (clock / T) * Math.PI * 2 : 0;
      var r = radiusOf(b.distance, maxDist, maxR);
      var x = cx + r * Math.cos(angle);
      var y = cy + r * Math.sin(angle);
      var colour = SERIES[i % SERIES.length];

      s += '<circle cx="' + round(x) + '" cy="' + round(y) + '" r="' + round(b.radius || 7) + '" fill="' + colour + '"/>';
      s += '<text x="' + round(x) + '" y="' + round(y - (b.radius || 7) - 6) + '" font-size="11.5" font-weight="bold" fill="' + colour + '" text-anchor="middle">'
        + esc(b.label) + '</text>';
    });

    var mass = round(state.mass, 2);
    s += '<text x="14" y="22" font-size="11.5" fill="#000054">Elapsed: ' + round(clock, 2) + ' years</text>';
    s += '<text x="' + (W - 14) + '" y="22" font-size="11.5" font-weight="bold" fill="#000054" text-anchor="end">Star: '
      + mass + ' solar mass' + (mass === 1 ? '' : 'es') + '</text>';
    // The distortion is stated on the picture itself, not only in the notes.
    s += '<text x="' + (W - 14) + '" y="' + (H - 12) + '" font-size="10.5" fill="#000054" text-anchor="end" opacity=".8">'
      + 'Orbit spacing on a square-root scale, so the inner planets stay visible. Not to scale.</text>';

    stage.innerHTML = s;

    readout.innerHTML = DATA.bodies.map(function (b) {
      var T = periodOf(b.distance);
      // Orbital speed goes as sqrt(M/a), expressed against Earth's 1 AU value.
      var rel = Math.sqrt((state.mass || 1) / b.distance);
      return '<tr><th scope="row">' + esc(b.label) + '</th><td>' + round(b.distance, 2)
        + '</td><td>' + (isFinite(T) ? round(T, 2).toFixed(2) : 'never completes')
        + '</td><td>' + round(rel, 2).toFixed(2) + '</td></tr>';
    }).join('');
  }

  /** Deterministic seek, used by the frame capturer. One outer orbit per loop. */
  window.lvSeek = function (t) {
    running = false;
    clock = t * outerPeriod();
    render();
  };

  function tick(now) {
    if (lastFrame === null) lastFrame = now;
    var dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (running) {
      // One outer orbit takes twelve seconds of wall time, whatever the scale.
      clock += dt * (outerPeriod() / 12);
      render();
    }
    requestAnimationFrame(tick);
  }

  var playBtn = document.getElementById('lv-play');
  playBtn.addEventListener('click', function () {
    running = !running;
    playBtn.textContent = running ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', String(!running));
  });
  document.getElementById('lv-reset').addEventListener('click', function () {
    clock = 0;
    PARAMS.forEach(function (p) {
      state[p.key] = p.value;
      var input = document.getElementById('p-' + p.key);
      var out = document.getElementById('v-' + p.key);
      if (input) input.value = p.value;
      if (out) out.textContent = p.value + unitFor(p.value, p.unit);
    });
    render();
  });

  // Honour the operating system setting. A learner who has asked for reduced
  // motion gets a still frame and the controls, not a spinning system.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    running = false;
    playBtn.textContent = 'Play';
  }

  buildControls();
  render();
  requestAnimationFrame(tick);
`;

const GROWTH_ENGINE = `
  function valueAt(n) {
    var initial = state.initial !== undefined ? state.initial : 100;
    var rate = (state.rate !== undefined ? state.rate : 5) / 100;
    return initial * Math.pow(1 + rate, n);
  }

  function render() {
    var W = 720, H = 400, L = 64, R = 18, T = 18, B = 46;
    var periods = Math.round(state.periods !== undefined ? state.periods : 10);
    var plotW = W - L - R, plotH = H - T - B;

    var values = [];
    for (var i = 0; i <= periods; i += 1) values.push(valueAt(i));
    var maxV = Math.max.apply(null, values);
    var niceMax = Math.pow(10, Math.floor(Math.log10(maxV)));
    niceMax = Math.ceil(maxV / niceMax) * niceMax;

    var x = function (i) { return L + (i / Math.max(periods, 1)) * plotW; };
    var y = function (v) { return T + plotH - (v / niceMax) * plotH; };

    var s = '<rect width="' + W + '" height="' + H + '" fill="#ffffff"/>';

    for (var g = 0; g <= 4; g += 1) {
      var gv = (niceMax / 4) * g;
      s += '<line x1="' + L + '" y1="' + round(y(gv)) + '" x2="' + (W - R) + '" y2="' + round(y(gv)) + '" stroke="#d5d5dd"/>';
      s += '<text x="' + (L - 8) + '" y="' + round(y(gv) + 4) + '" font-size="10.5" fill="#000054" text-anchor="end">' + round(gv, 0) + '</text>';
    }

    // Starting value, so doubling is readable off the picture.
    s += '<line x1="' + L + '" y1="' + round(y(values[0])) + '" x2="' + (W - R) + '" y2="' + round(y(values[0]))
      + '" stroke="#a4177c" stroke-width="1.5" stroke-dasharray="5 4"/>';
    s += '<text x="' + (W - R) + '" y="' + round(y(values[0]) - 6) + '" font-size="10.5" fill="#a4177c" text-anchor="end">Starting value</text>';

    var d = values.map(function (v, i) { return (i ? 'L' : 'M') + round(x(i)) + ',' + round(y(v)); }).join(' ');
    s += '<path d="' + d + '" fill="none" stroke="#000054" stroke-width="2.6" stroke-linejoin="round"/>';

    values.forEach(function (v, i) {
      if (periods <= 24 || i % Math.ceil(periods / 24) === 0) {
        s += '<circle cx="' + round(x(i)) + '" cy="' + round(y(v)) + '" r="3.4" fill="#ffffff" stroke="#000054" stroke-width="2"/>';
      }
    });

    for (var t = 0; t <= periods; t += Math.max(1, Math.round(periods / 8))) {
      s += '<text x="' + round(x(t)) + '" y="' + (H - B + 18) + '" font-size="10.5" fill="#000054" text-anchor="middle">' + t + '</text>';
    }
    s += '<text x="' + round(L + plotW / 2) + '" y="' + (H - 8) + '" font-size="11.5" font-weight="bold" fill="#000054" text-anchor="middle">Periods elapsed</text>';

    stage.innerHTML = s;

    var rate = (state.rate !== undefined ? state.rate : 5) / 100;
    var doubling = rate > 0 ? Math.log(2) / Math.log(1 + rate) : Infinity;
    var marks = [0, Math.round(periods / 2), periods];
    if (isFinite(doubling) && doubling <= periods) marks.push(Math.round(doubling));
    marks = marks.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });

    readout.innerHTML = marks.map(function (m) {
      var v = valueAt(m);
      var growth = values[0] ? ((v / values[0] - 1) * 100) : 0;
      return '<tr><th scope="row">' + m + ' period' + (m === 1 ? '' : 's')
        + (isFinite(doubling) && m === Math.round(doubling) && m > 0 ? ' (doubled)' : '')
        + '</th><td>' + round(v, 2) + '</td><td>' + round(growth, 1) + '%</td></tr>';
    }).join('');
  }

  // A static model, so seeking is a no-op beyond drawing the current state.
  window.lvSeek = function () { render(); };

  buildControls();
  render();
`;

export function build(spec, a11y) {
  const engine = ENGINES[spec.model];
  if (!engine) throw new Error(`Unknown simulation model "${spec.model}".`);
  const { main, data, engine: engineJs } = engine(spec);

  const script = '(function () {'
    + COMMON_JS
      .replace('__PARAMS__', safeJson(spec.parameters))
      .replace('__DATA__', safeJson(data))
    + engineJs
    + '})();';

  return page({ spec, a11y, main, script });
}

export function describe(spec) {
  const params = spec.parameters
    .map((p) => `${p.label}, adjustable from ${p.min} to ${p.max}${p.unit ? ` ${p.unit}` : ''}, starting at ${p.value}`)
    .join('. ');

  if (spec.model === 'orbit') {
    const bodies = spec.bodies || [];
    const mass = spec.parameters.find((p) => p.key === 'mass')?.value ?? 1;
    return {
      shape: `An interactive model of ${bodies.length} bodies orbiting a central star, with sliders that change the model and a table of results underneath.`,
      marks: 'The star is a yellow circle at the centre, drawn larger as its mass increases. Each orbit is a dashed circle. Each planet is a coloured dot labelled with its name. A table lists the orbital period of each body at the current star mass. Orbit spacing uses a square-root scale rather than a linear one, so that the inner planets remain visible alongside the outer ones. The spacing on screen is therefore not proportional to real distance, and the diagram says so. The distances in the table are the real ones.',
      structure: `Controls sit above the picture, the picture in the middle, the results table below. ${params}.`,
      items: [
        ...bodies.map((b) => ({
          key: b.label,
          value: `orbits at ${b.distance} astronomical units. At the starting star mass of ${mass} solar masses its orbital period is ${Math.round(Math.sqrt(Math.pow(b.distance, 3) / mass) * 100) / 100} years.`,
        })),
        {
          key: 'The relationship being shown',
          value: "Orbital period follows Kepler's third law: period equals the square root of distance cubed divided by the star's mass. Doubling the distance from the star multiplies the period by about 2.83. Increasing the star's mass shortens every period.",
        },
      ],
      visibleText: ['Star', ...bodies.map((b) => b.label), ...spec.parameters.map((p) => p.label), 'Planet', 'Distance (AU)', 'Orbital period (years)'],
    };
  }

  return {
    shape: 'An interactive growth model. A line chart redraws as the learner moves the controls.',
    marks: 'A navy line rises across the chart with a hollow circle at each period. A dashed magenta line marks the starting value so the point where the total has doubled can be read off.',
    structure: `Controls sit above the chart, the results table below. ${params}.`,
    items: [
      ...spec.parameters.map((p) => ({ key: p.label, value: `runs from ${p.min} to ${p.max}, starting at ${p.value}${p.unit ? ` ${p.unit}` : ''}` })),
      { key: 'The relationship being shown', value: 'Value equals the starting amount multiplied by one plus the rate, raised to the number of periods. Growth compounds, so the curve steepens rather than rising in a straight line.' },
    ],
    visibleText: ['Periods elapsed', 'Starting value', ...spec.parameters.map((p) => p.label)],
  };
}

/** Escape helper re-exported for the builder index. */
export { esc };

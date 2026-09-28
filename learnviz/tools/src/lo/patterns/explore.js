/**
 * Explore. Push on a model and watch what happens, with challenges.
 *
 * Why it works: an explorable explanation lets a learner feel a relationship
 * rather than read it. Dragging "target food cost" from 35 to 25 per cent and
 * watching the menu price jump teaches the formula faster than the formula.
 *
 * On its own a slider sandbox is a toy. What makes it a task is a challenge:
 * "set a price that keeps food cost under 30 per cent". Challenges are checked
 * live, in order, and the success message states the insight the learner has
 * just found for themselves.
 *
 * Three engines.
 *   formula  any arithmetic a teacher can write, evaluated by the safe
 *            expression language (no eval, so a strict CSP cannot break it)
 *   orbit    Kepler's third law, for orbital periods
 *   growth   compounding
 *
 * The validator proves every challenge can actually be met inside the slider
 * ranges, by trying every slider position when there are few enough to try. A
 * challenge that cannot be met is a learner dragging sliders until they give up.
 */

import { esc } from '../../svg.js';
import { accordion, nativeActivity, spacer } from '../native.js';
import { diagramBlock } from '../../emble.js';
import { createModel } from '../../runtime/expr.js';

export const meta = {
  label: 'Explore the model',
  verb: 'changes the inputs to a model and meets challenges',
  why: 'Changing an input and watching the result makes a relationship felt, and a challenge turns the sandbox into a task.',
  keys: 'Esc leave presenter view',
  scored: true,
  embleIcon: 'icon-target',
};

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const idFor = (label) => String(label).replace(/[^A-Za-z0-9_]/g, '_');

/** Build the Node-side evaluator for an engine: state in, every named value out. */
export function evaluator(s) {
  if (s.engine === 'formula') {
    const model = createModel()(s.parameters, s.outputs);
    return (state) => model(state);
  }
  if (s.engine === 'orbit') {
    return (state) => {
      const out = { ...state };
      for (const b of s.bodies) out[`period_${idFor(b.label)}`] = Math.sqrt(b.distance ** 3 / state.mass);
      return out;
    };
  }
  return (state) => {
    const r = state.rate / 100;
    const n = Math.round(state.periods);
    return { ...state, final: state.initial * (1 + r) ** n, doubling: r > 0 ? Math.log(2) / Math.log(1 + r) : Infinity };
  };
}

/** The names a challenge may refer to, per engine. */
function availableKeys(s) {
  const params = s.parameters.map((p) => p.key);
  if (s.engine === 'formula') return [...params, ...s.outputs.map((o) => o.key)];
  if (s.engine === 'orbit') return [...params, ...s.bodies.map((b) => `period_${idFor(b.label)}`)];
  return [...params, 'final', 'doubling'];
}

const stepOf = (p) => p.step ?? niceStep(p.max - p.min);
function niceStep(range) {
  const rough = range / 100;
  const mag = 10 ** Math.floor(Math.log10(rough));
  for (const m of [1, 2, 2.5, 5, 10]) if (mag * m >= rough) return mag * m;
  return mag * 10;
}

/** Slider settings a challenge insists on, each met to within half a slider step. */
function givenMet(c, state) {
  return (c.givenList || []).every((g) => Math.abs(state[g.key] - g.value) <= g.tol);
}

function meets(c, v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return false;
  if (c.target !== undefined) return Math.abs(v - c.target) <= c.tolerance;
  return (c.min === undefined || v >= c.min) && (c.max === undefined || v <= c.max);
}

/**
 * Try every combination of slider positions, if there are few enough, and
 * report whether any of them meets the challenge. Returns true, false, or null
 * when the space is too large to search exhaustively.
 */
function achievable(s, c, run) {
  const axes = s.parameters.map((p) => {
    const step = stepOf(p);
    const n = Math.floor((p.max - p.min) / step + 1e-9) + 1;
    return { p, step, n };
  });
  const total = axes.reduce((a, x) => a * x.n, 1);
  if (total > 250000) return null;
  const idx = axes.map(() => 0);
  for (let k = 0; k < total; k += 1) {
    const state = {};
    axes.forEach((a, i) => { state[a.p.key] = Math.min(a.p.max, a.p.min + idx[i] * a.step); });
    if (givenMet(c, state) && meets(c, run(state)[c.key])) return true;
    for (let i = 0; i < idx.length; i += 1) {
      idx[i] += 1;
      if (idx[i] < axes[i].n) break;
      idx[i] = 0;
    }
  }
  return false;
}

export function validate(s, h) {
  h.oneOf(s.engine, 'engine', ['formula', 'orbit', 'growth'], { what: 'engine' });
  const keys = new Set();
  const params = h.arr(s.parameters, 'parameters', { min: 1, max: 6 });
  params.forEach((p, i) => {
    h.str(p.key, `parameters[${i}].key`, { max: 30 });
    if (!IDENT.test(p.key)) h.fail(`parameters[${i}].key`, `"${p.key}" must be a plain name: letters, digits and underscores, not starting with a digit`);
    if (keys.has(p.key)) h.fail(`parameters[${i}].key`, `"${p.key}" is used twice`);
    keys.add(p.key);
    h.str(p.label, `parameters[${i}].label`, { max: 70 });
    h.num(p.min, `parameters[${i}].min`);
    h.num(p.max, `parameters[${i}].max`);
    h.num(p.value, `parameters[${i}].value`);
    h.num(p.step, `parameters[${i}].step`, { required: false });
    h.num(p.decimals, `parameters[${i}].decimals`, { required: false });
    h.str(p.unit, `parameters[${i}].unit`, { required: false, max: 30 });
    h.str(p.prefix, `parameters[${i}].prefix`, { required: false, max: 6 });
    if (p.min >= p.max) h.fail(`parameters[${i}]`, 'min must be less than max');
    if (p.value < p.min || p.value > p.max) h.fail(`parameters[${i}].value`, `must sit between ${p.min} and ${p.max}`);
    if (p.step !== undefined && p.step <= 0) h.fail(`parameters[${i}].step`, 'must be greater than zero');
  });

  if (s.engine === 'formula') {
    const outs = h.arr(s.outputs, 'outputs', { min: 1, max: 6 });
    outs.forEach((o, i) => {
      h.str(o.key, `outputs[${i}].key`, { max: 30 });
      if (!IDENT.test(o.key)) h.fail(`outputs[${i}].key`, `"${o.key}" must be a plain name`);
      if (keys.has(o.key)) h.fail(`outputs[${i}].key`, `"${o.key}" is already used by a parameter or another output`);
      keys.add(o.key);
      h.str(o.label, `outputs[${i}].label`, { max: 70 });
      h.str(o.expr, `outputs[${i}].expr`, { max: 300 });
      h.str(o.explain, `outputs[${i}].explain`, { required: false, max: 240 });
      h.str(o.unit, `outputs[${i}].unit`, { required: false, max: 30 });
      h.str(o.prefix, `outputs[${i}].prefix`, { required: false, max: 6 });
      h.num(o.decimals, `outputs[${i}].decimals`, { required: false });
    });
    let run;
    try {
      run = evaluator(s);
    } catch (e) {
      h.fail('outputs', e.message);
    }
    const start = run(Object.fromEntries(params.map((p) => [p.key, p.value])));
    for (const o of outs) {
      if (!Number.isFinite(start[o.key])) {
        h.fail(`outputs "${o.key}"`, `is not a number at the starting values (${start[o.key]}). Check for division by zero.`);
      }
    }
    if (s.plot !== undefined) {
      if (!params.some((p) => p.key === s.plot.x)) h.fail('plot.x', `must be a parameter key: ${params.map((p) => p.key).join(', ')}`);
      if (!outs.some((o) => o.key === s.plot.y)) h.fail('plot.y', `must be an output key: ${outs.map((o) => o.key).join(', ')}`);
    }
  }

  if (s.engine === 'orbit') {
    if (!params.some((p) => p.key === 'mass')) h.fail('parameters', 'the orbit engine needs a parameter with key "mass", in solar masses');
    const mass = params.find((p) => p.key === 'mass');
    if (mass.min <= 0) h.fail('parameters "mass".min', 'must be greater than zero; a star with no mass holds nothing in orbit');
    h.arr(s.bodies, 'bodies', { min: 1, max: 6 }).forEach((b, i) => {
      h.str(b.label, `bodies[${i}].label`, { max: 30 });
      h.num(b.distance, `bodies[${i}].distance`);
      if (b.distance <= 0) h.fail(`bodies[${i}].distance`, 'must be greater than zero');
      h.num(b.radius, `bodies[${i}].radius`, { required: false });
    });
  }

  if (s.engine === 'growth') {
    for (const k of ['initial', 'rate', 'periods']) {
      if (!params.some((p) => p.key === k)) h.fail('parameters', `the growth engine needs parameters "initial", "rate" (per cent per period) and "periods"; "${k}" is missing`);
    }
  }

  const available = availableKeys(s);
  const run = evaluator(s);
  const challenges = s.challenges === undefined ? [] : h.arr(s.challenges, 'challenges', { min: 0, max: 6 });
  const normalised = challenges.map((c, i) => {
    h.str(c.prompt, `challenges[${i}].prompt`, { max: 260 });
    h.str(c.hint, `challenges[${i}].hint`, { required: false, max: 260 });
    h.str(c.success, `challenges[${i}].success`, { max: 360 });
    if (!available.includes(c.key)) h.fail(`challenges[${i}].key`, `is "${c.key}". It must be one of: ${available.join(', ')}`);
    h.num(c.target, `challenges[${i}].target`, { required: false });
    h.num(c.min, `challenges[${i}].min`, { required: false });
    h.num(c.max, `challenges[${i}].max`, { required: false });
    h.num(c.tolerance, `challenges[${i}].tolerance`, { required: false });
    if (c.target === undefined && c.min === undefined && c.max === undefined) {
      h.fail(`challenges[${i}]`, 'needs a "target" (with an optional "tolerance"), or a "min" and/or "max"');
    }
    const out = { ...c };
    if (c.target !== undefined && c.tolerance === undefined) out.tolerance = Math.max(Math.abs(c.target) * 0.01, 1e-9);
    // "given": slider settings the challenge depends on, so "at $11 and 30 per
    // cent, what is the price?" is not met by some other pair that happens to
    // give the same price.
    if (c.given !== undefined) {
      if (!c.given || typeof c.given !== 'object' || Array.isArray(c.given)) h.fail(`challenges[${i}].given`, 'must be an object of slider keys and values, like { "cost": 11 }');
      out.givenList = Object.entries(c.given).map(([key, value]) => {
        const p = s.parameters.find((q) => q.key === key);
        if (!p) h.fail(`challenges[${i}].given.${key}`, `is not a slider. Sliders are: ${s.parameters.map((q) => q.key).join(', ')}`);
        h.num(value, `challenges[${i}].given.${key}`);
        if (value < p.min || value > p.max) h.fail(`challenges[${i}].given.${key}`, `is ${value}, outside the slider range ${p.min} to ${p.max}`);
        return { key, value, tol: stepOf(p) / 2 + 1e-9 };
      });
    }
    const ok = achievable(s, out, run);
    if (ok === false) {
      h.fail(`challenges[${i}]`, `cannot be met anywhere inside the slider ranges. Every combination of slider positions was tried. Widen a range, change the target, or loosen the tolerance.`);
    }
    return out;
  });
  return { challenges: normalised };
}

/* ------------------------------------------------------------------ */
/* Description and figure                                              */
/* ------------------------------------------------------------------ */

function fmtVal(v, o = {}) {
  if (!Number.isFinite(v)) return 'not defined';
  const dp = o.decimals ?? (Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0);
  return `${o.prefix || ''}${v.toLocaleString('en-AU', { minimumFractionDigits: dp, maximumFractionDigits: dp })}${o.unit ? `${o.unit === '%' ? '' : ' '}${o.unit}` : ''}`;
}

/** A handful of worked rows, computed at build time, for the text and native versions. */
function workedRows(s) {
  const run = evaluator(s);
  const base = Object.fromEntries(s.parameters.map((p) => [p.key, p.value]));
  const vary = s.engine === 'formula' && s.plot ? s.parameters.find((p) => p.key === s.plot.x) : s.parameters[0];
  const n = 5;
  const rows = [];
  for (let i = 0; i < n; i += 1) {
    const x = vary.min + ((vary.max - vary.min) * i) / (n - 1);
    const state = { ...base, [vary.key]: roundToStep(x, stepOf(vary)) };
    rows.push({ state, out: run(state) });
  }
  return { vary, rows };
}
function roundToStep(v, step) { return Math.round(v / step) * step; }

function outputsFor(s) {
  if (s.engine === 'formula') return s.outputs;
  if (s.engine === 'orbit') return s.bodies.map((b) => ({ key: `period_${idFor(b.label)}`, label: `${b.label}, orbital period`, unit: 'years', decimals: 2 }));
  return [{ key: 'final', label: 'Value at the end', decimals: 2 }, { key: 'doubling', label: 'Periods to double', decimals: 1 }];
}

export function describe(s) {
  const { vary, rows } = workedRows(s);
  const outs = outputsFor(s);
  const items = [
    ...s.parameters.map((p) => ({ key: `Input: ${p.label}`, value: `from ${fmtVal(p.min, p)} to ${fmtVal(p.max, p)}, starting at ${fmtVal(p.value, p)}` })),
    ...(s.engine === 'formula' ? s.outputs.map((o) => ({ key: `Output: ${o.label}`, value: o.explain || `calculated as ${o.expr}` })) : []),
    ...(s.engine === 'orbit' ? [{ key: 'The relationship', value: "Kepler's third law: orbital period in years is the square root of distance in astronomical units cubed, divided by the star's mass in solar masses." }] : []),
    ...(s.engine === 'growth' ? [{ key: 'The relationship', value: 'Value equals the starting amount times one plus the rate, raised to the number of periods. Growth compounds, so the curve steepens.' }] : []),
    ...rows.map((r) => ({
      key: `When ${vary.label} is ${fmtVal(r.state[vary.key], vary)}`,
      value: outs.map((o) => `${o.label} ${fmtVal(r.out[o.key], o)}`).join(', '),
    })),
    ...s.challenges.map((c, i) => ({ key: `Challenge ${i + 1}`, value: `${c.prompt} ${c.success}` })),
  ];
  return {
    shape: `An interactive model with ${s.parameters.length} slider${s.parameters.length === 1 ? '' : 's'}${s.challenges.length ? ` and ${s.challenges.length} challenges` : ''}.`,
    marks: s.engine === 'orbit'
      ? 'A star at the centre with planets orbiting it, moving at the speed the physics gives them. Orbit spacing is on a square-root scale so the inner planets stay visible, and the diagram says so. A table gives each orbital period.'
      : 'Sliders set the inputs. Large figures show the results, which update as the sliders move.' + (s.plot || s.engine === 'growth' ? ' A line chart shows how the result changes across the whole range of one input.' : ''),
    structure: 'Inputs first, results beside or below them, then the challenges in order.',
    items,
    visibleText: [...s.parameters.map((p) => p.label), ...outs.map((o) => o.label), ...s.challenges.map((c) => c.prompt)],
  };
}

export function figure(s) {
  const { vary, rows } = workedRows(s);
  if (s.engine === 'formula' && s.plot) {
    const y = s.outputs.find((o) => o.key === s.plot.y);
    const run = evaluator(s);
    const base = Object.fromEntries(s.parameters.map((p) => [p.key, p.value]));
    const n = 9;
    const xs = Array.from({ length: n }, (_, i) => roundToStep(vary.min + ((vary.max - vary.min) * i) / (n - 1), stepOf(vary)));
    const values = xs.map((x) => run({ ...base, [vary.key]: x })[y.key]);
    if (!values.every(Number.isFinite)) return null;
    return {
      type: 'chart', mode: 'line', title: s.title, intent: s.intent,
      xLabel: `${vary.label}${vary.unit ? ` (${vary.unit})` : ''}`,
      yLabel: `${y.label}${y.unit ? ` (${y.unit})` : ''}`,
      categories: xs.map((x) => fmtVal(x, { ...vary, unit: '' })),
      series: [{ label: y.label, values: values.map((v) => Math.round(v * 100) / 100) }],
    };
  }
  if (s.engine === 'growth') {
    const run = evaluator(s);
    const base = Object.fromEntries(s.parameters.map((p) => [p.key, p.value]));
    const periods = Math.round(base.periods);
    const xs = Array.from({ length: Math.min(periods, 20) + 1 }, (_, i) => Math.round((i * periods) / Math.min(periods, 20)));
    return {
      type: 'chart', mode: 'line', title: s.title, intent: s.intent,
      xLabel: 'Periods', yLabel: 'Value',
      categories: xs.map(String),
      series: [{ label: 'Value', values: xs.map((x) => Math.round(run({ ...base, periods: x }).final * 100) / 100) }],
    };
  }
  void rows;
  return null;
}

/* ------------------------------------------------------------------ */
/* Interactive                                                         */
/* ------------------------------------------------------------------ */

/* eslint-disable no-var, prefer-arrow-callback, func-names, no-param-reassign */
function client(D) {
  var LV = window.LV;
  var $ = function (id) { return document.getElementById(id); };
  var state = {};
  D.params.forEach(function (p) { state[p.key] = p.value; });
  var model = D.engine === 'formula' ? createModel()(D.params, D.outputs) : null;
  var touched = false;

  function scope() {
    if (D.engine === 'formula') return model(state);
    var sc = {};
    Object.keys(state).forEach(function (k) { sc[k] = state[k]; });
    if (D.engine === 'orbit') {
      D.bodies.forEach(function (b) { sc['period_' + b.id] = Math.sqrt(Math.pow(b.distance, 3) / state.mass); });
    } else {
      var r = state.rate / 100;
      sc.final = state.initial * Math.pow(1 + r, Math.round(state.periods));
      sc.doubling = r > 0 ? Math.log(2) / Math.log(1 + r) : Infinity;
    }
    return sc;
  }

  function fmtWith(v, o) {
    if (typeof v !== 'number' || !isFinite(v)) return 'not defined';
    return (o.prefix || '') + LV.fmt(v, o.decimals) + (o.unit ? (o.unit === '%' ? '' : ' ') + o.unit : '');
  }

  // Round tick values (1, 2, 2.5 or 5 times a power of ten) so every axis label is exact.
  function niceTicks(lo, hi, n) {
    var rough = (hi - lo) / n;
    var mag = Math.pow(10, Math.floor(Math.log10(rough)));
    var step = mag * 10;
    [1, 2, 2.5, 5, 10].some(function (m) { if (mag * m >= rough - 1e-12) { step = mag * m; return true; } return false; });
    var ticks = [];
    for (var v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-6; v += step) ticks.push(Number(v.toPrecision(12)));
    var st = Number(step.toPrecision(12));
    return { step: step, ticks: ticks, dp: st % 1 === 0 ? 0 : String(st).split('.')[1].length };
  }
  function axisName(o) {
    var u = o.unit || (o.prefix ? o.prefix.trim() : '');
    return o.label + (u ? ' (' + u + ')' : '');
  }

  /* ----- sliders ----- */
  D.params.forEach(function (p) {
    var r = $('lv-x-r-' + p.key);
    var out = $('lv-x-o-' + p.key);
    var sync = function () {
      state[p.key] = Number(r.value);
      var text = fmtWith(state[p.key], p);
      out.textContent = text;
      r.setAttribute('aria-valuetext', text);
    };
    r.addEventListener('input', function () { sync(); touched = true; update(true); });
    sync();
  });

  /* ----- outputs ----- */
  function renderOutputs(sc) {
    D.outs.forEach(function (o) {
      var el = $('lv-x-v-' + o.key);
      if (el) el.textContent = fmtWith(sc[o.key], o);
    });
  }

  /* ----- formula plot ----- */
  function renderPlot() {
    if (!D.plot) return;
    var svg = $('lv-x-plot');
    var xp = D.params.filter(function (p) { return p.key === D.plot.x; })[0];
    var yo = D.outs.filter(function (o) { return o.key === D.plot.y; })[0];
    var W = 760, H = 330, L = 70, R = 20, T = 40, B = 52;
    var pts = [];
    for (var i = 0; i <= 60; i += 1) {
      var saved = state[xp.key];
      state[xp.key] = xp.min + (xp.max - xp.min) * i / 60;
      var yv = model(state)[yo.key];
      pts.push([state[xp.key], yv]);
      state[xp.key] = saved;
    }
    var finite = pts.filter(function (q) { return isFinite(q[1]); });
    if (!finite.length) { svg.innerHTML = ''; return; }
    var ys = finite.map(function (q) { return q[1]; });
    var lo = Math.min(0, Math.min.apply(null, ys));
    var hi = Math.max.apply(null, ys);
    if (hi === lo) hi = lo + 1;
    var yt = niceTicks(lo, hi, 4);
    hi = Math.ceil(hi / yt.step - 1e-9) * yt.step;
    lo = Math.floor(lo / yt.step + 1e-9) * yt.step;
    yt = niceTicks(lo, hi, 4);
    var x = function (v) { return L + (v - xp.min) / (xp.max - xp.min) * (W - L - R); };
    var y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var s = '<text x="' + L + '" y="18" font-size="14" font-weight="bold" fill="#000054">' + LV.esc(axisName(yo)) + '</text>';
    yt.ticks.forEach(function (g) {
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="' + (Math.abs(g) < 1e-9 ? '#000054' : '#d9d9e6') + '"/>';
      s += '<text x="' + (L - 10) + '" y="' + (y(g) + 5) + '" font-size="14" text-anchor="end" fill="#000054">' + LV.fmt(g, yt.dp) + '</text>';
    });
    var xt = niceTicks(xp.min, xp.max, 5);
    xt.ticks.forEach(function (xv) {
      s += '<line x1="' + x(xv) + '" x2="' + x(xv) + '" y1="' + (H - B) + '" y2="' + (H - B + 5) + '" stroke="#000054"/>';
      s += '<text x="' + x(xv) + '" y="' + (H - B + 22) + '" font-size="14" text-anchor="middle" fill="#000054">' + LV.fmt(xv, xt.dp) + '</text>';
    });
    s += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 6) + '" font-size="14" font-weight="bold" text-anchor="middle" fill="#000054">' + LV.esc(axisName(xp)) + '</text>';
    var d = '';
    var pen = false;
    pts.forEach(function (q) {
      if (!isFinite(q[1])) { pen = false; return; }
      d += (pen ? 'L' : 'M') + x(q[0]).toFixed(1) + ',' + y(q[1]).toFixed(1) + ' ';
      pen = true;
    });
    s += '<path d="' + d + '" fill="none" stroke="#000054" stroke-width="3" stroke-linejoin="round"/>';
    var cy = model(state)[yo.key];
    if (isFinite(cy)) {
      s += '<line x1="' + x(state[xp.key]) + '" x2="' + x(state[xp.key]) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="#fac800" stroke-width="2"/>';
      s += '<circle cx="' + x(state[xp.key]) + '" cy="' + y(cy) + '" r="8" fill="#00706b" stroke="#fff" stroke-width="3"/>';
      var right = x(state[xp.key]) > W - 180;
      // Above the point, unless that would run into the axis title.
      var ly = y(cy) - 12 < T + 6 ? y(cy) + 28 : y(cy) - 12;
      s += '<text x="' + (x(state[xp.key]) + (right ? -14 : 14)) + '" y="' + ly + '" font-size="15" font-weight="bold" fill="#00706b" text-anchor="' + (right ? 'end' : 'start') + '" paint-order="stroke" stroke="#fff" stroke-width="4">' + LV.esc(fmtWith(cy, yo)) + '</text>';
    }
    svg.innerHTML = s;
    svg.setAttribute('aria-label', yo.label + ' across the range of ' + xp.label + '. At ' + fmtWith(state[xp.key], xp) + ', ' + yo.label + ' is ' + fmtWith(cy, yo) + '.');
  }

  /* ----- orbit ----- */
  var clock = 0;
  var running = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var last = null;
  function period(b) { return Math.sqrt(Math.pow(b.distance, 3) / state.mass); }
  function outerPeriod() { return Math.max.apply(null, D.bodies.map(period)); }
  function renderOrbit() {
    var svg = $('lv-x-orbit');
    var W = 560, H = 420, cx = W / 2, cy = H / 2 + 4;
    var maxD = Math.max.apply(null, D.bodies.map(function (b) { return b.distance; }));
    var maxR = Math.min(W, H) / 2 - 40;
    // Square-root spacing: drawn linearly, the inner planets vanish into the star.
    var rad = function (dist) { return Math.sqrt(dist) / Math.sqrt(maxD) * maxR; };
    var s = '<rect width="' + W + '" height="' + H + '" fill="#fbfbfd" rx="12"/>';
    D.bodies.forEach(function (b) { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad(b.distance).toFixed(1) + '" fill="none" stroke="#d9d9e6" stroke-dasharray="3 4"/>'; });
    var starR = 7 + 6 * Math.cbrt(Math.max(state.mass, 0.01));
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + starR.toFixed(1) + '" fill="#fac800" stroke="#8a5a00" stroke-width="2"/>';
    var colours = ['#000054', '#00706b', '#a4177c', '#8a5a00', '#1a56c4', '#a3301b'];
    D.bodies.forEach(function (b, i) {
      var a = clock / period(b) * Math.PI * 2;
      var r = rad(b.distance);
      var px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      var col = colours[i % colours.length];
      s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="' + (b.radius || 7) + '" fill="' + col + '"/>';
      s += '<text x="' + px.toFixed(1) + '" y="' + (py - (b.radius || 7) - 6).toFixed(1) + '" font-size="13" font-weight="bold" fill="' + col + '" text-anchor="middle">' + LV.esc(b.label) + '</text>';
    });
    s += '<text x="12" y="22" font-size="13" fill="#000054">Elapsed: ' + LV.fmt(clock, 2) + ' years</text>';
    s += '<text x="' + (W - 12) + '" y="' + (H - 12) + '" font-size="11.5" fill="#000054" text-anchor="end" opacity=".85">Orbit spacing on a square-root scale so inner planets stay visible. Not to scale.</text>';
    svg.innerHTML = s;
  }
  function tick(now) {
    if (last === null) last = now;
    var dt = (now - last) / 1000;
    last = now;
    if (running) { clock += dt * (outerPeriod() / 12); renderOrbit(); }
    window.requestAnimationFrame(tick);
  }
  if (D.engine === 'orbit') {
    var play = $('lv-x-play');
    play.textContent = running ? 'Pause' : 'Play';
    play.addEventListener('click', function () {
      running = !running;
      play.textContent = running ? 'Pause' : 'Play';
      play.setAttribute('aria-pressed', String(!running));
    });
    window.requestAnimationFrame(tick);
    window.lvSeek = function (t) { running = false; clock = t * outerPeriod(); renderOrbit(); };
  }

  /* ----- growth ----- */
  function renderGrowth(sc) {
    var svg = $('lv-x-growth');
    var W = 760, H = 330, L = 80, R = 20, T = 24, B = 52;
    var n = Math.round(state.periods);
    var vals = [];
    for (var i = 0; i <= n; i += 1) vals.push(state.initial * Math.pow(1 + state.rate / 100, i));
    var yt = niceTicks(0, Math.max.apply(null, vals) || 1, 4);
    var hi = yt.ticks[yt.ticks.length - 1] < Math.max.apply(null, vals) ? yt.ticks[yt.ticks.length - 1] + yt.step : yt.ticks[yt.ticks.length - 1];
    yt = niceTicks(0, hi, 4);
    var x = function (i) { return L + (n ? i / n : 0) * (W - L - R); };
    var y = function (v) { return T + (1 - v / hi) * (H - T - B); };
    var s = '';
    yt.ticks.forEach(function (gv) {
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(gv) + '" y2="' + y(gv) + '" stroke="' + (gv === 0 ? '#000054' : '#d9d9e6') + '"/><text x="' + (L - 10) + '" y="' + (y(gv) + 5) + '" font-size="14" text-anchor="end" fill="#000054">' + LV.fmt(gv, yt.dp) + '</text>';
    });
    var xt = niceTicks(0, Math.max(n, 1), 5);
    xt.ticks.forEach(function (tv) {
      if (tv % 1 !== 0) return;
      s += '<text x="' + x(tv) + '" y="' + (H - B + 22) + '" font-size="14" text-anchor="middle" fill="#000054">' + tv + '</text>';
    });
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(state.initial) + '" y2="' + y(state.initial) + '" stroke="#a4177c" stroke-dasharray="5 4" stroke-width="1.5"/>';
    s += '<text x="' + (W - R) + '" y="' + (y(state.initial) - 7) + '" font-size="13" fill="#a4177c" text-anchor="end">Starting value</text>';
    s += '<path d="' + vals.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ') + '" fill="none" stroke="#000054" stroke-width="3"/>';
    s += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 6) + '" font-size="14" font-weight="bold" text-anchor="middle" fill="#000054">Periods elapsed</text>';
    svg.innerHTML = s;
    svg.setAttribute('aria-label', 'Value over ' + n + ' periods. It ends at ' + LV.fmt(sc.final, 2) + '.');
  }

  /* ----- challenges ----- */
  var ci = 0;
  var met = D.challenges.map(function () { return false; });
  var list = $('lv-x-chal');
  function meets(c, v) {
    if (typeof v !== 'number' || !isFinite(v)) return false;
    var given = c.givenList || [];
    for (var g = 0; g < given.length; g += 1) if (Math.abs(state[given[g].key] - given[g].value) > given[g].tol) return false;
    if (typeof c.target === 'number') return Math.abs(v - c.target) <= c.tolerance;
    return (typeof c.min !== 'number' || v >= c.min) && (typeof c.max !== 'number' || v <= c.max);
  }
  function renderChallenges() {
    if (!list) return;
    list.innerHTML = D.challenges.map(function (c, i) {
      var state_ = met[i] ? 'is-done' : i === ci ? 'is-now' : 'is-later';
      var badge = met[i] ? '<span class="lv-tag is-ok">&#10003; Done</span>' : i === ci ? '<span class="lv-tag is-part">Now</span>' : '';
      return '<li class="lv-x-c ' + state_ + '"><p><strong>Challenge ' + (i + 1) + '.</strong> ' + LV.esc(c.prompt) + ' ' + badge + '</p>'
        + (met[i] ? '<p class="lv-x-win">' + LV.esc(c.success) + '</p>' : '')
        + (!met[i] && i === ci && c.hint ? '<details><summary>Hint</summary><p>' + LV.esc(c.hint) + '</p></details>' : '')
        + '</li>';
    }).join('');
    var done = met.filter(Boolean).length;
    $('lv-x-cbar').style.width = (D.challenges.length ? done / D.challenges.length * 100 : 0) + '%';
    $('lv-x-ccount').textContent = done + ' of ' + D.challenges.length + ' done';
  }
  function checkChallenge(sc) {
    if (ci >= D.challenges.length) return;
    var c = D.challenges[ci];
    if (!meets(c, sc[c.key])) return;
    met[ci] = true;
    LV.announce('Challenge ' + (ci + 1) + ' done. ' + c.success);
    ci += 1;
    renderChallenges();
    var done = met.filter(Boolean).length;
    LV.report({ complete: done === D.challenges.length, score: done / D.challenges.length });
    LV.reportHeight();
  }

  function update(fromUser) {
    var sc = scope();
    renderOutputs(sc);
    if (D.engine === 'formula') renderPlot();
    if (D.engine === 'orbit') { renderOrbit(); renderOutputs(sc); }
    if (D.engine === 'growth') renderGrowth(sc);
    if (fromUser) {
      if (D.challenges.length) checkChallenge(sc);
      else if (touched) LV.report({ complete: true, score: null });
    }
  }

  $('lv-x-reset').addEventListener('click', function () {
    D.params.forEach(function (p) {
      var r = $('lv-x-r-' + p.key);
      r.value = p.value;
      r.dispatchEvent(new Event('input'));
    });
  });

  renderChallenges();
  update(false);
}
/* eslint-enable */

const CSS = `
.lv-x-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 16px; align-items: start; }
@media (max-width: 760px) { .lv-x-grid { grid-template-columns: 1fr; } }
.lv-x-ctl { margin: 0 0 16px; }
.lv-x-ctl label { display: block; font-weight: 700; font-size: 14.5px; }
.lv-x-ctl output { display: block; font-size: 26px; font-weight: 800; letter-spacing: -.01em; margin: 2px 0 2px; }
.lv-x-outs { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin: 0 0 12px; }
.lv-x-out { background: var(--wash); border-radius: 12px; padding: 12px 14px; }
.lv-x-out-l { font-size: 13.5px; font-weight: 700; margin: 0 !important; }
.lv-x-out-v { font-size: 28px; font-weight: 800; letter-spacing: -.01em; margin: 2px 0 0 !important; }
.lv-x-out-e { font-size: 13px; color: var(--ink-soft); margin: 4px 0 0 !important; }
.lv-x-out.is-key { background: var(--ink); color: var(--paper); }
.lv-x-out.is-key .lv-x-out-e { color: #d6d6f0; }
.lv-x-svg { display: block; width: 100%; height: auto; }
.lv-x-stage { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); }
.lv-x-orbit { max-width: 600px; margin: 0 auto; }
.lv-x-orbit-ctl { justify-content: center; margin-top: 8px; }
.lv-x-table { width: 100%; border-collapse: collapse; font-size: 14.5px; margin-top: 10px; }
.lv-x-table th, .lv-x-table td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--line); }
.lv-x-table thead th { font-size: 12.5px; text-transform: uppercase; letter-spacing: .04em; }
.lv-x-chal { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.lv-x-c { border: 2px solid var(--line); border-radius: 12px; padding: 10px 14px; }
.lv-x-c p { margin: 0; }
.lv-x-c.is-now { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(250, 200, 0, .3); }
.lv-x-c.is-done { border-color: var(--ok); background: var(--ok-wash); }
.lv-x-c.is-later { opacity: .6; }
.lv-x-win { margin-top: 6px !important; }
.lv-x-c details { margin-top: 6px; font-size: 14.5px; }
.lv-x-c summary { cursor: pointer; font-weight: 700; }
html.lv-present .lv-x-out-v { font-size: 40px; }
html.lv-present .lv-x-ctl output { font-size: 34px; }
`;

export function interactive(s, ctx) {
  const outs = outputsFor(s);
  const sliders = s.parameters.map((p) => `
    <div class="lv-x-ctl">
      <label for="lv-x-r-${p.key}">${esc(p.label)}</label>
      <output id="lv-x-o-${p.key}" for="lv-x-r-${p.key}"></output>
      <input class="lv-range" type="range" id="lv-x-r-${p.key}" min="${p.min}" max="${p.max}" step="${stepOf(p)}" value="${p.value}">
    </div>`).join('');

  // Controls on the left, the numbers they drive on the right, and the
  // picture at full width underneath, where its labels can be read.
  let numbers = '';
  let stage = '';
  if (s.engine === 'formula') {
    numbers = `<div class="lv-x-outs">${s.outputs.map((o, i) => `
      <div class="lv-x-out${i === 0 ? ' is-key' : ''}"><p class="lv-x-out-l">${esc(o.label)}</p><p class="lv-x-out-v" id="lv-x-v-${o.key}"></p>${o.explain ? `<p class="lv-x-out-e">${esc(o.explain)}</p>` : ''}</div>`).join('')}
    </div>`;
    stage = s.plot ? '<svg class="lv-x-svg" id="lv-x-plot" viewBox="0 0 760 330" role="img" aria-label=""></svg>' : '';
  } else if (s.engine === 'orbit') {
    numbers = `<table class="lv-x-table"><thead><tr><th scope="col">Planet</th><th scope="col">Distance (AU)</th><th scope="col">Orbital period</th></tr></thead>
    <tbody>${s.bodies.map((b) => `<tr><th scope="row">${esc(b.label)}</th><td>${Number(b.distance).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td id="lv-x-v-period_${idFor(b.label)}"></td></tr>`).join('')}</tbody></table>`;
    stage = `<svg class="lv-x-svg lv-x-orbit" id="lv-x-orbit" viewBox="0 0 560 420" role="img" aria-label="Planets orbiting a star. The table gives each orbital period at the current star mass."></svg>
    <div class="lv-actions lv-x-orbit-ctl"><button type="button" class="lv-btn is-secondary" id="lv-x-play" aria-pressed="false">Pause</button></div>`;
  } else {
    numbers = `<div class="lv-x-outs">${outs.map((o, i) => `<div class="lv-x-out${i === 0 ? ' is-key' : ''}"><p class="lv-x-out-l">${esc(o.label)}</p><p class="lv-x-out-v" id="lv-x-v-${o.key}"></p></div>`).join('')}</div>`;
    stage = '<svg class="lv-x-svg" id="lv-x-growth" viewBox="0 0 760 330" role="img" aria-label=""></svg>';
  }

  const challenges = s.challenges.length ? `
<section class="lv-card" aria-labelledby="lv-x-ch">
  <h2 id="lv-x-ch">Challenges</h2>
  <div class="lv-progress"><span id="lv-x-ccount"></span><div class="lv-bar"><span id="lv-x-cbar"></span></div></div>
  <ol class="lv-x-chal" id="lv-x-chal" aria-live="off"></ol>
</section>` : '';

  const body = `
<div class="lv-card">
  <div class="lv-x-grid">
    <div>${sliders}
      <div class="lv-actions"><button type="button" class="lv-btn is-ghost" id="lv-x-reset">Reset the sliders</button></div>
    </div>
    <div>${numbers}</div>
  </div>
  ${stage ? `<div class="lv-x-stage">${stage}</div>` : ''}
</div>
${challenges}`;

  const data = {
    engine: s.engine,
    params: s.parameters,
    outputs: s.outputs || [],
    outs,
    plot: s.plot || null,
    bodies: (s.bodies || []).map((b) => ({ ...b, id: idFor(b.label) })),
    challenges: s.challenges,
  };
  return {
    body,
    css: CSS,
    needsExpr: s.engine === 'formula',
    script: `(${client.toString()})(${ctx.safeJson(data)});`,
  };
}

export function native(s, ctx) {
  const { vary, rows } = workedRows(s);
  const outs = outputsFor(s);
  const how = s.engine === 'formula'
    ? `<ul>${s.outputs.map((o) => `<li><strong>${esc(o.label)}.</strong> ${esc(o.explain || o.expr)}</li>`).join('')}</ul>`
    : s.engine === 'orbit'
      ? "<p>Orbital period in years is the square root of the distance from the star in astronomical units, cubed, divided by the star's mass in solar masses.</p>"
      : '<p>Each period, the value grows by the rate. Growth compounds: each period grows on the last one, not on the starting amount.</p>';
  const table = `<table style="border-collapse: collapse; width: 95%; border-color: #000054; border-style: solid;" border="0.5px">
    <thead><tr><th scope="col" style="background-color: #f2f2f2; color: #000054; padding: 6px;">${esc(vary.label)}</th>${outs.map((o) => `<th scope="col" style="background-color: #f2f2f2; color: #000054; padding: 6px;">${esc(o.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr><th scope="row" style="padding: 6px;">${esc(fmtVal(r.state[vary.key], vary))}</th>${outs.map((o) => `<td style="padding: 6px;">${esc(fmtVal(r.out[o.key], o))}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
  const instructions = `<p><strong>How it works.</strong></p>${how}<p>Here is what happens as ${esc(vary.label.toLowerCase())} changes, with everything else at its starting value.</p>${table}`;
  const chal = s.challenges.map((c, i) => accordion(`Challenge ${i + 1}: ${c.prompt}`, `${c.hint ? `<p><strong>Hint.</strong> ${esc(c.hint)}</p>` : ''}<p><strong>What you should find.</strong> ${esc(c.success)}</p>`)).join('\n');
  const fig = ctx.figureA11y ? diagramBlock({ a11y: ctx.figureA11y }) : '';
  return nativeActivity({
    title: `Explore: ${s.title}`,
    iconClass: meta.embleIcon,
    instructions,
    content: `${fig}\n${chal}${chal ? `\n${spacer}` : ''}`,
  });
}

export function teach(s) {
  return {
    placement: 'during',
    before: 'Set the first challenge before class, so learners arrive having already pushed on the model once.',
    during: 'Put it up in presenter view and ask the room to predict, before you move a slider, which way the result will go and by roughly how much. Then move it. Work through the challenges together, asking someone to direct you.',
    after: 'Set the remaining challenges as individual practice. The score is the proportion of challenges completed.',
    presenter: ['Move the sliders with the mouse, or focus one and use the arrow keys for fine steps.', ...(s.engine === 'orbit' ? ['Pause stops the animation while you talk.'] : [])],
  };
}

export function answerKey(s) {
  return s.challenges.map((c) => ({
    prompt: c.prompt,
    answer: c.target !== undefined ? `${c.key} within ${c.tolerance} of ${c.target}` : `${c.key}${c.min !== undefined ? ` at least ${c.min}` : ''}${c.max !== undefined ? ` at most ${c.max}` : ''}`,
    why: c.success,
  }));
}

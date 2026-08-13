/**
 * Chart. Quantities, as grouped bars or lines.
 *
 * Two decisions here are pedagogical rather than aesthetic.
 *
 * 1. The y axis includes zero whenever the data is all non-negative. A truncated
 *    axis makes a 2% change look like a doubling, and a learner meeting a chart
 *    in a course has no reason to suspect the axis of lying to them.
 * 2. Series are told apart by pattern and by direct labelling, not by hue alone.
 */

import { BRAND, TYPE, series } from '../theme.js';
import { el, text, textBlock, measure, n, roundRect } from '../svg.js';
import { PAGE, header, footer, contentWidth, legend } from './frame.js';

const PLOT_H = 300;
const AXIS_PAD = 12;

function niceStep(span) {
  const rough = span / 6;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (magnitude * m >= rough) return magnitude * m;
  }
  return magnitude * 10;
}

function fmt(v) {
  const r = Math.round(v * 1000) / 1000;
  return Math.abs(r) >= 10000 ? r.toLocaleString('en-AU') : String(r);
}

/** Compute axis bounds that include zero where honest, and land on round ticks. */
function bounds(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  let lo = min >= 0 ? 0 : min;
  let hi = max <= 0 ? 0 : max;
  if (lo === hi) hi = lo + 1;
  const step = niceStep(hi - lo);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  return { lo, hi, step };
}

export function render(spec, width = PAGE.width) {
  const head = header(spec, width);
  const all = spec.series.flatMap((s) => s.values);
  const { lo, hi, step } = bounds(all);

  // Gutter sized to the widest tick label so nothing collides.
  const tickLabels = [];
  for (let v = lo; v <= hi + 1e-9; v += step) tickLabels.push(fmt(v));
  const gutter = Math.max(...tickLabels.map((t) => measure(t, TYPE.small))) + 14
    + (spec.yLabel ? TYPE.small + 8 : 0);

  const x0 = PAGE.margin + gutter;
  const plotW = contentWidth(width) - gutter;
  const top = head.height;
  const bottom = top + PLOT_H;

  const yOf = (v) => bottom - ((v - lo) / (hi - lo)) * PLOT_H;
  const bandW = plotW / spec.categories.length;

  let body = head.svg;

  // Y axis title, rotated.
  if (spec.yLabel) {
    const cy = top + PLOT_H / 2;
    body += `<g transform="translate(${n(PAGE.margin + TYPE.small)},${n(cy)}) rotate(-90)">`
      + text(spec.yLabel, { x: 0, y: 0, size: TYPE.small, weight: 'bold', fill: BRAND.ink, anchor: 'middle' })
      + '</g>';
  }

  // Gridlines and y ticks.
  for (let v = lo; v <= hi + 1e-9; v += step) {
    const gy = yOf(v);
    const isZero = Math.abs(v) < 1e-9;
    body += el.line({
      x1: x0, y1: gy, x2: x0 + plotW, y2: gy,
      stroke: isZero ? BRAND.ink : BRAND.rule,
      'stroke-width': isZero ? 1.5 : 1,
    });
    body += text(fmt(v), {
      x: x0 - 8, y: gy + 4, size: TYPE.small, fill: BRAND.ink, anchor: 'end', opacity: 0.9,
    });
  }

  if (spec.mode === 'bar') {
    const groupPad = bandW * 0.18;
    const barW = (bandW - groupPad * 2) / spec.series.length;

    for (const [si, se] of spec.series.entries()) {
      const colour = series(si);
      for (const [ci, value] of se.values.entries()) {
        const bx = x0 + ci * bandW + groupPad + si * barW;
        const yTop = yOf(Math.max(value, 0));
        const yBase = yOf(0);
        const h = Math.abs(yBase - yTop);
        if (h < 0.5) continue;
        body += `<path d="${roundRect(bx + 1, Math.min(yTop, yBase), barW - 2, h, 3)}" fill="${colour.fill}"/>`;
        if (colour.pattern !== 'solid') {
          body += `<path d="${roundRect(bx + 1, Math.min(yTop, yBase), barW - 2, h, 3)}" fill="url(#lv-${colour.pattern})"/>`;
        }
        // Value on top of the bar when the group is not too crowded.
        if (spec.series.length <= 2 && barW > 26) {
          body += text(fmt(value), {
            x: bx + barW / 2, y: Math.min(yTop, yBase) - 5,
            size: TYPE.small, fill: BRAND.ink, anchor: 'middle',
          });
        }
      }
    }
  } else {
    for (const [si, se] of spec.series.entries()) {
      const colour = series(si);
      const points = se.values.map((v, ci) => ({
        x: x0 + ci * bandW + bandW / 2,
        y: yOf(v),
      }));
      const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${n(p.x)},${n(p.y)}`).join(' ');
      body += el.path({
        d, fill: 'none', stroke: colour.fill, 'stroke-width': 2.6,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      });
      // Distinct marker per series: another non-colour channel.
      for (const p of points) {
        body += si % 2 === 0
          ? el.circle({ cx: p.x, cy: p.y, r: 4, fill: BRAND.paper, stroke: colour.fill, 'stroke-width': 2.2 })
          : el.rect({ x: p.x - 3.6, y: p.y - 3.6, width: 7.2, height: 7.2, fill: BRAND.paper, stroke: colour.fill, 'stroke-width': 2.2 });
      }
      // Direct labelling at the end of the line beats a legend when it fits.
      const last = points[points.length - 1];
      if (measure(se.label, TYPE.small, 'bold') + last.x + 10 < PAGE.margin + contentWidth(width)) {
        body += text(se.label, {
          x: last.x + 9, y: last.y + 4, size: TYPE.small, weight: 'bold', fill: colour.fill,
        });
      }
    }
  }

  // Category axis.
  body += el.line({ x1: x0, y1: bottom, x2: x0 + plotW, y2: bottom, stroke: BRAND.ink, 'stroke-width': 1.5 });

  let labelBottom = bottom + AXIS_PAD;
  const widest = Math.max(...spec.categories.map((c) => measure(String(c), TYPE.small)));
  const rotate = widest > bandW - 6;

  for (const [ci, cat] of spec.categories.entries()) {
    const cx = x0 + ci * bandW + bandW / 2;
    if (rotate) {
      body += `<g transform="translate(${n(cx)},${n(bottom + AXIS_PAD)}) rotate(-38)">`
        + text(String(cat), { x: 0, y: 0, size: TYPE.small, fill: BRAND.ink, anchor: 'end' })
        + '</g>';
    } else {
      body += text(String(cat), {
        x: cx, y: bottom + AXIS_PAD + TYPE.small - 2, size: TYPE.small, fill: BRAND.ink, anchor: 'middle',
      });
    }
  }
  labelBottom += rotate ? widest * 0.62 + 8 : TYPE.small + 4;

  if (spec.xLabel) {
    labelBottom += TYPE.small + 6;
    body += text(spec.xLabel, {
      x: x0 + plotW / 2, y: labelBottom, size: TYPE.small, weight: 'bold',
      fill: BRAND.ink, anchor: 'middle',
    });
  }

  let cursor = labelBottom + 16;

  // A bar chart always needs a legend. A line chart is directly labelled, so it
  // only gets one when there are enough series for the labels to crowd.
  if (spec.mode === 'bar' && spec.series.length > 1) {
    const lg = legend(
      spec.series.map((s, i) => ({ label: s.label, colour: series(i) })),
      PAGE.margin, cursor, contentWidth(width),
    );
    body += lg.svg;
    cursor += lg.height + 6;
  }

  const foot = footer(spec, cursor, width);
  body += foot.svg;
  cursor += foot.height;

  return { body, width, height: cursor + PAGE.margin };
}

export function describe(spec) {
  const all = spec.series.flatMap((s) => s.values);
  const { lo, hi } = bounds(all);
  const maxIdx = all.indexOf(Math.max(...all));
  void maxIdx;

  return {
    shape: spec.mode === 'bar'
      ? `A grouped bar chart with ${spec.categories.length} categories along the bottom and ${spec.series.length} bar${spec.series.length === 1 ? '' : 's'} per category.`
      : `A line chart with ${spec.series.length} line${spec.series.length === 1 ? '' : 's'} across ${spec.categories.length} points.`,
    marks: spec.mode === 'bar'
      ? 'Each series has its own colour and its own texture, so the bars can be told apart without relying on colour.'
      : 'Each line has its own colour and its own marker shape, circles or squares, and is labelled at its right-hand end.',
    structure: `The vertical axis${spec.yLabel ? ` shows ${spec.yLabel} and` : ''} runs from ${fmt(lo)} to ${fmt(hi)}${lo === 0 ? ', starting at zero' : ''}. The horizontal axis${spec.xLabel ? ` shows ${spec.xLabel} and` : ''} lists: ${spec.categories.join(', ')}.`,
    items: spec.series.flatMap((s) =>
      spec.categories.map((c, i) => ({
        key: `${s.label}, ${c}`,
        value: fmt(s.values[i]),
      }))),
    visibleText: [
      ...(spec.yLabel ? [spec.yLabel] : []),
      ...(spec.xLabel ? [spec.xLabel] : []),
      ...spec.categories.map(String),
      ...spec.series.map((s) => s.label),
    ],
  };
}

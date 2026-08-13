/**
 * Gantt. Tasks placed on a shared time axis, free to overlap.
 *
 * This is the workhorse for "what happens when, alongside what else". It is the
 * answer to "which ingredient goes in the pot at which minute" and to "which
 * project workstreams run in parallel". Overlap is the thing being taught, so
 * every task keeps its own row and the axis is shared.
 */

import { BRAND, TYPE, series } from '../theme.js';
import { el, text, textBlock, measure, ellipsize, roundRect, n } from '../svg.js';
import { PAGE, header, footer, contentWidth, legend } from './frame.js';

const ROW_H = 30;
const ROW_GAP = 6;
const BAR_H = 20;
const LABEL_MAX = 250;
const LABEL_PAD = 14;

/** Choose a tick interval that yields roughly 6 to 10 gridlines on a 1-2-5 scale. */
function tickStep(span) {
  const rough = span / 8;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (magnitude * m >= rough) return magnitude * m;
  }
  return magnitude * 10;
}

/** Format a tick so 2.5 stays 2.5 but 3.0000000001 becomes 3. */
function fmt(v) {
  return String(Math.round(v * 1000) / 1000);
}

export function render(spec, width = PAGE.width) {
  const head = header(spec, width);
  const tasks = spec.tasks;
  const milestones = spec.milestones || [];

  const dataEnd = Math.max(
    ...tasks.map((t) => t.start + t.duration),
    ...milestones.map((m) => m.at),
  );
  const spanStart = Math.min(0, ...tasks.map((t) => t.start));

  // Extend the axis to the next round tick past the data. Without this a task
  // that finishes at the maximum draws hard against the right margin, which
  // reads as though it has been cut off, and the final tick never appears.
  const step = tickStep((dataEnd - spanStart) || 1);
  const spanEnd = Math.ceil((dataEnd + step * 0.08) / step) * step;
  const span = spanEnd - spanStart || 1;

  // The label gutter is sized to the longest label, capped so the chart keeps
  // most of the width.
  //
  // The ceil matters. The gutter is longest + LABEL_PAD and the budget given to
  // ellipsize is gutter - LABEL_PAD, and in floating point that round trip does
  // not always return the number it started from. Without the ceil the single
  // longest label fails its own budget by an epsilon and gets an ellipsis put
  // through it, which is exactly the label you least want shortened.
  const longest = Math.max(...tasks.map((t) => measure(t.label, TYPE.label, 'bold')));
  const labelW = Math.min(Math.max(Math.ceil(longest) + LABEL_PAD, 110), LABEL_MAX);

  const plotX = PAGE.margin + labelW;
  const plotW = contentWidth(width) - labelW;
  const scale = (v) => plotX + ((v - spanStart) / span) * plotW;

  // Tracks give tasks their colour and drive the legend. Without tracks every
  // bar shares one colour, which is correct: colour should only vary when it
  // means something.
  const trackNames = [...new Set(tasks.map((t) => t.track).filter(Boolean))];
  const trackColour = (t) => (t.track ? series(trackNames.indexOf(t.track)) : series(0));

  // The axis unit sits on its own line above the tick numbers. Put them on the
  // same line and the unit runs straight into the first tick label.
  const top = head.height + 42;
  let body = head.svg;

  body += text(spec.timeUnit, {
    x: plotX, y: top - 26, size: TYPE.small, weight: 'bold', fill: BRAND.ink,
  });

  const plotH = tasks.length * (ROW_H + ROW_GAP);

  // Gridlines and tick labels, drawn first so bars sit on top.
  const firstTick = Math.ceil(spanStart / step) * step;
  for (let v = firstTick; v <= spanEnd + 1e-9; v += step) {
    const gx = scale(v);
    body += el.line({
      x1: gx, y1: top, x2: gx, y2: top + plotH,
      stroke: BRAND.rule, 'stroke-width': 1,
    });
    body += text(fmt(v), {
      x: gx, y: top - 10, size: TYPE.small, fill: BRAND.ink, anchor: 'middle', opacity: 0.85,
    });
  }

  // Bars.
  for (const [i, task] of tasks.entries()) {
    const y = top + i * (ROW_H + ROW_GAP);
    const barY = y + (ROW_H - BAR_H) / 2;
    const x1 = scale(task.start);
    const x2 = scale(task.start + task.duration);
    const w = Math.max(x2 - x1, 3);
    const colour = trackColour(task);

    // Zebra banding helps the eye track from label to bar across a wide chart.
    if (i % 2 === 1) {
      body += el.rect({
        x: PAGE.margin, y: y - ROW_GAP / 2, width: contentWidth(width), height: ROW_H + ROW_GAP,
        fill: BRAND.ink, opacity: 0.035,
      });
    }

    body += text(ellipsize(task.label, labelW - LABEL_PAD, TYPE.label, 'bold'), {
      x: PAGE.margin, y: y + ROW_H / 2 + 4.5, size: TYPE.label, weight: 'bold', fill: BRAND.ink,
    });

    body += `<path d="${roundRect(x1, barY, w, BAR_H, 4)}" fill="${colour.fill}"/>`;
    if (colour.pattern && colour.pattern !== 'solid') {
      body += `<path d="${roundRect(x1, barY, w, BAR_H, 4)}" fill="url(#lv-${colour.pattern})"/>`;
    }

    // The timing is the lesson, so it is printed rather than left to be read
    // off the axis. Inside the bar when it fits, just after it when it does not.
    const stamp = `${fmt(task.start)} to ${fmt(task.start + task.duration)}`;
    const stampW = measure(stamp, TYPE.small, 'bold');
    if (stampW + 14 < w) {
      body += text(stamp, {
        x: x1 + 7, y: barY + BAR_H / 2 + 4, size: TYPE.small, weight: 'bold', fill: colour.on,
      });
    } else if (x2 + stampW + 8 < PAGE.margin + contentWidth(width)) {
      body += text(stamp, {
        x: x2 + 6, y: barY + BAR_H / 2 + 4, size: TYPE.small, fill: BRAND.ink, opacity: 0.8,
      });
    }
  }

  let cursor = top + plotH + 10;

  // Milestones run the full height of the plot as dashed verticals.
  for (const m of milestones) {
    const mx = scale(m.at);
    body += el.line({
      x1: mx, y1: top - 4, x2: mx, y2: top + plotH + 4,
      stroke: series(2).fill, 'stroke-width': 2, 'stroke-dasharray': '5 4',
    });
    body += el.polygon({
      points: `${n(mx)},${n(top - 5)} ${n(mx - 5)},${n(top - 13)} ${n(mx + 5)},${n(top - 13)}`,
      fill: series(2).fill,
    });
  }
  if (milestones.length) {
    cursor += 6;
    for (const m of milestones) {
      const block = textBlock(`${fmt(m.at)} ${spec.timeUnit}: ${m.label}`, {
        x: PAGE.margin + 14, y: cursor + TYPE.small, width: contentWidth(width) - 14, size: TYPE.small, fill: BRAND.ink,
      });
      body += el.polygon({
        points: `${n(PAGE.margin + 5)},${n(cursor + TYPE.small - 9)} ${n(PAGE.margin)},${n(cursor + TYPE.small - 2)} ${n(PAGE.margin + 10)},${n(cursor + TYPE.small - 2)}`,
        fill: series(2).fill,
      });
      body += block.svg;
      cursor += block.height + 4;
    }
  }

  if (trackNames.length > 1) {
    cursor += 10;
    const lg = legend(
      trackNames.map((t, i) => ({ label: t, colour: series(i) })),
      PAGE.margin, cursor, contentWidth(width),
    );
    body += lg.svg;
    cursor += lg.height;
  }

  // Notes carry the "why this timing" that makes the chart teach rather than
  // just schedule.
  const noted = tasks.filter((t) => t.note);
  if (noted.length) {
    cursor += 8;
    for (const t of noted) {
      const block = textBlock(`${t.label}: ${t.note}`, {
        x: PAGE.margin, y: cursor + TYPE.small, width: contentWidth(width), size: TYPE.small, fill: BRAND.ink,
      });
      body += `<g opacity="0.85">${block.svg}</g>`;
      cursor += block.height + 4;
    }
  }

  cursor += 10;
  const foot = footer(spec, cursor, width);
  body += foot.svg;
  cursor += foot.height;

  return { body, width, height: cursor + PAGE.margin };
}

export function describe(spec) {
  const tasks = spec.tasks;
  const end = Math.max(...tasks.map((t) => t.start + t.duration));
  const trackNames = [...new Set(tasks.map((t) => t.track).filter(Boolean))];

  return {
    shape: `A horizontal schedule chart. Time runs left to right along the top, measured in ${spec.timeUnit}, from 0 to ${end}.`,
    marks: `Each row is one item, named on the left. A coloured bar shows when it starts and how long it lasts, with the start and end times printed on the bar.${(spec.milestones || []).length ? ' Dashed vertical lines mark key moments.' : ''}`,
    structure: `${tasks.length} rows, one per item.${trackNames.length > 1 ? ` Bars are coloured by group: ${trackNames.join(', ')}.` : ''} Bars that overlap vertically are happening at the same time.`,
    items: tasks.map((t) => ({
      key: t.label,
      value: `starts at ${t.start} ${spec.timeUnit}, runs for ${t.duration}, finishing at ${t.start + t.duration}${t.track ? ` (${t.track})` : ''}${t.note ? `. ${t.note}` : ''}`,
    })),
    visibleText: [
      spec.timeUnit,
      ...tasks.map((t) => t.label),
      ...trackNames,
      ...(spec.milestones || []).map((m) => m.label),
    ],
  };
}

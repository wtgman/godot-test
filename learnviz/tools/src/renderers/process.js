/**
 * Process. Ordered steps with a beginning and an end.
 *
 * Layout adapts to the number of steps. Up to five, a single left-to-right row
 * reads as a flow at a glance. Beyond that the boxes get too narrow to hold a
 * real label, so it switches to a stacked list. Both carry numbered badges and
 * arrows, which is what separates a process from a timeline: order that the
 * learner controls, not dates that already happened.
 */

import { BRAND, TYPE, series } from '../theme.js';
import { el, text, textBlock, roundRect, n } from '../svg.js';
import { PAGE, header, footer, contentWidth, arrow } from './frame.js';

const ROW_LIMIT = 5;
const GAP = 18;
const PAD = 14;
const BADGE_R = 13;

function badge(cx, cy, label) {
  const colour = series(0);
  return el.circle({ cx, cy, r: BADGE_R, fill: colour.fill })
    + text(String(label), {
      x: cx, y: cy + 4.5, size: TYPE.small, weight: 'bold',
      fill: colour.on, anchor: 'middle',
    });
}

function renderRow(spec, width) {
  const head = header(spec, width);
  const steps = spec.steps;
  const total = contentWidth(width);
  const boxW = (total - GAP * (steps.length - 1)) / steps.length;
  const innerW = boxW - PAD * 2;

  // Every box is sized to the tallest, so the row reads as one band.
  const laid = steps.map((s) => {
    const label = textBlock(s.label, { width: innerW, size: TYPE.body, weight: 'bold' });
    const detail = s.detail
      ? textBlock(s.detail, { width: innerW, size: TYPE.label })
      : { svg: '', height: 0 };
    return { step: s, label, detail };
  });

  const contentH = Math.max(...laid.map((l) => l.label.height + (l.detail.height ? l.detail.height + 6 : 0)));
  const boxH = BADGE_R + 10 + contentH + PAD * 2;
  const top = head.height + BADGE_R;

  let body = head.svg;

  for (const [i, l] of laid.entries()) {
    const x = PAGE.margin + i * (boxW + GAP);

    body += `<path d="${roundRect(x, top, boxW, boxH, 8)}" fill="${BRAND.panel}"/>`;
    body += badge(x + PAD + BADGE_R, top, i + 1);

    let ty = top + BADGE_R + 14 + TYPE.body;
    body += textBlock(l.step.label, {
      x: x + PAD, y: ty, width: innerW, size: TYPE.body, weight: 'bold', fill: BRAND.ink,
    }).svg;
    ty += l.label.height;

    if (l.detail.height) {
      body += textBlock(l.step.detail, {
        x: x + PAD, y: ty + 6, width: innerW, size: TYPE.label, fill: BRAND.ink,
      }).svg;
    }

    if (i < laid.length - 1) {
      const ax = x + boxW + 3;
      body += arrow(ax, top + boxH / 2, ax + GAP - 6, top + boxH / 2);
    }
  }

  let cursor = top + boxH + 20;
  const foot = footer(spec, cursor, width);
  body += foot.svg;
  cursor += foot.height;

  return { body, width, height: cursor + PAGE.margin };
}

function renderStack(spec, width) {
  const head = header(spec, width);
  const total = contentWidth(width);
  const x = PAGE.margin;
  const textX = x + BADGE_R * 2 + 18;
  const innerW = total - (textX - x) - PAD;

  let y = head.height + BADGE_R;
  let body = head.svg;
  const centres = [];

  for (const [i, step] of spec.steps.entries()) {
    const label = textBlock(step.label, { width: innerW, size: TYPE.body, weight: 'bold' });
    const detail = step.detail ? textBlock(step.detail, { width: innerW, size: TYPE.label }) : null;
    const blockH = label.height + (detail ? detail.height + 5 : 0);
    const boxH = blockH + PAD * 2;

    body += `<path d="${roundRect(x, y, total, boxH, 8)}" fill="${BRAND.panel}"/>`;
    body += badge(x + PAD + BADGE_R, y + boxH / 2, i + 1);

    let ty = y + PAD + TYPE.body;
    body += textBlock(step.label, {
      x: textX, y: ty, width: innerW, size: TYPE.body, weight: 'bold', fill: BRAND.ink,
    }).svg;
    ty += label.height;

    if (detail) {
      body += textBlock(step.detail, {
        x: textX, y: ty + 5, width: innerW, size: TYPE.label, fill: BRAND.ink,
      }).svg;
    }

    centres.push({ top: y, bottom: y + boxH });
    y += boxH + 26;
  }

  // Down arrows in the gaps between boxes.
  for (let i = 0; i < centres.length - 1; i += 1) {
    const ax = x + PAD + BADGE_R;
    body += arrow(ax, centres[i].bottom + 4, ax, centres[i + 1].top - 4);
  }

  let cursor = centres[centres.length - 1].bottom + 20;
  const foot = footer(spec, cursor, width);
  body += foot.svg;
  cursor += foot.height;

  return { body, width, height: cursor + PAGE.margin };
}

export function render(spec, width = PAGE.width) {
  return spec.steps.length <= ROW_LIMIT
    ? renderRow(spec, width)
    : renderStack(spec, width);
}

export function describe(spec) {
  const horizontal = spec.steps.length <= ROW_LIMIT;
  return {
    shape: horizontal
      ? `A left-to-right process flow of ${spec.steps.length} steps.`
      : `A top-to-bottom process flow of ${spec.steps.length} steps.`,
    marks: 'Each step sits in a grey rounded box with a numbered navy circle. Arrows point from each step to the next.',
    structure: `${spec.steps.length} numbered steps in a fixed order, running ${horizontal ? 'left to right' : 'top to bottom'}. The process has a clear first step and last step.`,
    items: spec.steps.map((s, i) => ({
      key: `Step ${i + 1}`,
      value: s.detail ? `${s.label}. ${s.detail}` : s.label,
    })),
    visibleText: spec.steps.flatMap((s, i) => [String(i + 1), s.label, s.detail].filter(Boolean)),
  };
}

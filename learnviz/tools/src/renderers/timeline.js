/**
 * Timeline. Dated events down a spine.
 *
 * Vertical rather than horizontal on purpose. Dates in learning content are
 * written ("October 2010", "the third trimester"), not numeric, so proportional
 * horizontal spacing would be a lie. Even spacing down a spine is honest about
 * showing order rather than rate, it gives every event room for a real
 * explanation, and it survives being read on a phone inside Canvas.
 */

import { BRAND, TYPE, series } from '../theme.js';
import { el, text, textBlock, n } from '../svg.js';
import { PAGE, header, footer, contentWidth } from './frame.js';

const SPINE_X = PAGE.margin + 8;
const DOT_R = 7;
const EMPHASIS_R = 11;
const TEXT_X = SPINE_X + 34;
const GAP = 26;

export function render(spec, width = PAGE.width) {
  const head = header(spec, width);
  const textWidth = contentWidth(width) - (TEXT_X - PAGE.margin);

  // Lay out first so the spine can be drawn to exactly the last dot.
  let y = head.height + 6;
  const rows = [];

  for (const event of spec.events) {
    const dateLines = textBlock(event.date, {
      x: TEXT_X, y: 0, width: textWidth, size: TYPE.small, weight: 'bold',
    });
    const labelLines = textBlock(event.label, {
      x: TEXT_X, y: 0, width: textWidth, size: TYPE.body, weight: 'bold',
    });
    const detailLines = event.detail
      ? textBlock(event.detail, { x: TEXT_X, y: 0, width: textWidth, size: TYPE.label })
      : null;

    const dateH = dateLines.height;
    const labelH = labelLines.height;
    const detailH = detailLines ? detailLines.height + 4 : 0;
    const height = dateH + labelH + detailH;

    rows.push({ event, y, height, dateH, labelH, textWidth, detailLines });
    y += height + GAP;
  }

  const lastRow = rows[rows.length - 1];
  const firstDotY = rows[0].y + TYPE.small * 0.6;
  const lastDotY = lastRow.y + TYPE.small * 0.6;

  let body = head.svg;

  // Spine, drawn behind the dots.
  body += el.line({
    x1: SPINE_X, y1: firstDotY, x2: SPINE_X, y2: lastDotY,
    stroke: BRAND.rule, 'stroke-width': 3, 'stroke-linecap': 'round',
  });

  for (const [i, row] of rows.entries()) {
    const { event } = row;
    const dotY = row.y + TYPE.small * 0.6;
    const colour = event.emphasis ? series(2) : { fill: BRAND.ink };
    const r = event.emphasis ? EMPHASIS_R : DOT_R;

    // A halo keeps the dot legible where it crosses the spine.
    body += el.circle({ cx: SPINE_X, cy: dotY, r: r + 3, fill: BRAND.paper });
    body += el.circle({ cx: SPINE_X, cy: dotY, r, fill: colour.fill });

    if (event.emphasis) {
      // Emphasis is carried by size and a ring as well as hue, so it survives
      // greyscale printing and colour vision deficiency.
      body += el.circle({
        cx: SPINE_X, cy: dotY, r: r + 4.5,
        fill: 'none', stroke: colour.fill, 'stroke-width': 1.5, opacity: 0.5,
      });
    }

    let ty = row.y + TYPE.small;
    body += text(event.date, {
      x: TEXT_X, y: ty, size: TYPE.small, weight: 'bold', fill: series(1).fill,
    });
    ty += row.dateH;

    body += textBlock(event.label, {
      x: TEXT_X, y: ty, width: row.textWidth, size: TYPE.body, weight: 'bold', fill: BRAND.ink,
    }).svg;
    ty += row.labelH;

    if (row.detailLines) {
      body += textBlock(event.detail, {
        x: TEXT_X, y: ty + 4 + TYPE.label - TYPE.label, width: row.textWidth, size: TYPE.label, fill: BRAND.ink,
      }).svg;
    }

    void i;
  }

  let cursor = lastRow.y + lastRow.height + 18;
  const foot = footer(spec, cursor, width);
  body += foot.svg;
  cursor += foot.height;

  return { body, width, height: cursor + PAGE.margin };
}

/**
 * Ordered facts about the visual, used to build the text equivalent.
 * Kept next to the renderer so a layout change and its description change
 * together.
 */
export function describe(spec) {
  return {
    shape: 'A vertical timeline. Events run from earliest at the top to latest at the bottom, joined by a single vertical line.',
    marks: spec.events.some((e) => e.emphasis)
      ? 'Each event is a dot on the line. Turning points are drawn as a larger dot with a ring around it.'
      : 'Each event is marked by a dot on the line.',
    structure: `${spec.events.length} events, in chronological order. Each has a date, a heading, and a short explanation to the right of the line.`,
    items: spec.events.map((e) => ({
      key: e.date,
      value: e.detail ? `${e.label}. ${e.detail}` : e.label,
      emphasis: Boolean(e.emphasis),
    })),
    visibleText: spec.events.flatMap((e) => [e.date, e.label]),
  };
}

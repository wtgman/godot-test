/**
 * Stat panel. Big-number callouts.
 *
 * This is the register the infographic tools live in, and it is the one thing
 * the rest of this toolkit could not do. Course content is full of figures that
 * deserve to land as a figure rather than be buried mid-paragraph: a dose, a
 * legal time limit, a failure rate, a price.
 *
 * Two rules keep it honest rather than merely loud.
 *
 * 1. The number is a string supplied by whoever wrote the spec. The toolkit
 *    computes nothing and rounds nothing, so it cannot quietly turn 47.6 into
 *    "nearly 50" or invent a percentage that was never in the source.
 * 2. Every tile carries a `label` saying what the number is *of*. A number
 *    without its unit and its population is not a fact, it is a decoration, and
 *    the validator will not let one through.
 */

import { BRAND, TYPE, series } from '../theme.js';
import { el, text, textBlock, measure, roundRect, sentences } from '../svg.js';
import { PAGE, header, footer, contentWidth } from './frame.js';

const GAP = 18;
const PAD = 20;
const RULE_H = 5;

/** Candidate sizes for the big number, largest first. */
const VALUE_SIZES = [56, 48, 42, 36, 30, 26];

/** Columns that keep tiles wide enough to hold a real number. */
function columnsFor(count) {
  if (count <= 3) return count;
  if (count === 4) return 2;
  return 3;
}

export function render(spec, width = PAGE.width) {
  const head = header(spec, width);
  const stats = spec.stats;
  const total = contentWidth(width);

  const cols = columnsFor(stats.length);
  const rows = Math.ceil(stats.length / cols);
  const tileW = (total - GAP * (cols - 1)) / cols;
  const innerW = tileW - PAD * 2;

  // Fit the number to the tile rather than letting it overflow. All tiles share
  // one size so the panel reads as a set, not as a ransom note.
  const valueSize = VALUE_SIZES.find(
    (size) => stats.every((st) => measure(st.value, size, 'bold') <= innerW),
  ) ?? VALUE_SIZES[VALUE_SIZES.length - 1];

  // Measure every tile so a row is as tall as its tallest member.
  const laid = stats.map((st) => {
    const label = textBlock(st.label, { width: innerW, size: TYPE.label, weight: 'bold' });
    const detail = st.detail
      ? textBlock(st.detail, { width: innerW, size: TYPE.small })
      : { svg: '', height: 0 };
    return { stat: st, label, detail };
  });

  const contentH = Math.max(
    ...laid.map((l) => valueSize + 10 + l.label.height + (l.detail.height ? l.detail.height + 7 : 0)),
  );
  const tileH = RULE_H + PAD + contentH + PAD;

  const top = head.height;
  let body = head.svg;

  for (const [i, l] of laid.entries()) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = PAGE.margin + col * (tileW + GAP);
    const y = top + row * (tileH + GAP);
    const colour = series(i);

    body += `<path d="${roundRect(x, y, tileW, tileH, 8)}" fill="${BRAND.panel}"/>`;

    // A colour bar across the top of each tile. The tiles are told apart by
    // position and by their own label, so the colour is emphasis rather than
    // encoding, and nothing is lost if it cannot be seen.
    body += `<path d="${roundRect(x, y, tileW, RULE_H * 2, 8)}" fill="${colour.fill}"/>`;
    body += el.rect({ x, y: y + RULE_H, width: tileW, height: RULE_H, fill: BRAND.panel });

    let ty = y + RULE_H + PAD + valueSize * 0.78;
    body += text(l.stat.value, {
      x: x + PAD, y: ty, size: valueSize, weight: 'bold', fill: colour.fill,
    });
    ty += valueSize * 0.22 + 12;

    body += textBlock(l.stat.label, {
      x: x + PAD, y: ty, width: innerW, size: TYPE.label, weight: 'bold', fill: BRAND.ink,
    }).svg;
    ty += l.label.height;

    if (l.detail.height) {
      body += `<g opacity="0.85">${textBlock(l.stat.detail, {
        x: x + PAD, y: ty + 7, width: innerW, size: TYPE.small, fill: BRAND.ink,
      }).svg}</g>`;
    }
  }

  let cursor = top + rows * tileH + (rows - 1) * GAP + 20;
  const foot = footer(spec, cursor, width);
  body += foot.svg;
  cursor += foot.height;

  return { body, width, height: cursor + PAGE.margin };
}

export function describe(spec) {
  const cols = columnsFor(spec.stats.length);
  return {
    shape: `A panel of ${spec.stats.length} large figures, each in its own tile.`,
    marks: 'Each tile is a light grey rounded box with a coloured bar across the top. The figure is set large in that colour, with a bold caption underneath saying what it counts.',
    structure: spec.stats.length <= cols
      ? `${spec.stats.length} tiles in a single row, read left to right.`
      : `${spec.stats.length} tiles in a grid ${cols} across, read left to right then down.`,
    items: spec.stats.map((st) => ({
      key: st.value,
      value: sentences(st.label, st.detail),
    })),
    visibleText: spec.stats.flatMap((st) => [st.value, st.label, st.detail].filter(Boolean)),
  };
}

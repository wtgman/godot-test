/**
 * Waffle. Part to whole, as a grid of countable squares.
 *
 * A pictogram rather than a pie chart, and the reason is pedagogical rather
 * than stylistic.
 *
 * People read angles badly. Asked to compare a 30 per cent wedge with a 25 per
 * cent wedge, most cannot, and no amount of labelling fixes the underlying
 * problem that the mark encodes the quantity in the one channel the eye is
 * worst at. Squares are counted, not estimated. A learner can point at the
 * grid and say "that is a quarter" because they can see twenty five of a
 * hundred.
 *
 * It also degrades honestly into text. "Fifty of the hundred squares" carries
 * the same information as the picture. "A wedge of roughly half" does not.
 */

import { BRAND, TYPE, series } from '../theme.js';
import { el, text, textBlock, roundRect, n, sentences } from '../svg.js';
import { PAGE, header, footer, contentWidth } from './frame.js';

const CELL_GAP = 3;
const MAX_CELL = 24;
const MIN_CELL = 8;
const KEY_GAP = 28;

/** Grid width in columns. Ten reads as tens, which is how people count. */
function columnsFor(total) {
  if (total % 10 === 0) return 10;
  if (total % 8 === 0) return 8;
  if (total % 7 === 0) return 7;
  return Math.ceil(Math.sqrt(total));
}

/** Singularise a unit label when there is exactly one of them. */
function unitFor(count, unitLabel) {
  if (count === 1) {
    return unitLabel.replace(/(ss|ch|sh|x)es$/, '$1').replace(/([^se])s$/, '$1');
  }
  return /s$/.test(unitLabel) ? unitLabel : `${unitLabel}s`;
}

export function render(spec, width = PAGE.width) {
  const head = header(spec, width);
  const total = spec.total;
  const cols = columnsFor(total);
  const rows = Math.ceil(total / cols);

  // The grid takes the left, the key the right. Cap the cell so a small total
  // does not produce absurdly large squares.
  const gridBudget = Math.min(contentWidth(width) * 0.5, 420);
  const cell = Math.max(
    MIN_CELL,
    Math.min(MAX_CELL, (gridBudget - CELL_GAP * (cols - 1)) / cols),
  );
  const gridW = cols * cell + CELL_GAP * (cols - 1);
  const gridH = rows * cell + CELL_GAP * (rows - 1);

  const keyX = PAGE.margin + gridW + KEY_GAP;
  const keyW = contentWidth(width) - gridW - KEY_GAP;

  // Assign each cell to a category, filling in order so each block is
  // contiguous. Contiguity is what makes the proportion readable at a glance.
  const assigned = [];
  for (const [i, c] of spec.categories.entries()) {
    for (let k = 0; k < c.value; k += 1) assigned.push(i);
  }
  const accounted = assigned.length;
  const remainder = total - accounted;

  const top = head.height;
  let body = head.svg;

  for (let idx = 0; idx < total; idx += 1) {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = PAGE.margin + col * (cell + CELL_GAP);
    const y = top + row * (cell + CELL_GAP);
    const catIndex = assigned[idx];

    if (catIndex === undefined) {
      // Unaccounted squares are drawn as an empty outline, never silently
      // filled, so a spec whose parts do not reach the whole shows the gap.
      body += `<path class="lv-cell" d="${roundRect(x, y, cell, cell, 2)}" fill="${BRAND.paper}" stroke="${BRAND.rule}" stroke-width="1.2"/>`;
      continue;
    }

    const colour = series(catIndex);
    // Each cell carries a class so it is identifiable in the output, and so a
    // count of squares can be asserted rather than inferred from path data.
    body += `<path class="lv-cell" d="${roundRect(x, y, cell, cell, 2)}" fill="${colour.fill}"/>`;
    if (colour.pattern && colour.pattern !== 'solid') {
      body += `<path d="${roundRect(x, y, cell, cell, 2)}" fill="url(#lv-${colour.pattern})"/>`;
    }
  }

  // Key. Each entry carries the count and the share as a number, so the
  // proportion never has to be estimated off the picture.
  let ky = top + TYPE.body;
  body += text(`Each square is one ${unitFor(1, spec.unitLabel)}`, {
    x: keyX, y: ky, size: TYPE.body, weight: 'bold', fill: BRAND.ink,
  });
  ky += 14;

  for (const [i, c] of spec.categories.entries()) {
    const colour = series(i);
    const share = Math.round((c.value / total) * 1000) / 10;
    const swatch = 14;
    const indent = swatch + 10;

    body += el.rect({ x: keyX, y: ky, width: swatch, height: swatch, rx: 2, fill: colour.fill });
    if (colour.pattern && colour.pattern !== 'solid') {
      body += el.rect({ x: keyX, y: ky, width: swatch, height: swatch, rx: 2, fill: `url(#lv-${colour.pattern})` });
    }

    const headline = `${c.label}: ${c.value} of ${total} (${share}%)`;
    const block = textBlock(headline, {
      x: keyX + indent, y: ky + TYPE.label - 1, width: keyW - indent,
      size: TYPE.label, weight: 'bold', fill: BRAND.ink,
    });
    body += block.svg;
    ky += Math.max(swatch, block.height) + 3;

    if (c.detail) {
      const d = textBlock(c.detail, {
        x: keyX + indent, y: ky + TYPE.small, width: keyW - indent, size: TYPE.small, fill: BRAND.ink,
      });
      body += `<g opacity="0.85">${d.svg}</g>`;
      ky += d.height + 3;
    }
    ky += 8;
  }

  if (remainder > 0) {
    const swatch = 14;
    const indent = swatch + 10;
    body += el.rect({
      x: keyX, y: ky, width: swatch, height: swatch, rx: 2,
      fill: BRAND.paper, stroke: BRAND.rule, 'stroke-width': 1.2,
    });
    const block = textBlock(
      `Not accounted for: ${remainder} of ${total} (${Math.round((remainder / total) * 1000) / 10}%)`,
      {
        x: keyX + indent, y: ky + TYPE.label - 1, width: keyW - indent,
        size: TYPE.label, weight: 'bold', fill: BRAND.ink,
      },
    );
    body += block.svg;
    ky += Math.max(swatch, block.height) + 11;
  }

  let cursor = Math.max(top + gridH, ky) + 20;
  const foot = footer(spec, cursor, width);
  body += foot.svg;
  cursor += foot.height;

  return { body, width, height: cursor + PAGE.margin };
}

export function describe(spec) {
  const total = spec.total;
  const cols = columnsFor(total);
  const accounted = spec.categories.reduce((sum, c) => sum + c.value, 0);
  const remainder = total - accounted;

  const items = spec.categories.map((c) => ({
    key: c.label,
    value: sentences(
      `${c.value} of ${total} ${unitFor(c.value, spec.unitLabel)}, which is ${Math.round((c.value / total) * 1000) / 10} per cent`,
      c.detail,
    ),
  }));

  if (remainder > 0) {
    items.push({
      key: 'Not accounted for',
      value: `${remainder} of ${total} ${unitFor(remainder, spec.unitLabel)}, drawn as empty outlined squares`,
    });
  }

  return {
    shape: `A grid of ${total} small squares, ${cols} across, where each square is one ${unitFor(1, spec.unitLabel)}.`,
    marks: `Squares are filled with a colour and a texture, one per category, and are grouped together rather than scattered, so each block can be counted.${remainder > 0 ? ' Squares that belong to no category are left as empty outlines.' : ''} A key beside the grid gives the exact count and percentage for each category, so no proportion has to be judged by eye.`,
    structure: `Filled from the top left, going left to right then down, one category after another in the order listed in the key.`,
    items,
    visibleText: [
      `Each square is one ${unitFor(1, spec.unitLabel)}`,
      ...spec.categories.map((c) => `${c.label}: ${c.value} of ${total} (${Math.round((c.value / total) * 1000) / 10}%)`),
      ...(remainder > 0 ? [`Not accounted for: ${remainder} of ${total}`] : []),
    ],
  };
}

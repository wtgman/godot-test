/**
 * Comparison. Items scored against shared criteria.
 *
 * Criteria are rows and items are columns, because criteria labels are usually
 * longer sentences and columns are usually few. That puts the long text down
 * the left where it has room, and keeps the thing being compared across the top
 * where it can be scanned.
 */

import { BRAND, TYPE, series } from '../theme.js';
import { el, text, textBlock, measure, n, roundRect, sentences } from '../svg.js';
import { PAGE, header, footer, contentWidth } from './frame.js';

const CELL_PAD = 11;
const MIN_ROW_H = 34;

export function render(spec, width = PAGE.width) {
  const head = header(spec, width);
  const total = contentWidth(width);
  const items = spec.items;
  const criteria = spec.criteria;

  // Size the criterion column to what is actually in it, rather than giving it
  // a fixed share. Criteria are often single words ("Denial", "Anger"), and a
  // fixed third of the width then sits empty while the value columns, which
  // hold whole sentences, are squeezed. Capped so a long criterion wraps
  // instead of eating the table.
  const longestCriterion = Math.max(
    ...criteria.map((c) => measure(c, TYPE.label, 'bold')),
  );
  const critW = Math.min(
    Math.max(Math.ceil(longestCriterion) + CELL_PAD * 2, 120),
    total * 0.34,
  );
  const colW = (total - critW) / items.length;

  // Measure every cell first so each row can be as tall as its tallest cell.
  const rows = criteria.map((criterion, r) => {
    const critBlock = textBlock(criterion, {
      width: critW - CELL_PAD * 2, size: TYPE.label, weight: 'bold',
    });
    const cells = items.map((item) =>
      textBlock(String(item.values[r]), { width: colW - CELL_PAD * 2, size: TYPE.label }));
    const height = Math.max(
      MIN_ROW_H,
      critBlock.height + CELL_PAD * 2,
      ...cells.map((c) => c.height + CELL_PAD * 2),
    );
    return { criterion, critBlock, cells, height };
  });

  const headerBlocks = items.map((item) =>
    textBlock(item.label, { width: colW - CELL_PAD * 2, size: TYPE.body, weight: 'bold' }));
  const headH = Math.max(38, Math.max(...headerBlocks.map((b) => b.height)) + CELL_PAD * 2);

  const top = head.height;
  const x0 = PAGE.margin;
  let body = head.svg;

  // Column headers, each in its item colour so the column can be followed down.
  for (const [c, item] of items.entries()) {
    const cx = x0 + critW + c * colW;
    const colour = series(c);
    body += `<path d="${roundRect(cx + 1, top, colW - 2, headH, 6)}" fill="${colour.fill}"/>`;
    body += textBlock(item.label, {
      x: cx + colW / 2, y: top + (headH - headerBlocks[c].height) / 2 + TYPE.body,
      width: colW - CELL_PAD * 2, size: TYPE.body, weight: 'bold',
      fill: colour.on, anchor: 'middle',
    }).svg;
    void item;
  }

  let y = top + headH + 3;

  for (const [r, row] of rows.entries()) {
    // Zebra banding, not gridlines everywhere. Fewer lines, easier to read.
    if (r % 2 === 0) {
      body += el.rect({ x: x0, y, width: total, height: row.height, fill: BRAND.panel });
    }

    body += textBlock(row.criterion, {
      x: x0 + CELL_PAD, y: y + (row.height - row.critBlock.height) / 2 + TYPE.label,
      width: critW - CELL_PAD * 2, size: TYPE.label, weight: 'bold', fill: BRAND.ink,
    }).svg;

    for (const [c, item] of items.entries()) {
      const cx = x0 + critW + c * colW;
      // A hairline between columns, only where it separates two values.
      if (c > 0) {
        body += el.line({
          x1: cx, y1: y + 4, x2: cx, y2: y + row.height - 4,
          stroke: BRAND.rule, 'stroke-width': 1,
        });
      }
      body += textBlock(String(item.values[r]), {
        x: cx + CELL_PAD, y: y + (row.height - row.cells[c].height) / 2 + TYPE.label,
        width: colW - CELL_PAD * 2, size: TYPE.label, fill: BRAND.ink,
      }).svg;
    }

    y += row.height;
  }

  // A single rule under the table closes it off.
  body += el.line({ x1: x0, y1: y, x2: x0 + total, y2: y, stroke: BRAND.ink, 'stroke-width': 1.5 });

  let cursor = y + 18;
  const foot = footer(spec, cursor, width);
  body += foot.svg;
  cursor += foot.height;

  return { body, width, height: cursor + PAGE.margin };
}

export function describe(spec) {
  return {
    shape: `A comparison table with ${spec.criteria.length} criteria down the left and ${spec.items.length} items across the top.`,
    marks: 'Column headers are filled in a different colour per item, with white text. Rows alternate between white and light grey.',
    structure: `${spec.criteria.length} rows, one per criterion. ${spec.items.length} columns, one per item: ${spec.items.map((i) => i.label).join(', ')}. Read across a row to compare all items on one criterion, or down a column to see one item in full.`,
    items: spec.criteria.map((criterion, r) => ({
      key: criterion,
      value: spec.items.map((item) => sentences(`${item.label}, ${String(item.values[r]).replace(/[.\s]+$/, '')}`)).join('. '),
    })),
    visibleText: [
      ...spec.items.map((i) => i.label),
      ...spec.criteria,
      ...spec.items.flatMap((i) => i.values.map(String)),
    ],
  };
}

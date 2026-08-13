/**
 * Hierarchy. A tree, drawn left to right.
 *
 * Left to right rather than top down because the labels in course content are
 * phrases, not job titles. A top-down chart forces long text into narrow
 * columns and gets unreadably wide by the third level. Growing rightwards gives
 * every node a full line of text and grows downward one row per leaf, which is
 * predictable.
 */

import { BRAND, TYPE, series } from '../theme.js';
import { el, textBlock, n, roundRect, sentences } from '../svg.js';
import { PAGE, header, footer, contentWidth } from './frame.js';

const ROW_GAP = 12;
const COL_GAP = 34;
const PAD_X = 12;
const PAD_Y = 9;

/** Depth of the deepest node, root counting as 1. */
function depthOf(node) {
  if (!node.children?.length) return 1;
  return 1 + Math.max(...node.children.map(depthOf));
}

/**
 * Assign each node a box, then place it.
 * Leaves stack downwards. A parent is centred on the vertical span of its
 * children, which is what makes the tree readable.
 */
function layout(root, colW, innerW) {
  const nodes = [];
  let cursorY = 0;

  const walk = (node, depth) => {
    const block = textBlock(node.label, { width: innerW, size: TYPE.label, weight: depth === 0 ? 'bold' : 'normal' });
    const detail = node.detail
      ? textBlock(node.detail, { width: innerW, size: TYPE.small })
      : null;
    const h = block.height + (detail ? detail.height + 4 : 0) + PAD_Y * 2;

    const record = {
      node, depth, block, detail,
      x: depth * (colW + COL_GAP),
      w: colW, h,
      y: 0, cy: 0,
    };

    if (!node.children?.length) {
      record.y = cursorY;
      cursorY += h + ROW_GAP;
      record.cy = record.y + h / 2;
      nodes.push(record);
      return record;
    }

    const children = node.children.map((c) => walk(c, depth + 1));
    const first = children[0];
    const last = children[children.length - 1];
    record.cy = (first.cy + last.cy) / 2;
    record.y = record.cy - h / 2;
    record.children = children;
    nodes.push(record);
    return record;
  };

  const rootRecord = walk(root, 0);
  return { nodes, rootRecord, height: cursorY - ROW_GAP };
}

export function render(spec, width = PAGE.width) {
  const head = header(spec, width);
  const total = contentWidth(width);
  const depth = depthOf(spec.root);
  const colW = (total - COL_GAP * (depth - 1)) / depth;
  const innerW = colW - PAD_X * 2;

  const { nodes, height } = layout(spec.root, colW, innerW);

  const top = head.height;
  const x0 = PAGE.margin;
  let body = head.svg;

  // Connectors first, so boxes sit over them.
  for (const rec of nodes) {
    if (!rec.children) continue;
    const startX = x0 + rec.x + rec.w;
    const midX = startX + COL_GAP / 2;
    const colour = series(rec.depth);

    for (const child of rec.children) {
      const cy = top + child.cy;
      const path = `M${n(startX)},${n(top + rec.cy)} H${n(midX)} V${n(cy)} H${n(x0 + child.x)}`;
      body += el.path({ d: path, fill: 'none', stroke: colour.fill, 'stroke-width': 1.8, opacity: 0.6 });
    }
  }

  // Boxes. Depth is shown by colour and by a left edge bar, so the level is
  // still readable without colour.
  for (const rec of nodes) {
    const colour = series(rec.depth);
    const x = x0 + rec.x;
    const y = top + rec.y;

    body += `<path d="${roundRect(x, y, rec.w, rec.h, 6)}" fill="${rec.depth === 0 ? colour.fill : BRAND.panel}"/>`;
    body += el.rect({ x, y: y + 4, width: 4, height: rec.h - 8, rx: 2, fill: rec.depth === 0 ? colour.on : colour.fill });

    const fg = rec.depth === 0 ? colour.on : BRAND.ink;
    let ty = y + PAD_Y + TYPE.label;
    body += textBlock(rec.node.label, {
      x: x + PAD_X, y: ty, width: innerW, size: TYPE.label,
      weight: rec.depth === 0 ? 'bold' : 'normal', fill: fg,
    }).svg;
    ty += rec.block.height;

    if (rec.detail) {
      body += `<g opacity="0.85">${textBlock(rec.node.detail, {
        x: x + PAD_X, y: ty + 4, width: innerW, size: TYPE.small, fill: fg,
      }).svg}</g>`;
    }
  }

  let cursor = top + height + 20;
  const foot = footer(spec, cursor, width);
  body += foot.svg;
  cursor += foot.height;

  return { body, width, height: cursor + PAGE.margin };
}

export function describe(spec) {
  const lines = [];
  let count = 0;
  const walk = (node, depth, path) => {
    count += 1;
    const where = depth === 0 ? 'Top level' : `Level ${depth + 1}, under ${path}`;
    lines.push({
      key: where,
      value: sentences(node.label, node.detail),
    });
    for (const c of node.children || []) walk(c, depth + 1, node.label);
  };
  walk(spec.root, 0, '');

  return {
    shape: `A tree diagram reading left to right, ${depthOf(spec.root)} levels deep, with ${count} boxes in total.`,
    marks: 'The top-level box is filled solid. Every other box is light grey with a coloured bar down its left edge, one colour per level. Elbow connectors join each box to the boxes it contains.',
    structure: `Branches open rightwards. A box on the left contains everything joined to its right.`,
    items: lines,
    visibleText: lines.map((l) => l.value),
  };
}

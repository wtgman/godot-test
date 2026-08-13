/**
 * Shared page furniture: the title block, the caption, the legend.
 *
 * Every visual gets the same frame so a learner moving between them does not
 * have to relearn where to look.
 */

import { BRAND, TYPE, series } from '../theme.js';
import { text, textBlock, el, n, roundRect, measure } from '../svg.js';

export const PAGE = {
  width: 960,
  margin: 36,
  gutter: 20,
};

/** Usable content width inside the margins. */
export const contentWidth = (width = PAGE.width) => width - PAGE.margin * 2;

/**
 * Title block. Returns `{ svg, height }`. The height is where content starts.
 * Subtitle is optional and wraps.
 */
export function header(spec, width = PAGE.width) {
  const x = PAGE.margin;
  const w = contentWidth(width);
  let y = PAGE.margin + TYPE.title;
  let svg = text(spec.title, { x, y, size: TYPE.title, weight: 'bold', fill: BRAND.ink });

  if (spec.subtitle) {
    y += 10;
    const block = textBlock(spec.subtitle, {
      x, y: y + TYPE.body, width: w, size: TYPE.body, fill: BRAND.ink,
    });
    svg += block.svg;
    y += block.height;
  }

  // A short rule in brand yellow, matching the video panel treatment in the
  // Emble component library, so the visual reads as part of the same system.
  y += 14;
  svg += el.rect({ x, y, width: 64, height: 4, fill: BRAND.accent });
  y += 4 + 22;

  return { svg, height: y };
}

/**
 * Caption and source line at the foot of the visual.
 * Returns `{ svg, height }` where height is the space consumed below `y`.
 */
export function footer(spec, y, width = PAGE.width) {
  const x = PAGE.margin;
  const w = contentWidth(width);
  let cursor = y;
  let svg = '';

  if (spec.caption) {
    const block = textBlock(spec.caption, {
      x, y: cursor + TYPE.small, width: w, size: TYPE.small, fill: BRAND.ink,
    });
    svg += block.svg;
    cursor += block.height + 6;
  }

  if (spec.source) {
    const block = textBlock(`Source: ${spec.source}`, {
      x, y: cursor + TYPE.small, width: w, size: TYPE.small, fill: BRAND.ink,
    });
    svg += `<g opacity="0.75">${block.svg}</g>`;
    cursor += block.height;
  }

  return { svg, height: cursor - y };
}

/**
 * Horizontal legend of labelled swatches.
 *
 * Each swatch carries its pattern as well as its fill. Two learners looking at
 * the same chart, one of whom cannot separate teal from navy, both get the same
 * information.
 */
export function legend(entries, x, y, width) {
  if (!entries.length) return { svg: '', height: 0 };

  const swatch = 13;
  const pad = 8;
  const gap = 22;
  let cx = x;
  let cy = y;
  let rowHeight = swatch + 10;
  let svg = '';

  for (const [i, entry] of entries.entries()) {
    const s = entry.colour || series(i);
    const label = entry.label;
    const w = swatch + pad + measure(label, TYPE.small);

    if (cx + w > x + width && cx > x) {
      cx = x;
      cy += rowHeight;
    }

    svg += el.rect({ x: cx, y: cy, width: swatch, height: swatch, rx: 2.5, fill: s.fill });
    if (s.pattern && s.pattern !== 'solid') {
      svg += el.rect({ x: cx, y: cy, width: swatch, height: swatch, rx: 2.5, fill: `url(#lv-${s.pattern})` });
    }
    svg += text(label, {
      x: cx + swatch + pad, y: cy + swatch - 2, size: TYPE.small, fill: BRAND.ink,
    });

    cx += w + gap;
  }

  return { svg, height: cy - y + rowHeight };
}

/**
 * A soft panel behind a group of content, matching the Emble content block.
 */
export function panel(x, y, w, h) {
  return `<path d="${roundRect(x, y, w, h, 8)}" fill="${BRAND.panel}"/>`;
}

/** Straight connector with an arrowhead, for flow diagrams. */
export function arrow(x1, y1, x2, y2, colour = BRAND.ink) {
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${colour}" stroke-width="2" marker-end="url(#lv-arrow)"/>`;
}

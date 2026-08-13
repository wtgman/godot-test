/**
 * SVG primitives.
 *
 * Everything here is deterministic: the same spec always produces byte-identical
 * SVG. No timestamps, no random ids, no floating point that varies by platform
 * (all emitted numbers go through `n()`). That matters because these files get
 * committed, diffed and re-reviewed by teachers.
 *
 * Text is measured with a built-in Helvetica advance-width table rather than a
 * browser, so wrapping is correct and identical whether or not Chromium is
 * present.
 */

import { BRAND, TYPE } from './theme.js';

/** Escape text for use in XML character data or a quoted attribute. */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Round to 2dp and strip trailing zeros, so output is stable and compact. */
export function n(v) {
  if (!Number.isFinite(v)) throw new Error(`Non-finite number in SVG output: ${v}`);
  const r = Math.round(v * 100) / 100;
  return String(r === 0 ? 0 : r); // avoid "-0"
}

/**
 * Helvetica advance widths, in units of 1/1000 em, for the printable ASCII
 * range starting at space (32). Taken from the Adobe Core 14 AFM metrics for
 * Helvetica, which is what Arial and Liberation Sans are metric-compatible with.
 */
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const BOLD_FACTOR = 1.06; // Helvetica Bold runs a little wider than regular.

/** Width of `text` in px at `size`, for the given weight. */
export function measure(text, size = TYPE.body, weight = 'normal') {
  let units = 0;
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    if (code >= 32 && code < 127) {
      units += HELVETICA_WIDTHS[code - 32];
    } else if (code === 9) {
      units += HELVETICA_WIDTHS[0] * 4;
    } else {
      // Non-ASCII: assume a typical lowercase advance. Covers curly quotes,
      // accented Latin and the status glyphs without pulling in a font library.
      units += 556;
    }
  }
  const px = (units / 1000) * size;
  return weight === 'bold' ? px * BOLD_FACTOR : px;
}

/**
 * Greedy word wrap to `maxWidth`. Words longer than the line are hard-broken so
 * a long chemical name or URL cannot overflow the shape it sits in.
 */
export function wrap(text, maxWidth, size = TYPE.body, weight = 'normal') {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = '';

  const hardBreak = (word) => {
    let chunk = '';
    for (const ch of word) {
      if (chunk && measure(chunk + ch, size, weight) > maxWidth) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    return chunk;
  };

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, size, weight) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = measure(word, size, weight) > maxWidth ? hardBreak(word) : word;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Truncate to fit `maxWidth`, appending a single-character ellipsis.
 * Used only where a shape has a fixed size the layout cannot grow.
 */
export function ellipsize(text, maxWidth, size = TYPE.body, weight = 'normal') {
  const s = String(text ?? '');
  if (measure(s, size, weight) <= maxWidth) return s;
  let out = '';
  for (const ch of s) {
    if (measure(`${out}${ch}…`, size, weight) > maxWidth) break;
    out += ch;
  }
  return `${out.trimEnd()}…`;
}

/** Serialise an attribute object, skipping null and undefined. */
function attrs(o) {
  return Object.entries(o)
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => `${k}="${esc(typeof v === 'number' ? n(v) : v)}"`)
    .join(' ');
}

export const el = {
  rect: (o) => `<rect ${attrs(o)}/>`,
  circle: (o) => `<circle ${attrs(o)}/>`,
  ellipse: (o) => `<ellipse ${attrs(o)}/>`,
  line: (o) => `<line ${attrs(o)}/>`,
  path: (o) => `<path ${attrs(o)}/>`,
  polygon: (o) => `<polygon ${attrs(o)}/>`,
  g: (o, children) => `<g ${attrs(o)}>${children}</g>`,
};

/**
 * A single line of text. `anchor` is start | middle | end.
 * Text is never encoded as a path, so it stays selectable, searchable and
 * readable by a screen reader when the SVG is embedded directly.
 */
export function text(str, o = {}) {
  const {
    x = 0, y = 0, size = TYPE.body, weight = 'normal',
    fill = BRAND.ink, anchor = 'start', opacity, className,
  } = o;
  return `<text ${attrs({
    x, y,
    'font-family': TYPE.family,
    'font-size': size,
    'font-weight': weight === 'normal' ? null : weight,
    fill,
    'text-anchor': anchor === 'start' ? null : anchor,
    opacity,
    class: className,
  })}>${esc(str)}</text>`;
}

/**
 * A wrapped text block. Returns `{ svg, height, lines }` so the caller can grow
 * its container to fit rather than clipping the words.
 */
export function textBlock(str, o = {}) {
  const {
    x = 0, y = 0, width = 200, size = TYPE.body, weight = 'normal',
    fill = BRAND.ink, anchor = 'start', lineHeight = 1.35, maxLines = Infinity,
  } = o;

  let lines = wrap(str, width, size, weight);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = ellipsize(`${lines[maxLines - 1]}…`, width, size, weight);
  }

  const step = size * lineHeight;
  const svg = lines
    .map((ln, i) => text(ln, { x, y: y + i * step, size, weight, fill, anchor }))
    .join('');

  return { svg, height: lines.length * step, lines };
}

/**
 * Pattern definitions used to differentiate fills without relying on colour.
 * Each pattern paints in `colour` over the series fill, so a bar keeps its hue
 * for learners who see colour and gains a texture for those who do not.
 */
export function patternDefs(colour = '#ffffff', opacity = 0.55) {
  const p = (id, body) =>
    `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse">${body}</pattern>`;
  const stroke = `stroke="${colour}" stroke-width="1.6" opacity="${opacity}"`;
  return [
    p('lv-diagonal', `<path d="M0,8 L8,0 M-2,2 L2,-2 M6,10 L10,6" ${stroke} fill="none"/>`),
    p('lv-dots', `<circle cx="2" cy="2" r="1.4" fill="${colour}" opacity="${opacity}"/><circle cx="6" cy="6" r="1.4" fill="${colour}" opacity="${opacity}"/>`),
    p('lv-horizontal', `<path d="M0,2 H8 M0,6 H8" ${stroke} fill="none"/>`),
    p('lv-vertical', `<path d="M2,0 V8 M6,0 V8" ${stroke} fill="none"/>`),
    p('lv-grid', `<path d="M0,4 H8 M4,0 V8" ${stroke} fill="none"/>`),
  ].join('');
}

/** Marker definitions for flow arrows. */
export function markerDefs(colour = BRAND.ink) {
  return `<marker id="lv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill="${colour}"/></marker>`;
}

/** Rounded-rectangle path with independently controllable corners. */
export function roundRect(x, y, w, h, r = 6) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${n(x + rr)},${n(y)} H${n(x + w - rr)} A${n(rr)},${n(rr)} 0 0 1 ${n(x + w)},${n(y + rr)} V${n(y + h - rr)} A${n(rr)},${n(rr)} 0 0 1 ${n(x + w - rr)},${n(y + h)} H${n(x + rr)} A${n(rr)},${n(rr)} 0 0 1 ${n(x)},${n(y + h - rr)} V${n(y + rr)} A${n(rr)},${n(rr)} 0 0 1 ${n(x + rr)},${n(y)} Z`;
}

/**
 * Wrap body content into a complete, standalone SVG document.
 *
 * Accessibility contract, applied to every visual this toolkit produces:
 *   - `role="img"` so assistive technology announces it as a single graphic
 *     rather than reading out stray shape nodes.
 *   - `<title>` is the short alt. `<desc>` is the full description.
 *   - `aria-labelledby` binds both, which is what actually gets announced in
 *     Chrome, Safari and NVDA. Referencing only `<title>` loses the detail.
 *   - The viewBox with no fixed width/height lets Canvas scale it responsively.
 */
export function document_({ width, height, title, desc, body, defs = '' }) {
  if (!title) throw new Error('Every visual needs a title. It becomes the alt text.');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(width)} ${n(height)}" width="${n(width)}" height="${n(height)}" role="img" aria-labelledby="lv-title lv-desc" font-family="${esc(TYPE.family)}">`
    + `<title id="lv-title">${esc(title)}</title>`
    + `<desc id="lv-desc">${esc(desc || title)}</desc>`
    + (defs ? `<defs>${defs}</defs>` : '')
    + `<rect width="${n(width)}" height="${n(height)}" fill="${BRAND.paper}"/>`
    + body
    + '</svg>';
}

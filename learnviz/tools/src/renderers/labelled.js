/**
 * Labelled diagram. A subject with its parts named.
 *
 * The base image is supplied by the teacher, because a generated picture of a
 * real piece of equipment or a real anatomy is a liability in a course. What
 * this renderer contributes is the part that is fiddly and easy to get wrong:
 * numbered pins placed at exact coordinates, a key that always matches the
 * pins, and a text equivalent that names every part and its position.
 *
 * With no image supplied it draws a clearly marked placeholder frame so the
 * page can be built and reviewed before the photograph exists.
 */

import { BRAND, TYPE, series } from '../theme.js';
import { el, text, textBlock, esc, n, roundRect } from '../svg.js';
import { PAGE, header, footer, contentWidth } from './frame.js';

const PIN_R = 13;
const STAGE_RATIO = 0.62; // Image height as a fraction of its width.

/** Describe a 0-100 coordinate in words, for the text equivalent. */
function positionWords(x, y) {
  const across = x < 33 ? 'left' : x > 67 ? 'right' : 'centre';
  const down = y < 33 ? 'top' : y > 67 ? 'bottom' : 'middle';
  return down === 'middle' && across === 'centre' ? 'centre' : `${down} ${across}`;
}

export function render(spec, width = PAGE.width) {
  const head = header(spec, width);
  const total = contentWidth(width);

  // The stage takes two thirds, the key sits to its right.
  const stageW = Math.round(total * 0.62);
  const stageH = Math.round(stageW * STAGE_RATIO);
  const keyX = PAGE.margin + stageW + 24;
  const keyW = total - stageW - 24;

  const top = head.height;
  let body = head.svg;

  if (spec.image) {
    // `image` is a data URI or a path relative to the output. Either way it is
    // embedded by reference and preserved verbatim.
    body += `<image href="${esc(spec.image)}" x="${n(PAGE.margin)}" y="${n(top)}" width="${n(stageW)}" height="${n(stageH)}" preserveAspectRatio="xMidYMid slice"/>`;
  } else {
    body += `<path d="${roundRect(PAGE.margin, top, stageW, stageH, 8)}" fill="${BRAND.panel}" stroke="${BRAND.rule}" stroke-width="1.5" stroke-dasharray="6 5"/>`;
    // The placeholder is flagged in the teacher's highlight colour, so an
    // unfinished diagram cannot be mistaken for a finished one.
    const noteW = stageW - 60;
    const note = textBlock(
      `Place the image of ${spec.subject} here, then delete this frame. The numbered pins are already positioned and will sit correctly over it.`,
      { width: noteW, size: TYPE.label, weight: 'bold' },
    );
    body += el.rect({
      x: PAGE.margin + 30, y: top + stageH / 2 - note.height / 2 - 10,
      width: noteW, height: note.height + 20, fill: BRAND.placeholder, rx: 4,
    });
    body += textBlock(
      `Place the image of ${spec.subject} here, then delete this frame. The numbered pins are already positioned and will sit correctly over it.`,
      {
        x: PAGE.margin + 30, y: top + stageH / 2 - note.height / 2 + TYPE.label,
        width: noteW, size: TYPE.label, weight: 'bold', fill: BRAND.ink,
      },
    ).svg;
  }

  // Pins.
  for (const [i, part] of spec.parts.entries()) {
    const px = PAGE.margin + (part.x / 100) * stageW;
    const py = top + (part.y / 100) * stageH;
    const colour = series(i);

    // A white ring keeps the pin visible over any photograph.
    body += el.circle({ cx: px, cy: py, r: PIN_R + 2.5, fill: BRAND.paper });
    body += el.circle({ cx: px, cy: py, r: PIN_R, fill: colour.fill });
    body += text(String(i + 1), {
      x: px, y: py + 4.5, size: TYPE.small, weight: 'bold', fill: colour.on, anchor: 'middle',
    });
  }

  // Key, to the right of the stage.
  let ky = top + TYPE.body;
  body += text('Key', { x: keyX, y: ky, size: TYPE.body, weight: 'bold', fill: BRAND.ink });
  ky += 12;

  for (const [i, part] of spec.parts.entries()) {
    const colour = series(i);
    const indent = 26;
    const line = part.detail ? `${part.label}. ${part.detail}` : part.label;
    const block = textBlock(line, {
      x: keyX + indent, y: ky + TYPE.label, width: keyW - indent, size: TYPE.label, fill: BRAND.ink,
    });
    body += el.circle({ cx: keyX + 9, cy: ky + TYPE.label - 4.5, r: 9, fill: colour.fill });
    body += text(String(i + 1), {
      x: keyX + 9, y: ky + TYPE.label - 1, size: TYPE.small, weight: 'bold', fill: colour.on, anchor: 'middle',
    });
    body += block.svg;
    ky += block.height + 8;
  }

  let cursor = Math.max(top + stageH, ky) + 20;
  const foot = footer(spec, cursor, width);
  body += foot.svg;
  cursor += foot.height;

  return { body, width, height: cursor + PAGE.margin };
}

export function describe(spec) {
  return {
    shape: `A labelled diagram of ${spec.subject}, with ${spec.parts.length} numbered parts.`,
    marks: 'Each part is marked by a numbered coloured circle placed on the image. A key to the right lists the same numbers with the name of each part.',
    structure: spec.image
      ? 'The image sits on the left, the numbered key on the right. Numbers on the image match numbers in the key.'
      : 'The image frame sits on the left and is currently a placeholder awaiting a photograph. The numbered key sits on the right.',
    items: spec.parts.map((p, i) => ({
      key: `${i + 1}, ${positionWords(p.x, p.y)} of the image`,
      value: p.detail ? `${p.label}. ${p.detail}` : p.label,
    })),
    visibleText: ['Key', ...spec.parts.flatMap((p, i) => [String(i + 1), p.label])],
  };
}

/**
 * Cycle. A loop with no first stage and no last stage.
 *
 * The circle carries the shape of the idea, which is the whole point: a learner
 * must be able to see that the end feeds the beginning. Detail would crowd the
 * ring, so each node holds only its stage name and the explanations sit in a
 * numbered key underneath. That also means the key alone is a complete text
 * version of the diagram.
 */

import { BRAND, TYPE, series } from '../theme.js';
import { el, text, textBlock, n, roundRect } from '../svg.js';
import { PAGE, header, footer, contentWidth } from './frame.js';

const NODE_W = 150;
const NODE_PAD = 10;
const RING_GAP = 26;

/** Point on a circle. Angle 0 is straight up, running clockwise. */
function polar(cx, cy, r, index, count) {
  const angle = (-90 + (index * 360) / count) * (Math.PI / 180);
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export function render(spec, width = PAGE.width) {
  const head = header(spec, width);
  const stages = spec.stages;
  const cx = width / 2;

  // Size the ring so nodes never collide: the chord between neighbours must
  // clear the node width plus a gap.
  const chordNeeded = NODE_W + 34;
  const minRadius = chordNeeded / (2 * Math.sin(Math.PI / stages.length));
  const radius = Math.max(150, Math.min(minRadius, 220));

  // Measure node heights up front to centre each box on its point.
  const nodes = stages.map((st) => {
    const label = textBlock(st.label, {
      width: NODE_W - NODE_PAD * 2, size: TYPE.label, weight: 'bold',
    });
    return { stage: st, label, height: label.height + NODE_PAD * 2 };
  });

  const maxNodeH = Math.max(...nodes.map((nd) => nd.height));
  const diagramTop = head.height;
  const cy = diagramTop + radius + maxNodeH / 2 + 8;

  let body = head.svg;

  // The ring itself, drawn as a dashed circle so it reads as continuous motion
  // rather than a solid boundary.
  body += el.circle({
    cx, cy, r: radius, fill: 'none',
    stroke: BRAND.rule, 'stroke-width': 2.5, 'stroke-dasharray': '2 7', 'stroke-linecap': 'round',
  });

  // Arrowheads sitting on the ring midway between each pair of nodes, showing
  // direction of travel.
  for (let i = 0; i < stages.length; i += 1) {
    const midAngle = (-90 + ((i + 0.5) * 360) / stages.length) * (Math.PI / 180);
    const px = cx + radius * Math.cos(midAngle);
    const py = cy + radius * Math.sin(midAngle);
    // Tangent direction, clockwise.
    const tx = -Math.sin(midAngle);
    const ty = Math.cos(midAngle);
    const size = 8;
    const p1 = `${n(px + tx * size)},${n(py + ty * size)}`;
    const p2 = `${n(px - tx * size * 0.4 + ty * size * 0.7)},${n(py - ty * size * 0.4 - tx * size * 0.7)}`;
    const p3 = `${n(px - tx * size * 0.4 - ty * size * 0.7)},${n(py - ty * size * 0.4 + tx * size * 0.7)}`;
    body += el.polygon({ points: `${p1} ${p2} ${p3}`, fill: series(1).fill });
  }

  // Centre label, when the cycle has a name worth repeating in the middle.
  const centreText = spec.centre || '';
  if (centreText) {
    const block = textBlock(centreText, {
      x: cx, y: cy - 4, width: radius * 1.1, size: TYPE.body,
      weight: 'bold', fill: BRAND.ink, anchor: 'middle',
    });
    body += block.svg;
  }

  // Nodes.
  for (const [i, nd] of nodes.entries()) {
    const p = polar(cx, cy, radius, i, stages.length);
    const x = p.x - NODE_W / 2;
    const y = p.y - nd.height / 2;
    const colour = series(i);

    body += `<path d="${roundRect(x, y, NODE_W, nd.height, 7)}" fill="${BRAND.paper}" stroke="${colour.fill}" stroke-width="2"/>`;

    // Number badge overlapping the top-left corner ties the node to the key.
    body += el.circle({ cx: x + 2, cy: y + 2, r: 12, fill: colour.fill });
    body += text(String(i + 1), {
      x: x + 2, y: y + 6.5, size: TYPE.small, weight: 'bold', fill: colour.on, anchor: 'middle',
    });

    body += textBlock(nd.stage.label, {
      x: cx > p.x ? p.x : p.x, y: y + NODE_PAD + TYPE.label,
      width: NODE_W - NODE_PAD * 2, size: TYPE.label, weight: 'bold',
      fill: BRAND.ink, anchor: 'middle',
    }).svg;
  }

  let cursor = cy + radius + maxNodeH / 2 + RING_GAP;

  // Numbered key. Every stage appears here with its explanation.
  const keyX = PAGE.margin;
  const keyW = contentWidth(width);
  const hasDetail = stages.some((s) => s.detail);
  if (hasDetail) {
    cursor += TYPE.body;
    body += text('Stages', { x: keyX, y: cursor, size: TYPE.body, weight: 'bold', fill: BRAND.ink });
    cursor += 12;

    for (const [i, st] of stages.entries()) {
      const colour = series(i);
      const line = st.detail ? `${st.label}. ${st.detail}` : st.label;
      const indent = 26;
      const block = textBlock(line, {
        x: keyX + indent, y: cursor + TYPE.label, width: keyW - indent, size: TYPE.label, fill: BRAND.ink,
      });
      body += el.circle({ cx: keyX + 9, cy: cursor + TYPE.label - 4.5, r: 9, fill: colour.fill });
      body += text(String(i + 1), {
        x: keyX + 9, y: cursor + TYPE.label - 1, size: TYPE.small, weight: 'bold',
        fill: colour.on, anchor: 'middle',
      });
      body += block.svg;
      cursor += block.height + 8;
    }
    cursor += 8;
  }

  const foot = footer(spec, cursor, width);
  body += foot.svg;
  cursor += foot.height;

  return { body, width, height: cursor + PAGE.margin };
}

export function describe(spec) {
  return {
    shape: `A circular cycle diagram with ${spec.stages.length} stages arranged clockwise around a dashed ring.`,
    marks: 'Each stage is a white box outlined in its own colour, with a numbered circle at its top-left corner. Arrowheads on the ring between the boxes show the direction of travel, clockwise. The cycle has no start and no end, it returns to the first stage.',
    structure: `${spec.stages.length} stages around the ring, numbered clockwise from the top.${spec.stages.some((s) => s.detail) ? ' A numbered key underneath the ring explains each stage.' : ''}`,
    items: spec.stages.map((s, i) => ({
      key: `Stage ${i + 1}`,
      value: s.detail ? `${s.label}. ${s.detail}` : s.label,
    })),
    visibleText: [
      ...(spec.centre ? [spec.centre] : []),
      ...spec.stages.flatMap((s, i) => [String(i + 1), s.label]),
    ],
  };
}

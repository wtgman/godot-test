/**
 * Renderer registry. Maps a spec type to its drawing and describing functions,
 * and assembles the finished SVG document.
 */

import * as timeline from './timeline.js';
import * as process_ from './process.js';
import * as cycle from './cycle.js';
import * as gantt from './gantt.js';
import * as comparison from './comparison.js';
import * as hierarchy from './hierarchy.js';
import * as chart from './chart.js';
import * as labelled from './labelled.js';

import { document_, patternDefs, markerDefs } from '../svg.js';
import { accessibility } from '../a11y.js';
import { PAGE } from './frame.js';

export const RENDERERS = {
  timeline,
  process: process_,
  cycle,
  gantt,
  comparison,
  hierarchy,
  chart,
  labelled,
};

/** True when this spec type draws a static image. */
export const isStatic = (type) => Object.hasOwn(RENDERERS, type);

/**
 * Render a validated spec to a complete SVG document plus its accessibility
 * artefacts.
 *
 * The alt text is computed before the document is built, because the short alt
 * becomes the SVG `<title>` and the full alt becomes its `<desc>`. That means a
 * visual embedded as inline SVG is accessible without any surrounding markup
 * having to do the work.
 */
export function render(spec, { width = PAGE.width } = {}) {
  const renderer = RENDERERS[spec.type];
  if (!renderer) {
    throw new Error(`No static renderer for type "${spec.type}".`);
  }

  const description = renderer.describe(spec);
  const a11y = accessibility(spec, description);
  const { body, height } = renderer.render(spec, width);

  const svg = document_({
    width,
    height,
    title: a11y.shortAlt,
    desc: a11y.fullAlt,
    defs: patternDefs() + markerDefs(),
    body,
  });

  return { svg, width, height, description, a11y };
}

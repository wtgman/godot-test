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
import * as stat from './stat.js';
import * as waffle from './waffle.js';

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
  stat,
  waffle,
};

/** True when this spec type draws a static image. */
export const isStatic = (type) => Object.hasOwn(RENDERERS, type);

/**
 * The reveal units of a figure, in order, as short labels.
 *
 * A step-through shows these one at a time. For most figures a unit is one of
 * the items the text equivalent lists (an event, a step, a row). Charts reveal
 * a whole category of bars, or a whole line, at once, and a waffle reveals a
 * category of squares, so those renderers say so themselves.
 */
export function unitsOf(spec) {
  const renderer = RENDERERS[spec.type];
  if (!renderer) throw new Error(`No static renderer for type "${spec.type}".`);
  if (renderer.units) return renderer.units(spec);
  return renderer.describe(spec).items.map((i) => String(i.key));
}

/**
 * Hide every unit from `step` onwards. The groups keep their space, so the
 * figure does not reflow as it builds, which would make a learner re-read
 * everything already shown.
 */
function applyStep(body, step) {
  if (step === undefined || step === null) return body;
  return body.replace(/<g data-item="(\d+)">/g, (m, i) => (
    Number(i) >= step ? `<g data-item="${i}" visibility="hidden">` : m
  ));
}

/**
 * Render a validated spec to a complete SVG document plus its accessibility
 * artefacts.
 *
 * The alt text is computed before the document is built, because the short alt
 * becomes the SVG `<title>` and the full alt becomes its `<desc>`. That means a
 * visual embedded as inline SVG is accessible without any surrounding markup
 * having to do the work.
 *
 * Options:
 *   width  drawing width in points
 *   bare   omit the title block and footer, for a figure inside an activity
 *          that already carries its own heading
 *   step   show only the first `step` reveal units
 */
export function render(spec, { width = PAGE.width, bare = false, step } = {}) {
  const renderer = RENDERERS[spec.type];
  if (!renderer) {
    throw new Error(`No static renderer for type "${spec.type}".`);
  }

  const description = renderer.describe(spec);
  const a11y = accessibility(spec, description);
  const drawSpec = bare ? { ...spec, _bare: true } : spec;
  const { body, height } = renderer.render(drawSpec, width);

  const svg = document_({
    width,
    height,
    title: a11y.shortAlt,
    desc: a11y.fullAlt,
    defs: patternDefs() + markerDefs(),
    body: applyStep(body, step),
  });

  return { svg, width, height, description, a11y, units: unitsOf(spec) };
}

/**
 * Learning objects: the pattern registry and the build.
 *
 * Every pattern module exports the same shape, so the build treats them all
 * alike:
 *
 *   meta          label, the learner's verb, why it works, presenter keys,
 *                 whether it is scored, and its Emble icon
 *   validate      checks the pattern's own fields; returns normalised fields
 *   describe      the facts for the text equivalent and alt text
 *   figure        the figure worth rendering as an image, or null
 *   interactive   the activity markup and its behaviour
 *   native        the no-script Emble rendition
 *   teach         defaults for the teacher guide
 *   answerKey     every correct answer and its reasoning, for expert review
 */

import * as predict from './patterns/predict.js';
import * as stepthrough from './patterns/stepthrough.js';
import * as sort from './patterns/sort.js';
import * as order from './patterns/order.js';
import * as scenario from './patterns/scenario.js';
import * as estimate from './patterns/estimate.js';
import * as explore from './patterns/explore.js';
import * as cards from './patterns/cards.js';

import { validateCommon, figureSpec, draftState, fail, str, num, arr, oneOf, bool } from './schema.js';
import { page } from './shell.js';
import { render } from '../renderers/index.js';
import { accessibility, audit } from '../a11y.js';
import { safeJson } from '../runtime/client.js';
import { shuffle, shuffleIndices } from '../runtime/rng.js';

export const PATTERNS = {
  predict,
  stepthrough,
  sort,
  order,
  scenario,
  estimate,
  explore,
  cards,
};

/** Validate a learning object. Returns a frozen, normalised copy. */
export function validateLO(raw) {
  validateCommon(raw, PATTERNS);
  const pattern = PATTERNS[raw.pattern];
  const helpers = {
    str, num, arr, oneOf, bool, fail,
    figure: (f, path) => figureSpec(f, raw, path),
  };
  const normalised = pattern.validate(raw, helpers) || {};
  return Object.freeze(structuredClone({ ...raw, ...normalised }));
}

/** The context each pattern receives when it builds. */
function context(lo, figureRender) {
  return {
    safeJson,
    shuffle,
    shuffleIndices,
    /** A figure drawn inline, without its own title block, for use inside an activity. */
    inlineFigure(spec, opts = {}) {
      // Drawn at 760 rather than 960 so that, scaled to the width of an
      // activity card, the labels come out at a readable size.
      const r = render(spec, { bare: true, width: 760, ...opts });
      return `<figure class="lv-figure"${opts.id ? ` id="${opts.id}"` : ''}>${r.svg}</figure>`;
    },
    render,
    figureA11y: figureRender ? figureRender.a11y : null,
    lo,
  };
}

/**
 * Build every rendition that comes from the spec alone. Rasterising, zipping
 * and writing files happen in the delivery layer, which has the file system.
 */
export function buildLO(lo) {
  const pattern = PATTERNS[lo.pattern];
  const description = pattern.describe(lo);
  const a11y = accessibility({ ...lo, caption: undefined, source: undefined }, description);
  const problems = audit(lo, description, a11y);
  const draft = draftState(lo);

  const figureSpecForImage = pattern.figure(lo);
  const figure = figureSpecForImage ? render(figureSpecForImage) : null;
  const ctx = context(lo, figure);

  const built = pattern.interactive(lo, ctx);
  const html = page({
    lo,
    meta: pattern.meta,
    a11y,
    body: built.body,
    script: built.script,
    css: built.css,
    needsExpr: built.needsExpr,
    draft,
  });

  return {
    lo,
    meta: pattern.meta,
    html,
    native: pattern.native(lo, ctx),
    figure,
    figureSpec: figureSpecForImage,
    description,
    a11y,
    problems,
    draft,
    teach: pattern.teach(lo),
    answerKey: pattern.answerKey(lo),
  };
}

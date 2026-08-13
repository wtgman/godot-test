/**
 * Interactive registry. Same shape as the static renderer registry, so the CLI
 * can treat both the same way.
 */

import * as sequencer from './sequencer.js';
import * as simulation from './simulation.js';

import { accessibility } from '../a11y.js';

export const BUILDERS = { sequencer, simulation };

export const isInteractive = (type) => Object.hasOwn(BUILDERS, type);

/**
 * Build a validated interactive spec into a standalone HTML page plus its
 * accessibility artefacts.
 */
export function build(spec) {
  const builder = BUILDERS[spec.type];
  if (!builder) throw new Error(`No interactive builder for type "${spec.type}".`);

  const description = builder.describe(spec);
  const a11y = accessibility(spec, description);
  const html = builder.build(spec, a11y);

  return { html, description, a11y };
}

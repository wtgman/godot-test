/**
 * Accessibility text, generated from the same spec that drew the picture.
 *
 * This is the part of the toolkit that matters most and gets skipped most
 * often. A diagram added to a course without a text equivalent is not a
 * teaching aid for every learner, it is a teaching aid for some of them.
 *
 * Because `describe()` lives beside each renderer and reads the same spec, the
 * description cannot drift out of step with the drawing. Change the visual and
 * the words change with it, or the build fails.
 *
 * The five-part structure and its exact labels are the RMIT house standard, and
 * `data-ally-user-updated-alt` is what Ally reports against.
 */

import { SERIES, BRAND } from './theme.js';

const SHORT_ALT_MAX = 150;

/** Collapse whitespace and guarantee a single trailing full stop. */
function tidy(s) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Deduplicate, preserving first-seen order. */
function uniq(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const v = String(item ?? '').trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

/**
 * Short alt. One sentence naming what the graphic is and what it is of.
 *
 * Deliberately does not try to carry the data. A screen reader user hitting a
 * 400-word alt attribute mid-paragraph loses their place. The detail belongs in
 * the description, which they can choose to open.
 */
export function shortAlt(spec, d) {
  const base = tidy(`${d.shape.replace(/\.$/, '')} titled "${spec.title}"`);
  if (base.length <= SHORT_ALT_MAX) return base;
  return tidy(`${spec.title}. ${d.shape}`).slice(0, SHORT_ALT_MAX - 1).replace(/\s\S*$/, '') + '.';
}

/**
 * Full alt. The complete content of the graphic as continuous prose.
 * This populates `data-ally-user-updated-alt`.
 */
export function fullAlt(spec, d) {
  const parts = [
    tidy(d.shape),
    tidy(d.structure),
    ...d.items.map((i) => tidy(`${i.key}: ${i.value}`)),
  ];
  return parts.filter(Boolean).join(' ');
}

/**
 * Which palette entries this visual actually used, described in words.
 * Colour is never the only channel, and the description says so, because a
 * learner using the text version needs to know they are not missing a signal.
 */
function coloursLayout(d, spec) {
  const used = SERIES.slice(0, Math.max(1, Math.min(SERIES.length, d.items.length)));
  const names = uniq(used.map((s) => s.name));
  return [
    `Drawn in the RMIT palette on a white background, with navy ${BRAND.ink} text.`,
    names.length > 1
      ? `Accent colours in use: ${names.join(', ')}.`
      : 'A single navy accent colour.',
    'No information is carried by colour alone. Every coloured element also carries a number, a label or a texture, so nothing is lost in greyscale or by a learner with colour vision deficiency.',
    tidy(spec.caption || ''),
  ].filter(Boolean).join(' ');
}

/**
 * The five-part image description, using the exact house labels in the exact
 * house order. Returned as structured data so both the Markdown and the Emble
 * HTML emitters can render it without re-deriving anything.
 */
export function fivePart(spec, d) {
  return [
    {
      label: 'Main subject/content',
      value: tidy(`${spec.title}. ${d.shape}`),
      supporting: d.items.map((i) => tidy(`${i.key}: ${i.value}`)),
    },
    {
      label: 'Important visual details',
      value: tidy(d.marks),
      supporting: [],
    },
    {
      label: 'Relevant structure such as columns, layers, or groupings',
      value: tidy(d.structure),
      supporting: [],
    },
    {
      label: 'Colours/layout',
      value: coloursLayout(d, spec),
      supporting: [],
    },
    {
      label: 'Visible text',
      value: '',
      supporting: uniq(d.visibleText),
    },
  ];
}

/**
 * A standalone plain-text version of the whole visual.
 *
 * Worth producing in its own right. Some learners prefer it, it is what gets
 * pasted into a transcript or a printed handout, and it is the fallback when a
 * graphic fails to load.
 */
export function textEquivalent(spec, d) {
  const lines = [
    `${spec.title}`,
    ''.padEnd(spec.title.length, '='),
    '',
    `What this shows: ${tidy(d.shape)}`,
    `How it is arranged: ${tidy(d.structure)}`,
    '',
    'Contents:',
    ...d.items.map((i) => `  - ${i.key}: ${tidy(i.value)}`),
  ];
  if (spec.caption) lines.push('', tidy(spec.caption));
  if (spec.source) lines.push('', `Source: ${spec.source}`);
  return lines.join('\n');
}

/**
 * Build every accessibility artefact for a visual in one call.
 */
export function accessibility(spec, d) {
  return {
    shortAlt: shortAlt(spec, d),
    fullAlt: fullAlt(spec, d),
    fivePart: fivePart(spec, d),
    textEquivalent: textEquivalent(spec, d),
  };
}

/**
 * Checks that run before anything is presented to a teacher.
 * Returns a list of problems. An empty list means the visual is fit to ship.
 */
export function audit(spec, d, a11y) {
  const problems = [];

  if (!a11y.shortAlt || a11y.shortAlt.length < 12) {
    problems.push('Short alt text is missing or too short to be useful.');
  }
  if (a11y.shortAlt.length > SHORT_ALT_MAX + 20) {
    problems.push(`Short alt text is ${a11y.shortAlt.length} characters. Keep it near ${SHORT_ALT_MAX} so it does not swamp the sentence it sits in.`);
  }
  if (/^(image|graphic|picture|diagram) of/i.test(a11y.shortAlt)) {
    problems.push('Short alt text starts with "image of". A screen reader already announces it as an image.');
  }
  if (!a11y.fullAlt || a11y.fullAlt.length <= a11y.shortAlt.length) {
    problems.push('Full alt text carries no more information than the short alt.');
  }

  const visible = a11y.fivePart.find((p) => p.label === 'Visible text');
  if (!visible.supporting.length) {
    problems.push('Visible text list is empty. Every word that appears in the graphic must be listed.');
  }

  if (!spec.intent) {
    problems.push('The spec has no learning intent, so there is no way to tell whether this visual earns its place.');
  }

  // Every item in the picture must appear somewhere in the text.
  const haystack = a11y.fullAlt.toLowerCase();
  const missing = d.items.filter((i) => !haystack.includes(String(i.key).toLowerCase().slice(0, 24)));
  if (missing.length) {
    problems.push(`${missing.length} item(s) shown in the graphic do not appear in the text equivalent.`);
  }

  return problems;
}

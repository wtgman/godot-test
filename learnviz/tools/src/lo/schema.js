/**
 * The learning object: one spec that becomes every rendition.
 *
 * A learning object is a pattern (what the learner does), the content for that
 * pattern, and, where it helps, a figure. Around that sit the fields that make
 * it usable by the other people in the chain: where it goes in the week, what
 * the teacher should say, and where every claim in it came from.
 */

import { SpecError, fail, str, num, arr, oneOf, bool } from '../validate.js';
import { validate as validateFigure } from '../spec.js';
import { isStatic } from '../renderers/index.js';

export const PLACEMENTS = ['before', 'during', 'after', 'any'];

/**
 * Where a source came from. `constructed` is for material written for the
 * activity, such as a scenario or a client's words, which needs checking for
 * realism rather than for accuracy.
 */
export const SOURCE_KINDS = ['supplied', 'research', 'teacher', 'constructed', 'general'];

/**
 * `verified` means a person checked it. Nothing this toolkit or a language
 * model produces is ever verified on its own say-so, so anything generated
 * starts as `to-check`.
 */
export const SOURCE_STATUS = ['verified', 'to-check'];

/**
 * Validate an embedded figure. It inherits the learning object's title and
 * intent unless it has its own, because an embedded figure rarely needs a
 * separate heading, and it must be a static type because it is drawn at build
 * time.
 */
export function figureSpec(raw, lo, path) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail(path, 'must be a figure object with a "type"');
  }
  if (!isStatic(raw.type)) {
    fail(`${path}.type`, `is "${raw.type}", which is not a figure. Use one of the static figure types: timeline, process, cycle, gantt, comparison, hierarchy, chart, labelled, stat, waffle.`);
  }
  const merged = { title: lo.title, intent: lo.intent, ...raw };
  try {
    return validateFigure(merged);
  } catch (e) {
    if (e instanceof SpecError) throw new SpecError(`${path}.${e.message}`);
    throw e;
  }
}

/** The fields every learning object carries, whatever its pattern. */
export function validateCommon(raw, patterns) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('spec', 'must be a JSON object');
  if (raw.kind !== 'learning-object') {
    fail('kind', 'must be "learning-object". A figure on its own has no kind, and a proposal has kind "proposal".');
  }
  oneOf(raw.pattern, 'pattern', Object.keys(patterns), { what: 'pattern' });
  str(raw.title, 'title', { max: 120 });
  str(raw.intent, 'intent', { max: 300 });
  str(raw.lede, 'lede', { required: false, max: 400 });
  // The learner-facing version of the intent, shown as "After this, you can ...".
  str(raw.goal, 'goal', { required: false, max: 300 });
  if (raw.placement !== undefined) oneOf(raw.placement, 'placement', PLACEMENTS, { what: 'placement' });
  if (raw.passMark !== undefined) {
    num(raw.passMark, 'passMark');
    if (raw.passMark <= 0 || raw.passMark > 1) fail('passMark', 'is a proportion, between 0 and 1. Use 0.8 for 80 per cent.');
  }
  if (raw.status !== undefined) oneOf(raw.status, 'status', ['draft', 'release'], { what: 'status' });
  bool(raw.sketch, 'sketch');

  if (raw.teach !== undefined) {
    const t = raw.teach;
    if (!t || typeof t !== 'object') fail('teach', 'must be an object');
    for (const k of ['before', 'during', 'after', 'watchFor']) str(t[k], `teach.${k}`, { required: false, max: 600 });
    if (t.ask !== undefined) {
      arr(t.ask, 'teach.ask', { min: 1, max: 5 }).forEach((q, i) => str(q, `teach.ask[${i}]`, { max: 240 }));
    }
    if (t.say !== undefined) {
      arr(t.say, 'teach.say', { min: 1, max: 30 }).forEach((q, i) => str(q, `teach.say[${i}]`, { max: 400 }));
    }
  }

  if (raw.sources !== undefined) {
    arr(raw.sources, 'sources', { min: 0, max: 16 }).forEach((s, i) => {
      str(s.label, `sources[${i}].label`, { max: 240 });
      str(s.url, `sources[${i}].url`, { required: false, max: 500 });
      if (s.url !== undefined && !/^https?:\/\//.test(s.url)) fail(`sources[${i}].url`, 'must start with http:// or https://');
      str(s.note, `sources[${i}].note`, { required: false, max: 400 });
      oneOf(s.kind, `sources[${i}].kind`, SOURCE_KINDS, { what: 'source kind' });
      oneOf(s.status, `sources[${i}].status`, SOURCE_STATUS, { what: 'source status' });
    });
  }
}

/**
 * Is this a draft? A draft builds, but carries a visible banner and cannot be
 * built with --release. The reasons are shown on the banner and in the review
 * sheet, so the teacher knows exactly what is outstanding.
 */
export function draftState(lo) {
  const reasons = [];
  if (lo.sketch) reasons.push('This is a sketch with placeholder content.');
  if (lo.status === 'draft') reasons.push('Marked as a draft.');
  const unchecked = (lo.sources || []).filter((s) => s.status === 'to-check').length;
  if (unchecked) reasons.push(`${unchecked} source${unchecked === 1 ? '' : 's'} still to check.`);
  return { isDraft: reasons.length > 0, reasons };
}

export { SpecError, fail, str, num, arr, oneOf, bool };

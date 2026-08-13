/**
 * The proposal. What gets produced *before* anything is built.
 *
 * Building the first visual that comes to mind is the main way this tool could
 * waste a teacher's time. The obvious visual is usually the one already implied
 * by the prose, so it adds nothing, and it crowds out the angle nobody had
 * thought of. Worse, once an artefact exists people edit it rather than ask
 * whether it was the right artefact.
 *
 * So the default output is a menu, not a picture. A short brief that says what
 * shapes are latent in the content, what questions would change the answer,
 * what could be built, what it would take, and which one to pick.
 *
 * The part that has to be enforced rather than trusted is **data provenance**.
 * Every candidate declares where its numbers come from before anyone commits to
 * building it. A candidate that needs figures nobody has is caught here, at the
 * cost of one line in a brief, rather than after someone has published a chart
 * of numbers that were quietly invented.
 */

import { SpecError, fail, str, arr, oneOf, bool } from './validate.js';
import { VISUAL_TYPES } from './spec.js';

/**
 * Where a candidate's content comes from. The whole point of the field is that
 * `in-source` and `invented` are not the same thing and must never blur.
 */
export const DATA_STATUS = {
  'none-needed': {
    label: 'No data needed',
    note: 'Structural. Everything required is already described in the source.',
    blocking: false,
  },
  'in-source': {
    label: 'Data is in the source',
    note: 'Every figure comes from the supplied content and can be checked against it.',
    blocking: false,
  },
  'needs-teacher': {
    label: 'Needs figures from you',
    note: 'The shape is right but the numbers have to come from the unit guide, the cohort or the workplace.',
    blocking: true,
  },
  'needs-research': {
    label: 'Needs sourcing and verification',
    note: 'The figures exist publicly but must be found, cited and checked before this is built.',
    blocking: true,
  },
  'unavailable': {
    label: 'Data does not exist',
    note: 'Proposed, then ruled out because the figures are not public or not separable. Kept here so nobody proposes it again.',
    blocking: true,
  },
};

export const EFFORT = ['low', 'medium', 'high'];

/**
 * Validate a proposal. Returns a frozen copy.
 */
export function validateProposal(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail('proposal', 'must be a JSON object');
  }
  if (raw.kind !== 'proposal') {
    fail('kind', 'must be the string "proposal", so a proposal cannot be mistaken for a spec');
  }

  str(raw.topic, 'topic', { max: 160 });
  str(raw.sourceSummary, 'sourceSummary', { max: 900 });
  str(raw.audience, 'audience', { required: false, max: 200 });

  // Questions are optional in principle but the brief is much weaker without
  // them, so the cap is low enough to force a choice about which ones matter.
  if (raw.questions !== undefined) {
    arr(raw.questions, 'questions', {
      min: 0,
      max: 6,
      overMessage: (n) => `has ${n} questions. More than 6 stops being a clarification and becomes an interview, and it will not get answered. Ask the ones that change what you build.`,
    }).forEach((q, i) => {
      str(q.ask, `questions[${i}].ask`, { max: 240 });
      str(q.why, `questions[${i}].why`, { max: 300 });
      if (q.options !== undefined) {
        arr(q.options, `questions[${i}].options`, { min: 2, max: 5 })
          .forEach((o, j) => str(o, `questions[${i}].options[${j}]`, { max: 120 }));
      }
    });
  }

  const candidates = arr(raw.candidates, 'candidates', {
    min: 2,
    max: 8,
    overMessage: (n) => `has ${n} candidates. More than 8 is a catalogue, not a choice, and nobody reads to the bottom. Cut to the ones you would actually build.`,
  });

  candidates.forEach((c, i) => {
    const at = `candidates[${i}]`;
    str(c.name, `${at}.name`, { max: 120 });
    oneOf(c.type, `${at}.type`, VISUAL_TYPES, { what: 'visual type' });
    str(c.angle, `${at}.angle`, { max: 400 });
    str(c.payoff, `${at}.payoff`, { max: 300 });
    oneOf(c.effort, `${at}.effort`, EFFORT, { what: 'effort level' });
    bool(c.recommended, `${at}.recommended`);

    if (!c.data || typeof c.data !== 'object') {
      fail(`${at}.data`, 'is required. Every candidate must say where its content comes from before anyone builds it.');
    }
    oneOf(c.data.status, `${at}.data.status`, Object.keys(DATA_STATUS), { what: 'data status' });

    // A blocking status without a statement of what is missing is useless: the
    // teacher cannot act on "needs figures" without knowing which figures.
    if (DATA_STATUS[c.data.status].blocking) {
      str(c.data.needs, `${at}.data.needs`, { max: 400 });
    } else {
      str(c.data.needs, `${at}.data.needs`, { required: false, max: 400 });
    }
  });

  const recommended = candidates.filter((c) => c.recommended);
  if (recommended.length === 0) {
    fail('candidates', 'has no candidate marked `recommended`. A menu with no recommendation pushes the decision back onto the teacher, which is the work they asked you to do. Pick one or two.');
  }
  if (recommended.length > 2) {
    fail('candidates', `marks ${recommended.length} candidates as recommended. Recommending most of the list is not a recommendation. Pick one or two.`);
  }

  // Anything ruled out, with the reason. This is where the value is on
  // well-known content: it records why the obvious visual was not built.
  if (raw.rejected !== undefined) {
    arr(raw.rejected, 'rejected', { min: 0, max: 8 }).forEach((r, i) => {
      str(r.name, `rejected[${i}].name`, { max: 120 });
      str(r.because, `rejected[${i}].because`, { max: 400 });
      if (r.type !== undefined) oneOf(r.type, `rejected[${i}].type`, VISUAL_TYPES, { what: 'visual type' });
    });
  }

  return Object.freeze(structuredClone(raw));
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

const STATUS_ORDER = ['none-needed', 'in-source', 'needs-teacher', 'needs-research', 'unavailable'];

function candidateBlock(c, number) {
  const status = DATA_STATUS[c.data.status];
  const lines = [
    `### ${number}. ${c.name}`,
    '',
    `\`${c.type}\` · ${status.label} · ${c.effort} effort`,
    '',
    `**The angle.** ${c.angle}`,
    '',
    `**What a learner can do after it.** ${c.payoff}`,
  ];
  if (c.data.needs) {
    lines.push('', `**What it needs.** ${c.data.needs}`);
  }
  return lines.join('\n');
}

/**
 * Render a validated proposal as a brief a teacher can read in a minute and
 * reply to with a list of numbers.
 */
export function renderProposal(proposal) {
  const { topic, sourceSummary, audience, candidates } = proposal;
  const questions = proposal.questions || [];
  const rejected = proposal.rejected || [];

  const recommended = candidates.filter((c) => c.recommended);
  const others = candidates.filter((c) => !c.recommended);

  const out = [
    `# Visual options: ${topic}`,
    '',
    sourceSummary,
  ];

  if (audience) out.push('', `**Who it is for.** ${audience}`);

  if (questions.length) {
    out.push('', `## ${questions.length} question${questions.length === 1 ? '' : 's'} before I build`, '');
    questions.forEach((q, i) => {
      out.push(`**${i + 1}. ${q.ask}**`);
      out.push('');
      out.push(`${q.why}`);
      if (q.options?.length) {
        out.push('');
        out.push(q.options.map((o) => `- ${o}`).join('\n'));
      }
      out.push('');
    });
  }

  // Numbering runs across both sections so the teacher can reply "1 and 4".
  let n = 0;
  out.push('', '## Recommended', '');
  for (const c of recommended) {
    n += 1;
    out.push(candidateBlock(c, n), '');
  }

  if (others.length) {
    out.push('## Also possible', '');
    for (const c of others) {
      n += 1;
      out.push(candidateBlock(c, n), '');
    }
  }

  if (rejected.length) {
    out.push('## Considered and ruled out', '');
    for (const r of rejected) {
      out.push(`- **${r.name}**${r.type ? ` (\`${r.type}\`)` : ''}. ${r.because}`);
    }
    out.push('');
  }

  const blocking = candidates.filter((c) => DATA_STATUS[c.data.status].blocking);
  if (blocking.length) {
    out.push('## Before any of these can be built', '');
    for (const c of blocking) {
      out.push(`- **${c.name}**: ${DATA_STATUS[c.data.status].label.toLowerCase()}. ${c.data.needs}`);
    }
    out.push('');
  }

  out.push('## Next step', '');
  out.push(`Reply with the numbers you want built, from 1 to ${n}. Answer the questions above if any of them change your choice. Nothing is built until you say so.`);
  out.push('');

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** One-line summary per candidate, for the terminal. */
export function summariseProposal(proposal) {
  const rows = proposal.candidates.map((c, i) => ({
    n: i + 1,
    name: c.name,
    type: c.type,
    status: c.data.status,
    effort: c.effort,
    recommended: Boolean(c.recommended),
  }));
  rows.sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
  });
  return rows;
}

export { SpecError };

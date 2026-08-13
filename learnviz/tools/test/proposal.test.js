/**
 * Tests for the proposal step.
 *
 * The proposal exists to stop two failure modes: building the first visual that
 * comes to mind, and building a visual whose numbers nobody actually has. The
 * rules below are what enforce the second one, so they are worth pinning.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateProposal, renderProposal, summariseProposal, DATA_STATUS, SpecError,
} from '../src/proposal.js';

const BASE = {
  kind: 'proposal',
  topic: 'The Instagram acquisition',
  sourceSummary: 'Launch October 2010, acquired April 2012 for one billion dollars, thirteen employees, no revenue.',
  questions: [
    { ask: 'Valuation or strategy?', why: 'The two lead to different comparison sets.', options: ['Valuation', 'Strategy'] },
  ],
  candidates: [
    {
      name: 'One billion dollars, compared to what',
      type: 'chart',
      angle: 'A price is only readable next to other prices.',
      payoff: 'Learners can place an acquisition price in context.',
      data: { status: 'needs-research', needs: 'Announced prices for four comparable acquisitions, each with a citable source.' },
      effort: 'medium',
      recommended: true,
    },
    {
      name: 'The acquisition in four numbers',
      type: 'stat',
      angle: 'Let the figures land as figures.',
      payoff: 'Learners can state what was actually bought.',
      data: { status: 'in-source' },
      effort: 'low',
    },
  ],
  rejected: [
    { name: "Instagram's profit over time", type: 'chart', because: 'Meta has never reported it separately, so there is no figure to chart.' },
  ],
};

const clone = (patch = {}) => ({ ...structuredClone(BASE), ...patch });

describe('proposal validation', () => {
  test('a well-formed proposal validates and is frozen', () => {
    const p = validateProposal(BASE);
    assert.equal(p.topic, BASE.topic);
    assert.ok(Object.isFrozen(p));
  });

  test('a spec cannot be mistaken for a proposal', () => {
    assert.throws(
      () => validateProposal({ ...BASE, kind: 'spec' }),
      (e) => e instanceof SpecError && /must be the string "proposal"/.test(e.message),
    );
  });

  test('every candidate must declare where its data comes from', () => {
    // The whole point of the step. Without this a candidate can be built from
    // figures nobody has, and nobody finds out until it is published.
    const bad = clone();
    delete bad.candidates[0].data;
    assert.throws(
      () => validateProposal(bad),
      (e) => /must say where its content comes from/.test(e.message),
    );
  });

  test('a blocking data status must say what specifically is missing', () => {
    // "Needs figures" is not something a teacher can act on.
    for (const status of Object.keys(DATA_STATUS).filter((s) => DATA_STATUS[s].blocking)) {
      const bad = clone();
      bad.candidates[0].data = { status };
      assert.throws(
        () => validateProposal(bad),
        SpecError,
        `${status} should require a needs statement`,
      );
    }
  });

  test('a non-blocking status does not require one', () => {
    const ok = clone();
    ok.candidates[0].data = { status: 'in-source' };
    assert.doesNotThrow(() => validateProposal(ok));
  });

  test('an unknown data status names the valid ones', () => {
    const bad = clone();
    bad.candidates[0].data = { status: 'probably-fine', needs: 'x' };
    assert.throws(
      () => validateProposal(bad),
      (e) => /needs-research/.test(e.message) && /unavailable/.test(e.message),
    );
  });

  test('a candidate must name a real visual type', () => {
    const bad = clone();
    bad.candidates[0].type = 'infographic';
    assert.throws(() => validateProposal(bad), (e) => /timeline/.test(e.message));
  });

  test('a proposal that recommends nothing is rejected', () => {
    const bad = clone();
    bad.candidates.forEach((c) => { c.recommended = false; });
    assert.throws(
      () => validateProposal(bad),
      (e) => /no candidate marked `recommended`/.test(e.message),
    );
  });

  test('a proposal that recommends everything is rejected', () => {
    const bad = clone();
    bad.candidates = [
      ...bad.candidates.map((c) => ({ ...c, recommended: true })),
      { ...structuredClone(BASE.candidates[1]), name: 'A third', recommended: true },
    ];
    assert.throws(
      () => validateProposal(bad),
      (e) => /Recommending most of the list is not a recommendation/.test(e.message),
    );
  });

  test('too many questions is an interview, and is rejected', () => {
    const bad = clone();
    bad.questions = Array.from({ length: 7 }, (_, i) => ({
      ask: `Question ${i}?`, why: 'Because.',
    }));
    assert.throws(() => validateProposal(bad), (e) => /becomes an interview/.test(e.message));
  });

  test('too many candidates is a catalogue, and is rejected', () => {
    const bad = clone();
    bad.candidates = Array.from({ length: 9 }, (_, i) => ({
      ...structuredClone(BASE.candidates[1]), name: `Candidate ${i}`,
    }));
    bad.candidates[0].recommended = true;
    assert.throws(() => validateProposal(bad), (e) => /is a catalogue, not a choice/.test(e.message));
  });

  test('at least two candidates, because one is not a choice', () => {
    const bad = clone();
    bad.candidates = [structuredClone(BASE.candidates[0])];
    assert.throws(() => validateProposal(bad), SpecError);
  });
});

describe('proposal rendering', () => {
  test('the brief carries every candidate, numbered across both sections', () => {
    const brief = renderProposal(validateProposal(BASE));
    assert.match(brief, /### 1\. One billion dollars, compared to what/);
    assert.match(brief, /### 2\. The acquisition in four numbers/);
    assert.match(brief, /## Recommended/);
    assert.match(brief, /## Also possible/);
  });

  test('the brief lists what must be sorted out before anything can be built', () => {
    const brief = renderProposal(validateProposal(BASE));
    assert.match(brief, /## Before any of these can be built/);
    assert.match(brief, /Announced prices for four comparable acquisitions/);
  });

  test('the brief records what was ruled out and why', () => {
    const brief = renderProposal(validateProposal(BASE));
    assert.match(brief, /## Considered and ruled out/);
    assert.match(brief, /never reported it separately/);
  });

  test('the brief ends by asking for a choice, not by presenting work', () => {
    const brief = renderProposal(validateProposal(BASE));
    assert.match(brief, /Nothing is built until you say so\./);
    assert.match(brief, /Reply with the numbers you want built, from 1 to 2\./);
  });

  test('a proposal with nothing blocking omits the blockers section', () => {
    const ok = clone();
    ok.candidates[0].data = { status: 'none-needed' };
    const brief = renderProposal(validateProposal(ok));
    assert.ok(!brief.includes('## Before any of these can be built'));
  });

  test('the summary puts recommendations first, then the least blocked', () => {
    const rows = summariseProposal(validateProposal(BASE));
    assert.equal(rows[0].recommended, true);
    assert.equal(rows[0].n, 1);
    assert.equal(rows[1].name, 'The acquisition in four numbers');
  });
});

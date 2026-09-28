/**
 * Tests for the proposal step.
 *
 * The proposal exists to stop two failure modes: building the first thing that
 * comes to mind, and building something whose content nobody actually has. The
 * rules below enforce both, so they are worth pinning.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateProposal, renderProposal, renderGallery, summariseProposal, SpecError,
} from '../src/proposal.js';

const SKETCH = {
  kind: 'learning-object',
  pattern: 'cards',
  title: 'Deal terms',
  intent: 'Learners can recall the terms of the deal.',
  sketch: true,
  cards: [
    { front: 'Announced price', back: 'About US$1 billion' },
    { front: 'Staff', back: 'Thirteen' },
    { front: 'Revenue', back: 'None' },
  ],
};

const BASE = {
  kind: 'proposal',
  topic: 'The Instagram acquisition',
  sourceSummary: 'Launch October 2010, acquired April 2012 for a headline one billion dollars, thirteen staff, no revenue.',
  analysis: {
    keyIdeas: ['A price only means something next to other prices.'],
    threshold: 'Platforms were bought for users and attention, not profit.',
    misconceptions: [{ belief: 'The announced price is what was paid.', reality: 'It was mostly shares, which fell before the deal closed.' }],
  },
  questions: [
    { ask: 'Valuation or strategy?', why: 'The two lead to different comparison sets.', options: ['Valuation', 'Strategy'] },
  ],
  candidates: [
    {
      name: 'What was Instagram worth?',
      pattern: 'estimate',
      placement: 'before',
      angle: 'Guess the hidden prices, then see them.',
      payoff: 'Learners can place an acquisition price in context.',
      data: { status: 'needs-research', needs: 'Announced prices for four comparable acquisitions, each with a citable source.' },
      effort: 'medium',
      recommended: true,
    },
    {
      name: 'The deal in three cards',
      pattern: 'cards',
      placement: 'after',
      angle: 'Recall the terms.',
      payoff: 'Learners can state what was actually bought.',
      data: { status: 'in-source' },
      effort: 'low',
      sketch: SKETCH,
    },
  ],
  rejected: [
    { name: "Instagram's profit over time", because: 'Meta has never reported it separately, so there is no figure to chart.' },
  ],
};

const clone = (patch = {}) => ({ ...structuredClone(BASE), ...patch });
const withCandidate = (i, patch) => {
  const p = clone();
  p.candidates[i] = { ...p.candidates[i], ...patch };
  return p;
};
const rejects = (p, pattern) => assert.throws(() => validateProposal(p), (e) => e instanceof SpecError && pattern.test(e.message));

describe('proposal validation', () => {
  test('a well-formed proposal validates and is frozen', () => {
    const p = validateProposal(BASE);
    assert.equal(p.topic, BASE.topic);
    assert.ok(Object.isFrozen(p));
  });

  test('a spec cannot be mistaken for a proposal', () => {
    rejects({ ...BASE, kind: 'spec' }, /must be the string "proposal"/);
  });

  test('the analysis is required, because the candidates answer to it', () => {
    const p = clone();
    delete p.analysis;
    rejects(p, /analysis/);
  });

  test('more than six key ideas is a summary, not an analysis', () => {
    rejects(clone({ analysis: { keyIdeas: Array(7).fill('An idea.') } }), /not an analysis/);
  });

  test('every candidate must declare where its content comes from', () => {
    rejects(withCandidate(0, { data: undefined }), /where its content comes from/);
  });

  test('a blocking status must say what is missing', () => {
    rejects(withCandidate(0, { data: { status: 'needs-teacher' } }), /data\.needs/);
  });

  test('a non-blocking status does not need to', () => {
    assert.doesNotThrow(() => validateProposal(withCandidate(0, { data: { status: 'none-needed' } })));
  });

  test('an unknown data status names the valid ones', () => {
    rejects(withCandidate(0, { data: { status: 'probably-fine' } }), /in-source/);
  });

  test('a candidate names a real pattern, not a first-version visual type', () => {
    rejects(withCandidate(0, { pattern: undefined, type: 'chart' }), /pattern/);
    rejects(withCandidate(0, { pattern: 'quiz' }), /predict/);
  });

  test('a candidate says where it goes in the week', () => {
    rejects(withCandidate(0, { placement: undefined }), /placement/);
  });

  test('a proposal that recommends nothing is rejected', () => {
    rejects(withCandidate(0, { recommended: false }), /no candidate marked/);
  });

  test('recommending more than a short arc is rejected', () => {
    const p = clone();
    p.candidates = Array.from({ length: 4 }, (_, i) => ({ ...BASE.candidates[0], name: `Option ${i}`, recommended: true }));
    rejects(p, /one to three/);
  });

  test('too many questions is an interview, and is rejected', () => {
    rejects(clone({ questions: Array(7).fill(BASE.questions[0]) }), /interview/);
  });

  test('too many candidates is a catalogue, and is rejected', () => {
    rejects(clone({ candidates: Array(9).fill(BASE.candidates[0]) }), /catalogue/);
  });
});

describe('sketches', () => {
  test('a sketch is validated as a learning object, with its path in the error', () => {
    rejects(withCandidate(1, { sketch: { ...SKETCH, cards: [] } }), /candidates\[1\]\.sketch\.cards/);
  });

  test('a sketch must be the pattern the candidate claims', () => {
    rejects(withCandidate(1, { pattern: 'sort' }), /candidate says "sort"/);
  });

  test('a sketch in a proposal can never build as finished', () => {
    const finished = { ...SKETCH, sketch: undefined };
    rejects(withCandidate(1, { sketch: finished }), /must be a draft/);
  });

  test('a sketch whose sources are still to check counts as a draft', () => {
    const draft = { ...SKETCH, sketch: undefined, sources: [{ label: 'Reporting', kind: 'research', status: 'to-check' }] };
    assert.doesNotThrow(() => validateProposal(withCandidate(1, { sketch: draft })));
  });
});

describe('the brief', () => {
  const brief = renderProposal(validateProposal(BASE));

  test('numbers the recommended options first, across every section', () => {
    assert.match(brief, /### 1\. What was Instagram worth\?/);
    assert.match(brief, /### 2\. The deal in three cards/);
  });

  test('leads with what matters, before any option', () => {
    assert.ok(brief.indexOf('## What matters here') < brief.indexOf('## The options'));
    assert.match(brief, /The idea that unlocks the rest/);
  });

  test('lists what must be sorted out before release', () => {
    assert.match(brief, /## Before these can be released/);
    assert.match(brief, /Announced prices for four comparable acquisitions/);
  });

  test('records what was ruled out and why', () => {
    assert.match(brief, /## Considered and ruled out[\s\S]*never reported it separately/);
  });

  test('ends by asking for a choice, not by presenting work', () => {
    assert.match(brief.trim().split('\n').pop(), /Nothing is built until you choose/);
  });

  test('omits the blockers section when nothing is blocked', () => {
    const p = withCandidate(0, { data: { status: 'none-needed' } });
    assert.ok(!renderProposal(validateProposal(p)).includes('Before these can be released'));
  });

  test('the terminal summary follows the brief numbering', () => {
    const rows = summariseProposal(validateProposal(BASE));
    assert.deepEqual(rows.map((r) => [r.n, r.recommended, r.sketch]), [[1, true, false], [2, false, true]]);
  });
});

describe('the gallery', () => {
  const html = renderGallery(validateProposal(BASE));

  test('embeds each sketch as a live preview, with the draft banner inside', () => {
    const frames = html.match(/<iframe[^>]*srcdoc="[^"]*"[^>]*>/g) || [];
    assert.equal(frames.length, 1);
    assert.match(frames[0], /title="Sketch of option 2/);
    assert.match(frames[0], /Draft for review/);
  });

  test('the preview markup cannot break out of its attribute', () => {
    const src = html.match(/srcdoc="([^"]*)"/)[1];
    assert.ok(!src.includes('<'), 'raw < inside srcdoc');
    assert.ok(src.includes('&lt;!doctype html&gt;'));
  });

  test('an option without a sketch says what it is waiting for', () => {
    assert.match(html, /No sketch yet\. Announced prices for four comparable acquisitions/);
  });

  test('every option can be ticked, and the page composes a reply', () => {
    assert.equal((html.match(/<input type="checkbox" value="\d+">/g) || []).length, 2);
    assert.match(html, /Please build/);
  });

  test('is self-contained and deterministic', () => {
    assert.ok(!/<script[^>]+src=/i.test(html));
    assert.ok(!/<link[^>]+stylesheet/i.test(html));
    assert.equal(html, renderGallery(validateProposal(BASE)));
  });
});

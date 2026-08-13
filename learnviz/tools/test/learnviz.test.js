/**
 * Tests for the invariants that matter.
 *
 * These are not coverage-chasing tests. Each one guards a property that, if it
 * broke silently, would put an inaccessible or misleading graphic in front of a
 * student: contrast, the text equivalent matching the picture, honest axes,
 * determinism, and Canvas-safe markup.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { assertPaletteAccessible, assertPaletteDistinct, deltaE, MIN_DELTA_E, SERIES, BRAND } from '../src/theme.js';
import { validate, SpecError, VISUAL_TYPES, INTERACTIVE_TYPES } from '../src/spec.js';
import { render } from '../src/renderers/index.js';
import { build } from '../src/interactive/index.js';
import { audit } from '../src/a11y.js';
import { diagramBlock, interactiveBlock } from '../src/emble.js';
import { measure, wrap, esc } from '../src/svg.js';

/* ------------------------------------------------------------------ */
/* Fixtures, one valid spec per type.                                  */
/* ------------------------------------------------------------------ */

const FIXTURES = {
  timeline: {
    type: 'timeline', title: 'Rise of a platform', intent: 'Learners can order the pivots.',
    events: [
      { date: '2010', label: 'Launch', detail: 'iPhone only.' },
      { date: '2012', label: 'Acquired', detail: 'One billion dollars.', emphasis: true },
      { date: '2016', label: 'Stories', detail: 'Answering a competitor.' },
    ],
  },
  process: {
    type: 'process', title: 'Handling a complaint', intent: 'Learners can follow the steps.',
    steps: [
      { label: 'Listen', detail: 'Do not interrupt.' },
      { label: 'Acknowledge', detail: 'Name the problem.' },
      { label: 'Resolve', detail: 'Offer the remedy.' },
    ],
  },
  cycle: {
    type: 'cycle', title: 'Improvement cycle', intent: 'Learners can explain why it repeats.',
    stages: [
      { label: 'Plan', detail: 'Set a target.' },
      { label: 'Do', detail: 'Try it small.' },
      { label: 'Check', detail: 'Compare.' },
      { label: 'Act', detail: 'Keep or drop.' },
    ],
  },
  gantt: {
    type: 'gantt', title: 'Roast timing', intent: 'Learners can plan backwards.',
    timeUnit: 'minutes',
    tasks: [
      { label: 'Lamb', start: 0, duration: 90, track: 'Oven', note: 'Rest before carving.' },
      { label: 'Potatoes', start: 60, duration: 45, track: 'Oven' },
      { label: 'Beans', start: 95, duration: 8, track: 'Stovetop' },
    ],
    milestones: [{ at: 105, label: 'Serve' }],
  },
  comparison: {
    type: 'comparison', title: 'Embed routes', intent: 'Learners can choose a route.',
    criteria: ['Runs JavaScript', 'Effort'],
    items: [
      { label: 'Image', values: ['No', 'Low'] },
      { label: 'H5P', values: ['Yes', 'Medium'] },
    ],
  },
  hierarchy: {
    type: 'hierarchy', title: 'Work breakdown', intent: 'Learners can decompose a deliverable.',
    root: {
      label: 'Garden build',
      children: [
        { label: 'Site prep', children: [{ label: 'Clear ground' }, { label: 'Test soil' }] },
        { label: 'Construction', children: [{ label: 'Build beds' }] },
      ],
    },
  },
  chart: {
    type: 'chart', title: 'Enrolments', intent: 'Learners can read the trend.',
    mode: 'bar', xLabel: 'Year', yLabel: 'Enrolments',
    categories: ['2023', '2024'],
    series: [
      { label: 'On campus', values: [390, 365] },
      { label: 'Online', values: [260, 340] },
    ],
  },
  labelled: {
    type: 'labelled', title: 'Coffee machine parts', intent: 'Learners can name each part.',
    subject: 'an espresso machine',
    parts: [
      { label: 'Group head', x: 30, y: 55, detail: 'Portafilter locks in here.' },
      { label: 'Steam wand', x: 72, y: 48 },
    ],
  },
  sequencer: {
    type: 'sequencer', title: 'Timing a roast', intent: 'Learners can plan backwards.',
    timeUnit: 'minutes', prompt: 'When does each task start?',
    items: [
      { label: 'Lamb in', at: 0, because: 'Longest cook plus resting.' },
      { label: 'Potatoes in', at: 60, because: 'Forty five minutes to crisp.' },
      { label: 'Beans on', at: 95, because: 'Green vegetables go last.' },
    ],
  },
  simulation: {
    type: 'simulation', model: 'orbit', title: 'Orbital periods',
    intent: "Learners can predict how period changes with distance.",
    parameters: [{ key: 'mass', label: 'Star mass', min: 0.2, max: 3, value: 1, unit: 'solar masses' }],
    bodies: [
      { label: 'Earth', distance: 1, radius: 7 },
      { label: 'Jupiter', distance: 5.2, radius: 13 },
    ],
  },
};

const staticTypes = VISUAL_TYPES.filter((t) => !INTERACTIVE_TYPES.has(t));

/* ------------------------------------------------------------------ */

describe('palette', () => {
  test('every colour pair meets WCAG 2.2 AA', () => {
    assert.equal(assertPaletteAccessible(), true);
  });

  test('no two series colours are perceptually close', () => {
    // Every pair, not just adjacent ones: a chart with four series puts the
    // first and the fourth side by side in the legend. Measured as Lab
    // distance, because contrast ratio only compares lightness and would call
    // pure red and pure blue identical.
    assert.equal(assertPaletteDistinct(), true);
    for (let i = 0; i < SERIES.length; i += 1) {
      for (let j = i + 1; j < SERIES.length; j += 1) {
        const d = deltaE(SERIES[i].fill, SERIES[j].fill);
        assert.ok(d >= MIN_DELTA_E, `${SERIES[i].name}/${SERIES[j].name} differ by ${d.toFixed(1)}`);
      }
    }
  });

  test('the placeholder yellow and the brand yellow are not the same colour', () => {
    // Conflating these strips the highlight off every teacher placeholder.
    assert.notEqual(BRAND.placeholder, BRAND.accent);
  });
});

describe('spec validation', () => {
  test('every fixture validates', () => {
    for (const [type, fixture] of Object.entries(FIXTURES)) {
      assert.doesNotThrow(() => validate(fixture), `${type} fixture should validate`);
    }
  });

  test('a missing learning intent is rejected', () => {
    const { intent, ...rest } = FIXTURES.timeline;
    void intent;
    assert.throws(() => validate(rest), SpecError);
  });

  test('an unknown type names the valid options', () => {
    assert.throws(
      () => validate({ ...FIXTURES.timeline, type: 'sankey' }),
      (e) => e instanceof SpecError && e.message.includes('timeline'),
    );
  });

  test('a comparison with a ragged value row is rejected with a useful message', () => {
    const bad = structuredClone(FIXTURES.comparison);
    bad.items[0].values = ['No'];
    assert.throws(() => validate(bad), (e) => /one value per criterion/.test(e.message));
  });

  test('a chart series of the wrong length is rejected', () => {
    const bad = structuredClone(FIXTURES.chart);
    bad.series[0].values = [1, 2, 3];
    assert.throws(() => validate(bad), SpecError);
  });

  test('a zero-duration gantt task is rejected', () => {
    const bad = structuredClone(FIXTURES.gantt);
    bad.tasks[0].duration = 0;
    assert.throws(() => validate(bad), SpecError);
  });

  test('an out-of-range pin coordinate is rejected', () => {
    const bad = structuredClone(FIXTURES.labelled);
    bad.parts[0].x = 140;
    assert.throws(() => validate(bad), (e) => /between 0 and 100/.test(e.message));
  });

  test('validate returns a frozen copy, so a renderer cannot mutate the spec', () => {
    const spec = validate(FIXTURES.timeline);
    assert.ok(Object.isFrozen(spec));
  });
});

describe('static rendering', () => {
  for (const type of staticTypes) {
    test(`${type} renders valid, self-describing SVG`, () => {
      const spec = validate(FIXTURES[type]);
      const { svg, width, height } = render(spec);

      assert.ok(svg.startsWith('<svg '), 'must be an svg element');
      assert.ok(svg.endsWith('</svg>'));
      assert.match(svg, /role="img"/);
      assert.match(svg, /aria-labelledby="lv-title lv-desc"/);
      assert.match(svg, /<title id="lv-title">/);
      assert.match(svg, /<desc id="lv-desc">/);
      assert.ok(height > 0 && Number.isFinite(height));
      assert.equal(width, 960);

      // Balanced tags. A renderer that drops a </g> produces something that
      // still looks fine in Chrome and breaks in other renderers.
      const opens = (svg.match(/<g[ >]/g) || []).length;
      const closes = (svg.match(/<\/g>/g) || []).length;
      assert.equal(opens, closes, 'unbalanced <g> elements');
    });

    test(`${type} is deterministic`, () => {
      const spec = validate(FIXTURES[type]);
      assert.equal(render(spec).svg, render(spec).svg);
    });

    test(`${type} escapes text rather than injecting it`, () => {
      const spec = validate({ ...FIXTURES[type], title: 'Safety <script>alert(1)</script> & "quotes"' });
      const { svg } = render(spec);
      assert.ok(!svg.includes('<script>'), 'raw script tag leaked into the SVG');
      assert.ok(svg.includes('&lt;script&gt;'));
    });

    test(`${type} passes its own accessibility audit`, () => {
      const spec = validate(FIXTURES[type]);
      const { description, a11y } = render(spec);
      assert.deepEqual(audit(spec, description, a11y), []);
    });

    test(`${type} text equivalent names every item in the graphic`, () => {
      const spec = validate(FIXTURES[type]);
      const { description, a11y } = render(spec);
      for (const item of description.items) {
        const needle = String(item.key).toLowerCase().slice(0, 20);
        assert.ok(
          a11y.fullAlt.toLowerCase().includes(needle),
          `"${item.key}" is drawn but missing from the text equivalent`,
        );
      }
    });
  }

  test('the five-part description uses the exact house labels in order', () => {
    const spec = validate(FIXTURES.timeline);
    const { a11y } = render(spec);
    assert.deepEqual(a11y.fivePart.map((p) => p.label), [
      'Main subject/content',
      'Important visual details',
      'Relevant structure such as columns, layers, or groupings',
      'Colours/layout',
      'Visible text',
    ]);
  });

  test('visible text lists every label drawn on the graphic', () => {
    const spec = validate(FIXTURES.gantt);
    const { a11y } = render(spec);
    const visible = a11y.fivePart.at(-1).supporting.join(' | ');
    for (const task of FIXTURES.gantt.tasks) {
      assert.ok(visible.includes(task.label), `${task.label} missing from visible text`);
    }
  });

  test('a bar chart of non-negative values always includes zero on the axis', () => {
    // A truncated axis makes a small change look enormous. In a course that is
    // not a style choice, it is teaching a student to misread a chart.
    const spec = validate({
      ...FIXTURES.chart,
      categories: ['a', 'b'],
      series: [{ label: 'S', values: [1000, 1010] }],
    });
    const { a11y } = render(spec);
    assert.match(a11y.fullAlt, /starting at zero/);
  });

  test('short alt is concise and full alt carries the detail', () => {
    for (const type of staticTypes) {
      const spec = validate(FIXTURES[type]);
      const { a11y } = render(spec);
      assert.ok(a11y.shortAlt.length <= 170, `${type} short alt is ${a11y.shortAlt.length} chars`);
      assert.ok(a11y.fullAlt.length > a11y.shortAlt.length, `${type} full alt adds nothing`);
      assert.ok(!/^image of/i.test(a11y.shortAlt));
    }
  });
});

describe('interactive building', () => {
  for (const type of [...INTERACTIVE_TYPES]) {
    test(`${type} builds a self-contained page`, () => {
      const spec = validate(FIXTURES[type]);
      const { html } = build(spec);

      assert.ok(html.startsWith('<!doctype html>'));
      assert.match(html, /<html lang="en-AU">/);

      // Self-contained is the whole point: a course asset that depends on a CDN
      // breaks behind a strict CSP and breaks again when the CDN moves.
      assert.ok(!/<script[^>]+src=/i.test(html), 'external script tag found');
      assert.ok(!/<link[^>]+stylesheet/i.test(html), 'external stylesheet found');
      assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(html.replace(/Source:[^<]*/g, '')), 'external URL found');
    });

    test(`${type} ships its text equivalent inside the page`, () => {
      const spec = validate(FIXTURES[type]);
      const { html, a11y } = build(spec);
      assert.ok(html.includes('Text version of this activity'));
      assert.ok(html.includes(esc(a11y.textEquivalent.split('\n')[0])));
    });

    test(`${type} states its learning intent on the page`, () => {
      const spec = validate(FIXTURES[type]);
      const { html } = build(spec);
      assert.ok(html.includes(esc(spec.intent)));
    });

    test(`${type} uses no drag and drop`, () => {
      // Drag and drop excludes keyboard and switch users. There is always a
      // better control, so its absence is an invariant, not a preference.
      const { html } = build(validate(FIXTURES[type]));
      assert.ok(!/draggable=|ondrag|dragstart/i.test(html));
    });

    test(`${type} is deterministic`, () => {
      const spec = validate(FIXTURES[type]);
      assert.equal(build(spec).html, build(spec).html);
    });
  }

  test('orbit periods follow Kepler\'s third law', () => {
    // The description is generated from the same formula the page runs, so this
    // pins the physics rather than the prose. Jupiter at 5.2 AU around one solar
    // mass takes 11.86 years, which is the real figure.
    const spec = validate(FIXTURES.simulation);
    const { a11y } = build(spec);
    assert.match(a11y.fullAlt, /Jupiter: orbits at 5\.2 astronomical units.*?11\.86 years/);
    assert.match(a11y.fullAlt, /Earth: orbits at 1 astronomical units.*?1 years/);
  });

  test('an unknown simulation model is rejected at validation, not at build', () => {
    assert.throws(
      () => validate({ ...FIXTURES.simulation, model: 'quantum' }),
      (e) => e instanceof SpecError && /orbit/.test(e.message),
    );
  });
});

describe('canvas embed markup', () => {
  test('the diagram block carries both alt attributes', () => {
    const { a11y } = render(validate(FIXTURES.timeline));
    const html = diagramBlock({ a11y, fileUrl: '/courses/1/files/2', apiEndpoint: '/api/v1/files/2' });
    assert.match(html, /alt="[^"]+"/);
    assert.match(html, /data-ally-user-updated-alt="[^"]+"/);
    assert.match(html, /data-api-returntype="File"/);
  });

  test('with no file URL it emits the teacher placeholder in the house yellow', () => {
    const { a11y } = render(validate(FIXTURES.timeline));
    const html = diagramBlock({ a11y });
    assert.ok(html.includes('#fdf223'), 'placeholder must use the placeholder yellow');
    assert.ok(!html.includes('#fac800'), 'brand yellow must not be used for a placeholder');
    assert.ok(!html.includes('<img'), 'must not emit an img with a fabricated URL');
  });

  test('the diagram block contains no script and no event handler', () => {
    // Canvas strips both on save. Emitting them means the block silently
    // changes shape between paste and publish.
    const { a11y } = render(validate(FIXTURES.timeline));
    const html = diagramBlock({ a11y, fileUrl: '/x' });
    assert.ok(!/<script/i.test(html));
    assert.ok(!/\son[a-z]+=/i.test(html));
  });

  test('the image description accordion uses details and summary, which Canvas keeps', () => {
    const { a11y } = render(validate(FIXTURES.timeline));
    const html = diagramBlock({ a11y, fileUrl: '/x' });
    assert.match(html, /<details>/);
    assert.match(html, /<summary[^>]*>Image Description<\/summary>/);
  });

  test('every iframe carries a title attribute', () => {
    const { a11y } = build(validate(FIXTURES.sequencer));
    const html = interactiveBlock({ url: 'https://example.edu/a.html', title: 'Timing a roast', a11y });
    const iframes = html.match(/<iframe[^>]*>/g) || [];
    assert.ok(iframes.length > 0);
    for (const frame of iframes) assert.match(frame, /title="[^"]+"/);
  });

  test('an interactive block always ships the text version alongside the iframe', () => {
    const { a11y } = build(validate(FIXTURES.sequencer));
    const html = interactiveBlock({ url: 'https://example.edu/a.html', title: 'T', a11y });
    assert.ok(html.includes('Text version of this activity'));
  });
});

describe('text layout', () => {
  test('measurement is monotonic and proportional to size', () => {
    assert.ok(measure('mm', 14) > measure('m', 14));
    assert.ok(measure('same', 28) > measure('same', 14));
    assert.ok(measure('iii', 14) < measure('WWW', 14));
  });

  test('wrapping never exceeds the target width', () => {
    const width = 180;
    const lines = wrap('Occlusal vertical dimension is set two to four millimetres less than the rest vertical dimension', width, 14);
    assert.ok(lines.length > 1);
    for (const line of lines) assert.ok(measure(line, 14) <= width, `"${line}" overflows`);
  });

  test('a word longer than the line is broken rather than allowed to overflow', () => {
    const lines = wrap('supercalifragilisticexpialidocious', 60, 14);
    for (const line of lines) assert.ok(measure(line, 14) <= 60);
    assert.ok(lines.length > 1);
  });

  test('escaping covers every XML metacharacter', () => {
    assert.equal(esc(`<&>"'`), '&lt;&amp;&gt;&quot;&apos;');
  });
});

describe('label fitting', () => {
  test('the longest gantt label is never ellipsised by a rounding error', () => {
    // (longest + pad) - pad does not always return longest in floating point,
    // so the single longest label used to fail its own width budget and have an
    // ellipsis put through it. That is the label you least want shortened.
    const spec = validate({
      ...FIXTURES.gantt,
      tasks: [
        { label: 'Volunteer induction', start: 0, duration: 1 },
        { label: 'Lay paths', start: 1, duration: 2 },
      ],
    });
    const { svg } = render(spec);
    assert.ok(svg.includes('>Volunteer induction<'), 'the longest label was truncated');
    assert.ok(!/Volunteer inducti\u2026/.test(svg));
  });
});

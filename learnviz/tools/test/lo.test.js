/**
 * Tests for learning objects and what they ship as.
 *
 * Every example spec is built here, so an example that stops validating or
 * starts failing an accessibility check breaks the suite. The pattern checks
 * pin the validation rules that stop a broken activity reaching a learner: a
 * scenario with a dead end, a challenge nobody can meet, a step-through that
 * ends before the picture is whole.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

import { validateLO, buildLO, PATTERNS } from '../src/lo/index.js';
import { SpecError } from '../src/validate.js';
import { bundleFiles, dashboard, slugify } from '../src/delivery/bundle.js';

const EX = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'examples');
const EXAMPLES = readdirSync(EX, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'figures')
  .flatMap((d) => readdirSync(join(EX, d.name))
    .filter((f) => f.endsWith('.json') && f !== 'proposal.json')
    .map((f) => ({ name: `${d.name}/${f}`, raw: JSON.parse(readFileSync(join(EX, d.name, f), 'utf8')) })));

const build = (raw) => buildLO(validateLO(raw));
const byPattern = (p) => EXAMPLES.find((e) => e.raw.pattern === p).raw;
const rejects = (raw, pattern) => assert.throws(() => validateLO(raw), (e) => e instanceof SpecError && pattern.test(e.message));

/** A released version of a spec: every source verified, status release. */
const released = (raw) => ({
  ...structuredClone(raw),
  status: 'release',
  sources: (raw.sources || []).map((s) => ({ ...s, status: 'verified' })),
});

/** Read a stored or deflated zip the way an LMS would, from the central directory. */
function unzip(buf) {
  const files = {};
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(eocd >= 0, 'no end of central directory');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i += 1) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50, 'bad central directory entry');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extra = buf.readUInt16LE(p + 30);
    const comment = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    files[name] = (method === 8 ? inflateRawSync(data) : data).toString('utf8');
    p += 46 + nameLen + extra + comment;
  }
  return files;
}

/* ------------------------------------------------------------------ */

describe('every example', () => {
  test('there is at least one example of every pattern', () => {
    for (const p of Object.keys(PATTERNS)) assert.ok(EXAMPLES.some((e) => e.raw.pattern === p), `no example of ${p}`);
  });

  for (const { name, raw } of EXAMPLES) {
    describe(name, () => {
      const b = build(raw);

      test('validates and passes the accessibility audit', () => {
        assert.deepEqual(b.problems, []);
      });

      test('is one self-contained page', () => {
        assert.ok(b.html.startsWith('<!doctype html>'));
        assert.match(b.html, /<html lang="en-AU">/);
        assert.ok(!/<script[^>]+src=/i.test(b.html), 'external script');
        assert.ok(!/<link[^>]+stylesheet/i.test(b.html), 'external stylesheet');
        // Links to sources are allowed. Anything loaded from elsewhere is not.
        assert.ok(!/(?:src|srcset|poster|data)="https?:/i.test(b.html), 'external resource');
        assert.ok(!/url\(\s*['"]?https?:/i.test(b.html), 'external CSS resource');
      });

      test('uses no drag and drop and no eval', () => {
        assert.ok(!/draggable=|ondrag|dragstart/i.test(b.html));
        assert.ok(!/\beval\(|new Function\(/.test(b.html));
      });

      test('states its goal and carries its text version', () => {
        assert.match(b.html, /After this, you can|Goal:/);
        assert.ok(b.html.includes('Text version of this activity'));
        assert.ok(b.a11y.textEquivalent.length > 80);
      });

      test('builds identically twice', () => {
        assert.equal(build(raw).html, b.html);
        assert.equal(build(raw).native, b.native);
      });

      test('its Canvas page has no script and no event handlers, which Canvas strips', () => {
        assert.ok(!/<script/i.test(b.native));
        assert.ok(!/\son[a-z]+=/i.test(b.native));
        assert.match(b.native, /<details/);
      });

      test('is a draft while its sources are unchecked, with the banner on the page', () => {
        assert.equal(b.draft.isDraft, true);
        assert.match(b.html, /Draft for review/);
      });

      test('released, it loses the banner and nothing else', () => {
        const r = build(released(raw));
        assert.equal(r.draft.isDraft, false);
        assert.ok(!/Draft for review/.test(r.html));
        assert.deepEqual(r.problems, []);
      });

      if (PATTERNS[raw.pattern].meta.scored || raw.pattern === 'predict' || raw.pattern === 'estimate') {
        test('has an answer key for the teacher', () => {
          assert.ok(b.answerKey.length > 0);
          for (const k of b.answerKey) assert.ok(k.prompt && k.answer);
        });
      }
    });
  }
});

describe('pattern validation catches broken activities', () => {
  test('a predict order must say whether a right order exists', () => {
    const raw = structuredClone(byPattern('predict'));
    raw.response = { kind: 'order', items: ['A', 'B', 'C'] };
    rejects(raw, /fixedOrder/);
  });

  test('a scenario node nobody can reach is named', () => {
    const raw = structuredClone(byPattern('scenario'));
    raw.nodes.push({ id: 'island', say: 'Nobody gets here.', outcome: 'Unreachable.' });
    rejects(raw, /"island" can never be reached/);
  });

  test('a scenario choice pointing nowhere is named', () => {
    const raw = structuredClone(byPattern('scenario'));
    raw.nodes[0].choices[0].next = 'nowhere';
    rejects(raw, /leads to "nowhere"/);
  });

  test('a scenario decision with no strong option is rejected', () => {
    const raw = structuredClone(byPattern('scenario'));
    raw.nodes[0].choices.forEach((c) => { c.quality = 'poor'; });
    rejects(raw, /no choice marked "best"/);
  });

  test('an explore challenge nobody can meet is rejected after trying every setting', () => {
    const raw = structuredClone(EXAMPLES.find((e) => e.raw.pattern === 'explore' && e.raw.engine === 'formula').raw);
    raw.challenges[0] = { ...raw.challenges[0], target: 1e9, tolerance: 1 };
    rejects(raw, /cannot be met/);
  });

  test('an explore challenge can require slider settings, and they must be real sliders', () => {
    const raw = structuredClone(EXAMPLES.find((e) => e.raw.pattern === 'explore' && e.raw.engine === 'formula').raw);
    raw.challenges[0].given = { nonsense: 1 };
    rejects(raw, /is not a slider/);
  });

  test('a step-through must end with the whole figure showing', () => {
    const raw = structuredClone(byPattern('stepthrough'));
    raw.steps = raw.steps.slice(0, -1);
    rejects(raw, /steps|parts/);
  });

  test('an estimate needs something hidden and something visible', () => {
    const raw = structuredClone(byPattern('estimate'));
    raw.bars.forEach((b) => { b.hidden = false; });
    rejects(raw, /hidden/);
    raw.bars.forEach((b) => { b.hidden = true; });
    rejects(raw, /visible bar/);
  });

  test('an unknown pattern lists the real ones', () => {
    rejects({ ...byPattern('cards'), pattern: 'quiz' }, /predict/);
  });

  test('only an activity that moves offers a recording, and it can be stepped', () => {
    for (const { raw } of EXAMPLES) {
      const rec = build(raw).recording;
      if (raw.pattern === 'explore' && raw.engine === 'orbit') {
        assert.ok(rec && rec.html.includes('window.lvSeek'), 'orbit has no steppable recording');
        assert.ok(rec.width > 0 && rec.seconds * rec.fps > 0);
      } else {
        assert.equal(rec, null, `${raw.title} offers a recording`);
      }
    }
  });

  test('a source link must be a web address', () => {
    const raw = structuredClone(byPattern('cards'));
    raw.sources = [{ label: 'X', kind: 'research', status: 'to-check', url: 'javascript:alert(1)' }];
    rejects(raw, /http/);
  });
});

const bundled = await (async () => {
  const raw = byPattern('sort');
  const b = build(raw);
  const slug = slugify(b.lo.title);
  return { raw, b, slug, files: await bundleFiles(b, { slug, source: JSON.stringify(raw) }) };
})();

describe('the bundle', () => {
  const { raw, b, slug, files } = bundled;
  const file = (n) => files.find((f) => f.name === n);

  test('ships every rendition', () => {
    for (const n of ['index.html', `${slug}.scorm.zip`, 'canvas-page.html', 'canvas-embed.html', 'text-version.txt', 'spec.json', 'teacher-guide.html', 'teacher-guide.md', 'review-sheet.html', 'review-sheet.md']) {
      assert.ok(file(n), `missing ${n}`);
    }
  });

  test('the SCORM package is a valid zip with a manifest pointing at the page', () => {
    const z = unzip(file(`${slug}.scorm.zip`).data);
    assert.deepEqual(Object.keys(z).sort(), ['imsmanifest.xml', 'index.html']);
    assert.match(z['imsmanifest.xml'], /adlcp:scormtype="sco" href="index\.html"/);
    assert.equal(z['index.html'], b.html);
  });

  test('a scored activity with a pass mark carries it into the manifest', () => {
    const z = unzip(file(`${slug}.scorm.zip`).data);
    assert.match(z['imsmanifest.xml'], new RegExp(`<adlcp:masteryscore>${Math.round(raw.passMark * 100)}</adlcp:masteryscore>`));
  });

  test('the teacher guide has the answer key and every delivery route', () => {
    const md = file('teacher-guide.md').data;
    for (const k of b.answerKey) assert.ok(md.includes(k.answer), `answer ${k.answer} missing`);
    assert.match(md, /SCORM/);
    assert.match(md, /canvas-page\.html/);
    assert.match(md, /#present/);
  });

  test('the review sheet lists every source with a box to tick', () => {
    const md = file('review-sheet.md').data;
    for (const s of raw.sources) assert.ok(md.includes(s.label), `source ${s.label} missing`);
    assert.match(md, /\| \[ \] \|/);
  });

  test('written prose follows the house style: no semicolons or long dashes', () => {
    for (const n of ['teacher-guide.md', 'review-sheet.md']) {
      const prose = file(n).data.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
      assert.ok(!/[–—]/.test(prose), `${n} has a long dash`);
      assert.ok(!/;/.test(prose), `${n} has a semicolon`);
    }
  });

  test('the dashboard links every rendition and marks drafts', () => {
    const html = dashboard([{ group: 'grief', slug, b, files }]);
    assert.match(html, new RegExp(`grief/${slug}/index\\.html#present`));
    assert.match(html, /Draft:/);
    assert.match(html, /After class/);
  });
});

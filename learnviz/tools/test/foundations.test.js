/**
 * The foundations everything else stands on: the formula language, the zip
 * writer, the SCORM manifest, the seeded shuffle, and the browser runtime.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';

import { createExpr, createModel } from '../src/runtime/expr.js';
import { zip } from '../src/delivery/zip.js';
import { manifest, scormPackage, packageId } from '../src/delivery/scorm.js';
import { shuffleIndices, hashString } from '../src/runtime/rng.js';
import { runtimeSource, exprSource, safeJson } from '../src/runtime/client.js';

const expr = createExpr();
const run = (src, scope = {}, names) => expr.compile(src, names ?? Object.keys(scope))(scope);

function hasPython() {
  try { execFileSync('python3', ['--version'], { stdio: 'ignore' }); return true; } catch { return false; }
}

describe('formula language', () => {
  test('arithmetic follows the usual precedence', () => {
    assert.equal(run('2 + 3 * 4'), 14);
    assert.equal(run('(2 + 3) * 4'), 20);
    assert.equal(run('10 - 4 - 3'), 3);
    assert.equal(run('24 / 4 / 2'), 3);
    assert.equal(run('7 % 3'), 1);
  });

  test('powers are right associative and bind tighter than unary minus', () => {
    assert.equal(run('2 ^ 3 ^ 2'), 512);
    assert.equal(run('-2 ^ 2'), -4);
    assert.equal(run('2 ^ -1'), 0.5);
  });

  test('named inputs, functions and constants', () => {
    assert.equal(run('cost / (pct / 100)', { cost: 9, pct: 30 }), 30);
    assert.equal(run('sqrt(a ^ 3 / m)', { a: 1, m: 1 }), 1);
    assert.equal(run('round(pi, 2)'), 3.14);
    assert.equal(run('max(1, 5, 3)'), 5);
    assert.equal(run('1.5e3 + .5'), 1500.5);
  });

  test('an unknown name fails at compile time with the defined names listed', () => {
    assert.throws(() => expr.compile('cost * markup', ['cost']), /"markup".*Defined names: cost/);
  });

  test('an unknown function names the ones that exist', () => {
    assert.throws(() => expr.compile('hack(1)', []), /not a function.*sqrt/);
  });

  test('nothing outside the language is reachable', () => {
    // These are the ways an expression language usually leaks into the host.
    for (const bad of ['constructor', '__proto__', 'toString']) {
      assert.throws(() => expr.compile(bad, [])(Object.create(null)), /not defined|no value/);
      // Even when the name is "allowed", the scope lookup must not climb the prototype chain.
      assert.throws(() => expr.compile(bad, [bad])({}), /no value/);
    }
    for (const bad of ['alert(1)', 'a.b', '"text"', 'x = 1', 'a[0]', '1;2']) {
      assert.throws(() => expr.compile(bad, ['a', 'x']), Error, bad);
    }
    // "this" is only ever a name looked up in the scope, never the host's this.
    assert.throws(() => expr.compile('this', ['this'])({}), /no value/);
    assert.equal(expr.compile('this', ['this'])({ this: 3 }), 3);
  });

  test('syntax errors say where', () => {
    assert.throws(() => expr.compile('2 +', []), /ends too early/);
    assert.throws(() => expr.compile('2 3', []), /position 3/);
    assert.throws(() => expr.compile('(2 + 3', []), /Expected "\)"/);
  });

  test('it never uses eval or Function, so a strict CSP cannot break it', () => {
    const src = createExpr.toString() + createModel.toString();
    assert.ok(!/\beval\s*\(/.test(src));
    assert.ok(!/new\s+Function/.test(src));
  });
});

describe('formula models', () => {
  const model = createModel();

  test('outputs may build on each other in any written order', () => {
    const evaluate = model(
      [{ key: 'cost' }, { key: 'pct' }],
      [
        { key: 'profit', expr: 'price - cost' },
        { key: 'price', expr: 'cost / (pct / 100)' },
      ],
    );
    const out = evaluate({ cost: 9, pct: 30 });
    assert.equal(out.price, 30);
    assert.equal(out.profit, 21);
  });

  test('a loop between outputs is reported', () => {
    assert.throws(
      () => model([{ key: 'x' }], [{ key: 'a', expr: 'b + x' }, { key: 'b', expr: 'a + 1' }]),
      /loop/,
    );
  });
});

describe('zip writer', () => {
  const entries = [
    { name: 'imsmanifest.xml', data: '<manifest/>' },
    { name: 'index.html', data: '<!doctype html>'.repeat(200) },
    { name: 'tiny.txt', data: 'x' },
  ];

  test('is deterministic', () => {
    assert.ok(zip(entries).equals(zip(entries)));
  });

  test('rejects duplicate and unsafe names', () => {
    assert.throws(() => zip([{ name: 'a', data: '' }, { name: 'a', data: '' }]), /Duplicate/);
    assert.throws(() => zip([{ name: '../evil', data: '' }]), /Unsafe/);
    assert.throws(() => zip([{ name: '/abs', data: '' }]), /Unsafe/);
  });

  test('opens in an independent implementation with correct contents', (t) => {
    if (!hasPython()) return t.skip('python3 not available');
    const dir = mkdtempSync(join(tmpdir(), 'lv-zip-'));
    try {
      const path = join(dir, 'p.zip');
      writeFileSync(path, zip(entries));
      const out = execFileSync('python3', ['-c', `
import zipfile, json, sys
z = zipfile.ZipFile(sys.argv[1])
bad = z.testzip()
print(json.dumps({"bad": bad, "names": z.namelist(), "sizes": [len(z.read(n)) for n in z.namelist()]}))
`, path], { encoding: 'utf8' });
      const r = JSON.parse(out);
      assert.equal(r.bad, null, 'a CRC check failed');
      assert.deepEqual(r.names, ['imsmanifest.xml', 'index.html', 'tiny.txt']);
      assert.deepEqual(r.sizes, [11, 15 * 200, 1]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('SCORM packaging', () => {
  test('the manifest is well formed and declares one SCO at index.html', (t) => {
    const xml = manifest({ title: 'Timing a roast & "dinner"', masteryScore: 80 });
    assert.match(xml, /<schemaversion>1\.2<\/schemaversion>/);
    assert.match(xml, /adlcp:scormtype="sco" href="index\.html"/);
    assert.match(xml, /<adlcp:masteryscore>80<\/adlcp:masteryscore>/);
    assert.ok(xml.includes('Timing a roast &amp; &quot;dinner&quot;'));
    if (!hasPython()) return t.skip('python3 not available to parse XML');
    execFileSync('python3', ['-c', 'import sys, xml.dom.minidom as m; m.parseString(sys.stdin.read())'], { input: xml });
  });

  test('the identifier is stable for a title', () => {
    assert.equal(packageId('A'), packageId('A'));
    assert.notEqual(packageId('A'), packageId('B'));
  });

  test('the package holds exactly the manifest and the activity', (t) => {
    if (!hasPython()) return t.skip('python3 not available');
    const dir = mkdtempSync(join(tmpdir(), 'lv-scorm-'));
    try {
      const path = join(dir, 'p.zip');
      writeFileSync(path, scormPackage({ title: 'T', html: '<!doctype html><p>hi</p>' }));
      const names = execFileSync('python3', ['-c', 'import zipfile,sys; print(",".join(zipfile.ZipFile(sys.argv[1]).namelist()))', path], { encoding: 'utf8' }).trim();
      assert.equal(names, 'imsmanifest.xml,index.html');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('seeded shuffle', () => {
  test('is the same for the same seed and different for different seeds', () => {
    assert.deepEqual(shuffleIndices(8, 'grief'), shuffleIndices(8, 'grief'));
    assert.notDeepEqual(shuffleIndices(8, 'grief'), shuffleIndices(8, 'instagram'));
  });

  test('is a permutation', () => {
    const s = shuffleIndices(20, 'x');
    assert.deepEqual([...s].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i));
  });

  test('never returns the original order when asked not to', () => {
    // Search for seeds whose plain shuffle is the identity, then check the guard.
    for (let n = 2; n <= 4; n += 1) {
      for (let i = 0; i < 500; i += 1) {
        const s = shuffleIndices(n, `seed-${i}`, { notIdentity: true });
        assert.ok(s.some((v, k) => v !== k), `identity for n=${n} seed-${i}`);
      }
    }
  });

  test('the hash spreads short strings', () => {
    assert.notEqual(hashString('a'), hashString('b'));
  });
});

describe('browser runtime', () => {
  /** Run the runtime in a sandbox with a fake DOM and an optional fake LMS. */
  function boot({ api, passMark } = {}) {
    const listeners = {};
    const calls = [];
    const fakeApi = api && {
      store: { 'cmi.core.lesson_status': 'not attempted' },
      LMSInitialize() { calls.push(['init']); return 'true'; },
      LMSGetValue(k) { return this.store[k] || ''; },
      LMSSetValue(k, v) { calls.push(['set', k, v]); this.store[k] = v; return 'true'; },
      LMSCommit() { calls.push(['commit']); return 'true'; },
      LMSFinish() { calls.push(['finish']); return 'true'; },
    };
    const parent = { API: fakeApi, postMessage() {} };
    parent.parent = parent;
    const element = () => ({ textContent: '', classList: { toggle() {} }, setAttribute() {} });
    const window = {
      parent,
      location: { hash: '', pathname: '/', search: '' },
      history: { replaceState() {} },
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      setTimeout: (fn) => fn(),
    };
    const document = {
      documentElement: { classList: { toggle() {} }, scrollHeight: 100 },
      body: {},
      getElementById: () => element(),
      addEventListener() {},
    };
    const sandbox = { window, document, String, Math, isFinite, Number };
    vm.runInNewContext(runtimeSource({ passMark }), sandbox);
    return { LV: window.LV, calls, api: fakeApi, fire: (t) => (listeners[t] || []).forEach((f) => f()) };
  }

  test('runs without an LMS and reports nothing to one', () => {
    const { LV } = boot();
    assert.equal(LV.lms.connected, false);
    assert.equal(LV.report({ complete: true, score: 0.5 }), 'completed');
  });

  test('inside an LMS it initialises, marks incomplete, then reports score and status', () => {
    const { LV, calls, api } = boot({ api: true });
    assert.equal(LV.lms.connected, true);
    assert.deepEqual(calls[0], ['init']);
    assert.equal(api.store['cmi.core.lesson_status'], 'incomplete');

    LV.report({ complete: true, score: 0.75 });
    assert.equal(api.store['cmi.core.score.raw'], '75');
    assert.equal(api.store['cmi.core.score.max'], '100');
    assert.equal(api.store['cmi.core.lesson_status'], 'completed');
  });

  test('the best attempt is what gets reported', () => {
    const { LV, api } = boot({ api: true });
    LV.report({ complete: true, score: 0.9 });
    LV.report({ complete: true, score: 0.4 });
    assert.equal(api.store['cmi.core.score.raw'], '90');
  });

  test('a pass mark turns completion into passed or failed', () => {
    const low = boot({ api: true, passMark: 0.8 });
    low.LV.report({ complete: true, score: 0.5 });
    assert.equal(low.api.store['cmi.core.lesson_status'], 'failed');

    const high = boot({ api: true, passMark: 0.8 });
    high.LV.report({ complete: true, score: 0.85 });
    assert.equal(high.api.store['cmi.core.lesson_status'], 'passed');
  });

  test('status never steps backwards when a learner tries again', () => {
    const { LV, api } = boot({ api: true });
    LV.report({ complete: true, score: 1 });
    LV.report({ complete: false, score: null });
    assert.equal(api.store['cmi.core.lesson_status'], 'completed');
  });

  test('leaving the page finishes the LMS session exactly once', () => {
    const { calls, fire } = boot({ api: true });
    fire('pagehide');
    fire('beforeunload');
    assert.equal(calls.filter((c) => c[0] === 'finish').length, 1);
  });

  test('the formula engine source runs in the browser sandbox too', () => {
    const sandbox = {};
    vm.runInNewContext(`${exprSource()}; result = createModel()([{key:'c'}],[{key:'p',expr:'c*2'}])({c:4}).p;`, sandbox);
    assert.equal(sandbox.result, 8);
  });

  test('inlined JSON cannot close its script element', () => {
    assert.ok(!safeJson({ s: '</script><script>alert(1)</script>' }).includes('</script>'));
  });
});

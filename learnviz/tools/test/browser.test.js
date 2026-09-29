/**
 * Browser tests: every example driven in Chromium, and a SCORM round trip.
 *
 * The unit tests prove the pages are built correctly. These prove they work:
 * that a learner can complete each activity with no script errors, that the
 * page fits a phone, and that an LMS hosting the SCORM package receives the
 * status and score it should, and nothing it should not.
 *
 * Skipped, not failed, when there is no Chromium or no playwright-core, so the
 * rest of the suite still runs anywhere.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';

import { validateLO, buildLO } from '../src/lo/index.js';
import { loadWorkspace, reviewData } from '../src/course/workspace.js';
import { reviewApp } from '../src/course/review.js';
import { findChromium } from '../src/raster.js';

const EX = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'examples');
const EXAMPLES = readdirSync(EX, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'figures')
  .flatMap((d) => readdirSync(join(EX, d.name))
    .filter((f) => f.endsWith('.json') && f !== 'proposal.json')
    .map((f) => ({ name: `${d.name}/${f}`, raw: JSON.parse(readFileSync(join(EX, d.name, f), 'utf8')) })));

let chromium = null;
try { ({ chromium } = await import('playwright-core')); } catch { /* not installed */ }
const executablePath = findChromium();
const skip = !chromium || !executablePath ? 'needs playwright-core and Chromium' : false;

let browser;
let dir;
before(async () => {
  if (skip) return;
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  dir = mkdtempSync(join(tmpdir(), 'learnviz-'));
});
after(async () => {
  if (browser) await browser.close();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

async function open(html, { width = 1000, hash = '' } = {}) {
  const file = join(dir, `p${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(file, html);
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.goto(pathToFileURL(file).href + hash);
  return page;
}

/**
 * Complete the activity the plainest way a learner could, and return a
 * selector that must be visible afterwards. `f` is the page or a frame.
 */
async function complete(f, raw) {
  switch (raw.pattern) {
    case 'predict': {
      if (raw.response.kind === 'choice') await f.check('input[type="radio"]', { force: true });
      await f.click('#lv-p-lock');
      return '#lv-p-reveal';
    }
    case 'stepthrough': {
      await f.click('#lv-s-all');
      return '#lv-s-say';
    }
    case 'sort': {
      const n = await f.$$eval('.lv-sort-card', (els) => els.length);
      for (let i = 0; i < n; i += 1) await f.check(`input[name="lv-sort-${i}"]`, { force: true });
      await f.click('#lv-sort-check');
      return '#lv-sort-summary';
    }
    case 'order': {
      if (raw.mode === 'timing') {
        for (let i = 0; i < raw.items.length; i += 1) await f.fill(`#lv-t-in-${i}`, '10');
        await f.click('#lv-t-check');
        return '#lv-t-result';
      }
      await f.click('#lv-o-check');
      return '#lv-o-result';
    }
    case 'scenario': {
      for (let k = 0; k < 20 && !(await f.isVisible('#lv-sc-end')); k += 1) {
        await f.click('#lv-sc-choices [data-i="0"]');
      }
      return '#lv-sc-end';
    }
    case 'estimate': {
      await f.click('#lv-e-go');
      return '#lv-e-reveal';
    }
    case 'explore': {
      const key = raw.parameters[0].key;
      await f.$eval(`#lv-x-r-${key}`, (r) => { r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); });
      return `#lv-x-o-${key}`;
    }
    case 'cards': {
      for (let k = 0; k < raw.cards.length * 2 && !(await f.isVisible('#lv-c-done')); k += 1) {
        await f.click('#lv-c-flip');
        await f.click('#lv-c-got');
      }
      return '#lv-c-done';
    }
    default: throw new Error(`No driver for ${raw.pattern}`);
  }
}

describe('every example in a browser', { skip }, () => {
  for (const { name, raw } of EXAMPLES) {
    test(`${name}: completes with no script errors, fits a phone, and has a presenter view`, async () => {
      const { html } = buildLO(validateLO(raw));

      const page = await open(html);
      const shown = await complete(page, raw);
      assert.ok(await page.isVisible(shown), `${shown} not visible after completing`);
      // Keyboard: something interactive is reachable from the top of the page.
      await page.evaluate(() => window.scrollTo(0, 0));
      let reached = false;
      for (let k = 0; k < 12 && !reached; k += 1) {
        await page.keyboard.press('Tab');
        reached = await page.evaluate(() => /^(BUTTON|INPUT|SELECT|A|SUMMARY)$/.test(document.activeElement?.tagName || ''));
      }
      assert.ok(reached, 'no control reachable by Tab');
      assert.deepEqual(page.errors, []);
      await page.close();

      // Loading must not move focus: in a gallery, a review app or an LMS
      // frame, that would pull a keyboard user out of the host page.
      const fresh = await open(html);
      assert.equal(await fresh.evaluate(() => document.activeElement.tagName), 'BODY', 'focus moved on load');
      await fresh.close();

      const phone = await open(html, { width: 375 });
      assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'scrolls sideways on a phone');
      assert.deepEqual(phone.errors, []);
      await phone.close();

      const room = await open(html, { width: 1280, hash: '#present' });
      assert.ok(await room.evaluate(() => document.documentElement.classList.contains('lv-present')));
      await room.keyboard.press('ArrowRight');
      await room.keyboard.press('r');
      await room.keyboard.press('Escape');
      assert.ok(!(await room.evaluate(() => document.documentElement.classList.contains('lv-present'))), 'Escape did not leave presenter view');
      assert.deepEqual(room.errors, []);
      await room.close();
    });
  }
});

/* ------------------------------------------------------------------ */
/* SCORM round trip                                                    */
/* ------------------------------------------------------------------ */

// The parent page an LMS would provide: a SCORM 1.2 API on window, recording
// every call, with the activity in an iframe below it.
const LMS_PAGE = `<!doctype html><html><body>
<script>
  window.calls = [];
  var store = { 'cmi.core.lesson_status': 'not attempted' };
  function rec(name, args) { window.calls.push([name].concat(Array.prototype.slice.call(args))); }
  window.API = {
    LMSInitialize: function () { rec('LMSInitialize', arguments); return 'true'; },
    LMSFinish: function () { rec('LMSFinish', arguments); return 'true'; },
    LMSGetValue: function (k) { rec('LMSGetValue', arguments); return store[k] || ''; },
    LMSSetValue: function (k, v) { rec('LMSSetValue', arguments); store[k] = String(v); return 'true'; },
    LMSCommit: function () { rec('LMSCommit', arguments); return 'true'; },
    LMSGetLastError: function () { return '0'; },
    LMSGetErrorString: function () { return ''; },
    LMSGetDiagnostic: function () { return ''; }
  };
  window.store = store;
</script>
<iframe id="sco" src="/sco/index.html" style="width:1000px;height:1400px"></iframe>
</body></html>`;

describe('SCORM round trip against a fake LMS', { skip }, () => {
  let server;
  let base;
  const pages = {};

  before(async () => {
    if (skip) return;
    server = createServer((req, res) => {
      const [, which] = req.url.split('?');
      if (req.url.startsWith('/sco/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(pages.current);
      } else {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(which === 'x' ? '' : LMS_PAGE);
      }
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => server && server.close());

  async function host(raw) {
    pages.current = buildLO(validateLO(raw)).html;
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    page.errors = [];
    page.on('pageerror', (e) => page.errors.push(e.message));
    await page.goto(`${base}/`);
    const frame = page.frames().find((f) => f.url().endsWith('/sco/index.html'));
    await frame.waitForSelector('#lv-live', { state: 'attached' });
    return { page, frame, calls: () => page.evaluate(() => window.calls), store: () => page.evaluate(() => window.store) };
  }
  const sets = (calls, key) => calls.filter((c) => c[0] === 'LMSSetValue' && c[1] === key).map((c) => c[2]);

  test('a scored activity initialises, marks incomplete, then reports its score and a pass', async () => {
    const raw = EXAMPLES.find((e) => e.name === 'grief/2-recognise-the-response.json').raw;
    const { page, frame, calls, store } = await host(raw);

    let c = await calls();
    assert.equal(c[0][0], 'LMSInitialize');
    assert.deepEqual(sets(c, 'cmi.core.lesson_status'), ['incomplete']);

    // Answer every card correctly, the way a learner would.
    const cards = await frame.$$eval('.lv-sort-card', (els) => els.map((e) => e.textContent));
    for (let i = 0; i < cards.length; i += 1) {
      const key = raw.items.find((it) => cards[i].includes(it.text)).category;
      await frame.check(`input[name="lv-sort-${i}"][value="${key}"]`, { force: true });
    }
    await frame.click('#lv-sort-check');

    const s = await store();
    assert.equal(s['cmi.core.score.raw'], '100');
    assert.equal(s['cmi.core.score.min'], '0');
    assert.equal(s['cmi.core.score.max'], '100');
    assert.equal(s['cmi.core.lesson_status'], 'passed');
    c = await calls();
    assert.ok(c.some((x) => x[0] === 'LMSCommit'));

    // A worse second attempt does not lower the score or the status.
    await frame.click('#lv-sort-reset');
    await frame.click('#lv-sort-check');
    assert.equal((await store())['cmi.core.score.raw'], '100');
    assert.equal((await store())['cmi.core.lesson_status'], 'passed');

    // Leaving finishes the session exactly once.
    await page.evaluate(() => { document.getElementById('sco').src = '/blank?x'; });
    await page.waitForTimeout(300);
    assert.equal((await calls()).filter((x) => x[0] === 'LMSFinish').length, 1);
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  test('a below-pass attempt reports failed, with the score', async () => {
    const raw = EXAMPLES.find((e) => e.name === 'grief/2-recognise-the-response.json').raw;
    const { page, frame, store } = await host(raw);
    await frame.click('#lv-sort-check');
    const s = await store();
    assert.equal(s['cmi.core.score.raw'], '0');
    assert.equal(s['cmi.core.lesson_status'], 'failed');
    await page.close();
  });

  test('showing the model answer completes the activity without sending a score', async () => {
    const raw = EXAMPLES.find((e) => e.name === 'service/1-handle-a-complaint.json').raw;
    const { page, frame, store, calls } = await host(raw);
    await frame.click('#lv-o-model');
    const s = await store();
    assert.equal(s['cmi.core.lesson_status'], 'completed');
    assert.equal(s['cmi.core.score.raw'], undefined, 'a score was sent for looking at the answer');
    // Checking the model order afterwards still sends no score.
    await frame.click('#lv-o-check');
    assert.equal((await store())['cmi.core.score.raw'], undefined);
    assert.ok((await calls()).some((x) => x[0] === 'LMSCommit'));
    await page.close();
  });

  test('an unscored activity reports completion only', async () => {
    const raw = EXAMPLES.find((e) => e.raw.pattern === 'estimate').raw;
    const { page, frame, store } = await host(raw);
    await frame.click('#lv-e-go');
    const s = await store();
    assert.equal(s['cmi.core.lesson_status'], 'completed');
    assert.equal(s['cmi.core.score.raw'], undefined);
    await page.close();
  });
});

/* ------------------------------------------------------------------ */
/* The course review app                                               */
/* ------------------------------------------------------------------ */

describe('the course review app', { skip }, () => {
  test('a designer can work through the course one page at a time and save the choices', async () => {
    const { data, sketches } = reviewData(loadWorkspace(join(EX, 'course', 'workspace')));
    data.saved = {};
    const app = mkdtempSync(join(tmpdir(), 'learnviz-review-'));
    try {
      const { mkdirSync } = await import('node:fs');
      mkdirSync(join(app, 'sketches'));
      for (const sk of sketches) writeFileSync(join(app, sk.file), sk.html);
      writeFileSync(join(app, 'index.html'), reviewApp(data));
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(pathToFileURL(join(app, 'index.html')).href);

      const heading = () => page.textContent('#page-h');
      assert.equal(await heading(), 'Welcome to the unit');
      await page.click('[data-act="skip"]');
      assert.equal(await heading(), 'Assessment overview', 'did not move on after deciding');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'page-h');
      await page.click('[data-act="skip"]');
      assert.equal(await heading(), 'What is grief?');
      await page.waitForSelector('.opt iframe');
      await page.click('[data-act="build"][data-n="2"]');
      assert.equal(await heading(), 'Recognising grief responses');
      assert.match(await page.textContent('#prog-n'), /^3 of 7/);

      await page.reload();
      assert.match(await page.textContent('#prog-n'), /^3 of 7/, 'choices lost on reload');

      const [download] = await Promise.all([page.waitForEvent('download'), page.click('.top [data-act="save"]')]);
      const saved = JSON.parse(readFileSync(await download.path(), 'utf8'));
      assert.equal(saved.kind, 'course-choices');
      assert.deepEqual(saved.pages['what-is-grief'], { decision: 'build', candidate: 1, option: 2, name: 'The five responses, one at a time', pattern: 'stepthrough', label: 'Step by step', insert: { after: 'The five stages' } });
      assert.deepEqual(errors, []);
      await ctx.close();
    } finally {
      rmSync(app, { recursive: true, force: true });
    }
  });
});

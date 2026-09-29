/**
 * Tests for working through a whole Canvas course.
 *
 * The sample export in examples/course is written to the Common Cartridge
 * layout Canvas uses, and the worked workspace beside it carries real
 * proposals and choices, so these tests run the same path a designer does:
 * import, propose, review, choose, build, and write the course back out.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { zip, unzip } from '../src/delivery/zip.js';
import { parseXml, find, kid, textOf } from '../src/course/xml.js';
import { pageText, placeBlock, splitPage, withBody } from '../src/course/html.js';
import { readCourse, writeCourse, canvasId } from '../src/course/imscc.js';
import {
  importCourse, loadWorkspace, status, reviewData, buildCourse,
  findPage, pageGallery, parseBuildCode, recordDecision, buildPage,
} from '../src/course/workspace.js';
import { writePageUpdate } from '../src/course/imscc.js';
import { execFileSync } from 'node:child_process';

/** Strict XML check with Python's parser, where Python is available. Our own reader is lenient on purpose. */
function assertWellFormed(xml, what) {
  try {
    execFileSync('python3', ['-c', 'import sys, xml.dom.minidom; xml.dom.minidom.parseString(sys.stdin.buffer.read())'], { input: xml, stdio: ['pipe', 'ignore', 'pipe'] });
  } catch (e) {
    if (e.code === 'ENOENT') return;
    assert.fail(`${what} is not well-formed XML: ${String(e.stderr).trim().split('\n').pop()}`);
  }
}
import { reviewApp } from '../src/course/review.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'examples', 'course');
const SAMPLE = join(ROOT, 'sample-course.imscc');
const WORKSPACE = join(ROOT, 'workspace');
const tmp = () => mkdtempSync(join(tmpdir(), 'learnviz-course-'));

describe('zip reading', () => {
  test('round trips stored and deflated entries', () => {
    const entries = [{ name: 'a.txt', data: 'hello '.repeat(200) }, { name: 'dir/b.bin', data: Buffer.from([0, 1, 2, 255]) }];
    for (const store of [false, true]) {
      const back = unzip(zip(entries, { store }));
      assert.deepEqual(back.map((e) => e.name), ['a.txt', 'dir/b.bin']);
      assert.equal(back[0].data.toString(), entries[0].data);
      assert.deepEqual([...back[1].data], [0, 1, 2, 255]);
    }
  });

  test('keeps folder entries, so a rewritten export has every entry the original had', () => {
    const back = unzip(zip([{ name: 'wiki_content/', data: '' }, { name: 'wiki_content/a.html', data: 'x' }]));
    assert.deepEqual(back.map((e) => e.name), ['wiki_content/', 'wiki_content/a.html']);
  });

  test('refuses something that is not a zip, saying what an export is', () => {
    assert.throws(() => unzip(Buffer.from('not a zip')), /\.imscc/);
  });
});

describe('xml', () => {
  test('reads elements, attributes, entities, CDATA and prefixes', () => {
    const doc = parseXml('<?xml version="1.0"?><m:root xmlns:m="x"><!-- c --><m:item id="a&amp;b" note="1 > 0"><title>Fish &amp; chips</title><body><![CDATA[<p>raw</p>]]></body></m:item></m:root>');
    const item = find(doc, 'item')[0];
    assert.equal(item.attrs.id, 'a&b');
    assert.equal(item.attrs.note, '1 > 0');
    assert.equal(textOf(item, 'title'), 'Fish & chips');
    assert.equal(kid(item, 'body').text, '<p>raw</p>');
  });
});

describe('reading a Canvas export', () => {
  const course = readCourse(readFileSync(SAMPLE));

  test('finds the title, the modules in order, and what each holds', () => {
    assert.equal(course.title, 'Supporting People Through Grief and Loss');
    assert.deepEqual(course.modules.map((m) => m.title), ['Getting started', 'Understanding grief', 'Supporting families', 'Looking after yourself']);
    assert.deepEqual(course.modules[1].items.map((i) => i.kind), ['heading', 'page', 'page', 'heading', 'discussion']);
    assert.deepEqual(course.modules[2].items.map((i) => i.kind), ['page', 'page', 'assignment']);
  });

  test('lists pages in course order, with clean text, headings and media', () => {
    assert.deepEqual(course.pages.map((p) => p.position), [1, 2, 3, 4, 5, 6, 7]);
    const grief = course.pages.find((p) => p.slug === 'what-is-grief');
    assert.equal(grief.module, 'Understanding grief');
    assert.deepEqual(grief.headings.map((h) => h.text), ['Grief is a response to loss', 'The five stages', 'Not a sequence']);
    assert.match(grief.text, /^## Grief is a response to loss$/m);
    assert.match(grief.text, /Kübler-Ross/, 'entities decoded');
    assert.deepEqual(grief.media.images, ['A family member talking with a care worker in a corridor']);
    const role = course.pages.find((p) => p.slug === 'knowing-your-role-and-when-to-refer');
    assert.match(role.text, /^1\. Listen without interrupting\.$/m);
    assert.match(role.text, /^6\. Check back/m);
  });

  test('a page that sits in no module still belongs to the course', () => {
    const entries = unzip(readFileSync(SAMPLE));
    entries.push({ name: 'wiki_content/extra-reading.html', data: Buffer.from('<html><head><title>Extra reading</title></head><body><p>More.</p></body></html>') });
    const c = readCourse(zip(entries));
    const last = c.modules[c.modules.length - 1];
    assert.equal(last.title, 'Pages not in a module');
    assert.equal(c.pages[c.pages.length - 1].title, 'Extra reading');
  });

  test('a file that is not a course export says so', () => {
    assert.throws(() => readCourse(zip([{ name: 'readme.txt', data: 'hi' }])), /Canvas course export/);
  });
});

describe('placing an activity on a page', () => {
  const body = '<h2>One</h2><p>a</p><h3>One point five</h3><p>b</p><h2>Two</h2><p>c</p>';

  test('after a heading means straight after its own content', () => {
    const r = placeBlock(body, '<p>X</p>', 'act', { after: 'One' });
    assert.ok(r.body.indexOf('<p>X</p>') > r.body.indexOf('<p>a</p>'));
    assert.ok(r.body.indexOf('<p>X</p>') < r.body.indexOf('One point five'));
    assert.match(r.placed, /section "One"/);
  });

  test('the last section, the top and the end', () => {
    assert.ok(placeBlock(body, '<p>X</p>', 'act', { after: 'Two' }).body.trimEnd().endsWith('</div>'));
    assert.ok(placeBlock(body, '<p>X</p>', 'act', 'start').body.startsWith('<div class="learnviz-activity"'));
    assert.ok(placeBlock(body, '<p>X</p>', 'act', 'end').body.indexOf('<p>X</p>') > body.length - 20);
  });

  test('a heading that has gone falls back to the end and says so', () => {
    const r = placeBlock(body, '<p>X</p>', 'act', { after: 'Renamed' });
    assert.match(r.placed, /no heading "Renamed" was found/);
  });

  test('placing again replaces rather than adds', () => {
    const once = placeBlock(body, '<p>X</p>', 'act', 'end').body;
    const twice = placeBlock(once, '<p>Y</p>', 'act', { after: 'One' }).body;
    assert.equal((twice.match(/data-learnviz="act"/g) || []).length, 1);
    assert.ok(twice.includes('<p>Y</p>') && !twice.includes('<p>X</p>'));
  });

  test('the page head is kept exactly', () => {
    const html = '<html>\n<head>\n<title>T</title>\n<meta name="identifier" content="g1">\n</head>\n<body>\n<p>old</p>\n</body>\n</html>\n';
    const out = withBody(html, '<p>new</p>');
    assert.ok(out.startsWith('<html>\n<head>\n<title>T</title>\n<meta name="identifier" content="g1">\n</head>\n<body><p>new</p></body>'));
    assert.equal(splitPage(out).identifier, 'g1');
  });

  test('page text keeps what a reader needs and drops scripts', () => {
    const { text, media } = pageText('<script>alert(1)</script><p>Hi &amp; bye</p><iframe title="Quiz" src="https://x.edu/external_tools/retrieve?resource_link_lookup_uuid=1"></iframe><img src="a.png">');
    assert.ok(!text.includes('alert'));
    assert.match(text, /Hi & bye/);
    assert.match(text, /\[Embedded H5P or external tool: Quiz\]/);
    assert.match(text, /\[Image, no alt text\]/);
    assert.equal(media.embeds[0].kind, 'H5P or external tool');
  });
});

describe('writing the course back', () => {
  const original = unzip(readFileSync(SAMPLE));
  const page = 'wiki_content/what-is-grief.html';
  const out = unzip(writeCourse(original, {
    pages: new Map([[page, '<html><body>changed</body></html>']]),
    files: [{ path: 'web_resources/learnviz/x/figure.png', data: Buffer.from([1, 2, 3]) }],
  }));

  test('puts the manifest first, as Canvas requires', () => {
    assert.equal(out[0].name, 'imsmanifest.xml');
  });

  test('stores every entry uncompressed', () => {
    const buf = writeCourse(original, {});
    let p = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    p = buf.readUInt32LE(p + 16);
    for (let i = 0; i < original.length; i += 1) {
      assert.equal(buf.readUInt16LE(p + 10), 0);
      p += 46 + buf.readUInt16LE(p + 28) + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
    }
  });

  test('changes only what it was asked to, and keeps everything else byte for byte', () => {
    const byName = new Map(out.map((e) => [e.name, e.data]));
    assert.equal(byName.get(page).toString(), '<html><body>changed</body></html>');
    for (const e of original) {
      if (e.name === page || e.name === 'imsmanifest.xml') continue;
      assert.ok(byName.get(e.name).equals(e.data), `${e.name} changed`);
    }
  });

  test('the rewritten manifest is well-formed XML', () => {
    assertWellFormed(out[0].data, 'imsmanifest.xml');
  });

  test('declares each new file as a resource with a Canvas-style identifier', () => {
    const manifest = parseXml(out[0].data.toString());
    const res = find(manifest, 'resource').find((r) => r.attrs.href === 'web_resources/learnviz/x/figure.png');
    assert.ok(res);
    assert.match(res.attrs.identifier, /^g[0-9a-f]{32}$/);
    assert.equal(res.attrs.identifier, canvasId('learnviz:web_resources/learnviz/x/figure.png'));
  });

  test('refuses files outside web_resources and pages that do not exist', () => {
    assert.throws(() => writeCourse(original, { files: [{ path: 'elsewhere/x.png', data: Buffer.alloc(1) }] }), /web_resources/);
    assert.throws(() => writeCourse(original, { pages: new Map([['wiki_content/nope.html', 'x']]) }), /not a page/);
  });
});

describe('the workspace', () => {
  test('import writes the outline, one text file per page, and a copy of the export', () => {
    const dir = tmp();
    try {
      const meta = importCourse(SAMPLE, dir);
      assert.equal(meta.pages.length, 7);
      assert.ok(existsSync(join(dir, 'source.imscc')));
      assert.deepEqual(readdirSync(join(dir, 'pages')).sort()[0], '01-welcome-to-the-unit.md');
      const page = readFileSync(join(dir, 'pages', '03-what-is-grief.md'), 'utf8');
      assert.match(page, /Write options to `proposals\/what-is-grief\.json`/);
      assert.match(readFileSync(join(dir, 'outline.md'), 'utf8'), /- \*\*Read\*\*/);
      const ws = loadWorkspace(dir);
      assert.ok(status(ws).every((r) => r.next === 'write options'));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test('each page shows what it needs next', () => {
    const dir = tmp();
    try {
      importCourse(SAMPLE, dir);
      writeFileSync(join(dir, 'proposals', 'welcome-to-the-unit.json'), '{ "kind": "skip", "reason": "Orientation." }');
      writeFileSync(join(dir, 'proposals', 'assessment-overview.json'), '{ not json');
      writeFileSync(join(dir, 'proposals', 'what-is-grief.json'), '{ "kind": "proposal" }');
      writeFileSync(join(dir, 'proposals', 'looking-after-yourself.json'), '{ "kind": "skip" }');
      const rows = Object.fromEntries(status(loadWorkspace(dir)).map((r) => [r.slug, r]));
      assert.equal(rows['welcome-to-the-unit'].proposal, 'skip');
      assert.equal(rows['assessment-overview'].proposal, 'invalid');
      assert.match(rows['assessment-overview'].error, /Not valid JSON/);
      assert.equal(rows['what-is-grief'].proposal, 'invalid');
      assert.match(rows['looking-after-yourself'].error, /needs a "reason"/);
      assert.equal(rows['knowing-your-role-and-when-to-refer'].next, 'write options');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test('the worked example is fully proposed and decided', () => {
    const rows = status(loadWorkspace(WORKSPACE));
    assert.equal(rows.length, 7);
    assert.ok(rows.every((r) => r.next.startsWith('ready to build') || r.next === 'nothing, skipped'), JSON.stringify(rows.map((r) => r.next)));
  });

  test('the review data numbers options as the gallery does and writes one sketch per option', () => {
    const { data, sketches } = reviewData(loadWorkspace(WORKSPACE));
    const grief = data.pages.find((p) => p.slug === 'what-is-grief');
    assert.equal(grief.options[0].recommended, true);
    assert.equal(grief.options[0].insert, 'start');
    assert.ok(sketches.some((s) => s.file === 'sketches/what-is-grief-1.html' && s.html.includes('Draft for review')));
    assert.equal(data.pages.find((p) => p.slug === 'welcome-to-the-unit').status, 'skip');
  });

  test('the review app is self-contained and the same every time', () => {
    const { data } = reviewData(loadWorkspace(WORKSPACE));
    const html = reviewApp(data);
    assert.ok(!/<script[^>]+src=|<link[^>]+stylesheet/i.test(html));
    assert.ok(!/[–—]/.test(html), 'long dash in the app');
    assert.equal(html, reviewApp(data));
  });
});

describe('building the course', () => {
  test('builds every chosen activity into its page, with its figure as a course file', async () => {
    const out = tmp();
    try {
      const r = await buildCourse(loadWorkspace(WORKSPACE), { out, png: async () => Buffer.from([137, 80, 78, 71]) });
      assert.deepEqual(r.built.map((b) => b.page.slug), ['what-is-grief', 'recognising-grief-responses', 'talking-with-grieving-families', 'knowing-your-role-and-when-to-refer']);
      assert.equal(r.skipped.length, 3);
      assert.deepEqual(r.problems, []);
      const pkg = unzip(readFileSync(join(out, r.package)));
      const byName = new Map(pkg.map((e) => [e.name, e.data.toString()]));
      const grief = byName.get('wiki_content/what-is-grief.html');
      assert.match(grief, /<body>\s*<div class="learnviz-activity" data-learnviz="what-is-grief">/);
      assert.ok(grief.includes('$IMS-CC-FILEBASE$/learnviz/what-is-grief/figure.png'));
      assert.ok(byName.has('web_resources/learnviz/what-is-grief/figure.png'));
      assert.match(grief, /Draft for review/);
      const role = byName.get('wiki_content/knowing-your-role.html');
      assert.ok(role.indexOf('data-learnviz') < role.indexOf('Always refer'));
      assert.ok(!/<script/i.test([...byName.entries()].filter(([n]) => n.startsWith('wiki_content/')).map(([, v]) => v).join('')));
      assert.ok(existsSync(join(out, 'scorm', '06-knowing-your-role-and-when-to-refer.scorm.zip')));
      assert.match(readFileSync(join(out, 'upload-checklist.md'), 'utf8'), /Try it in a sandbox course first/);
    } finally { rmSync(out, { recursive: true, force: true }); }
  });

  test('--release refuses drafts and writes nothing', async () => {
    const out = tmp();
    try {
      const r = await buildCourse(loadWorkspace(WORKSPACE), { out, release: true });
      assert.equal(r.refused.length, 4);
      assert.equal(r.package, undefined);
      assert.deepEqual(readdirSync(out), []);
    } finally { rmSync(out, { recursive: true, force: true }); }
  });

  test('a finished spec is used in place of the sketch', async () => {
    const dir = tmp();
    const out = tmp();
    try {
      cpSync(WORKSPACE, dir, { recursive: true, filter: (p) => !p.includes(`${'/'}build`) && !p.includes(`${'/'}review`) });
      const spec = JSON.parse(readFileSync(join(dir, 'proposals', 'knowing-your-role-and-when-to-refer.json'), 'utf8')).candidates[0].sketch;
      spec.title = 'Passing on a concern, finished';
      spec.sources = spec.sources.map((s) => ({ ...s, status: 'verified' }));
      writeFileSync(join(dir, 'specs', 'knowing-your-role-and-when-to-refer.json'), JSON.stringify(spec));
      const r = await buildCourse(loadWorkspace(dir), { out });
      const b = r.built.find((x) => x.page.slug === 'knowing-your-role-and-when-to-refer');
      assert.equal(b.fromSketch, false);
      assert.equal(b.draft.isDraft, false);
      assert.equal(b.title, 'Passing on a concern, finished');
    } finally { rmSync(dir, { recursive: true, force: true }); rmSync(out, { recursive: true, force: true }); }
  });

  test('a choice that no longer matches the proposal is reported, not guessed', async () => {
    const dir = tmp();
    const out = tmp();
    try {
      cpSync(WORKSPACE, dir, { recursive: true, filter: (p) => !p.includes(`${'/'}build`) && !p.includes(`${'/'}review`) });
      const choices = JSON.parse(readFileSync(join(dir, 'choices.json'), 'utf8'));
      choices.pages['knowing-your-role-and-when-to-refer'].candidate = 9;
      writeFileSync(join(dir, 'choices.json'), JSON.stringify(choices));
      const r = await buildCourse(loadWorkspace(dir), { out });
      assert.match(r.problems[0].message, /not in the proposal any more/);
    } finally { rmSync(dir, { recursive: true, force: true }); rmSync(out, { recursive: true, force: true }); }
  });
});

/* ------------------------------------------------------------------ */
/* One page at a time                                                  */
/* ------------------------------------------------------------------ */

describe('one page at a time', () => {
  const copyWorkspace = () => {
    const dir = tmp();
    cpSync(WORKSPACE, dir, { recursive: true, filter: (p) => !/\/(build|built|review|galleries)(\/|$)/.test(p) });
    rmSync(join(dir, 'choices.json'), { force: true });
    return dir;
  };

  test('next finds the first page with options and no decision', () => {
    const dir = copyWorkspace();
    try {
      const ws = loadWorkspace(dir);
      assert.equal(findPage(ws, 'next').slug, 'what-is-grief');
      assert.equal(findPage(ws, 6).slug, 'knowing-your-role-and-when-to-refer');
      recordDecision(ws, 'what-is-grief', { decision: 'skip' });
      assert.equal(findPage(loadWorkspace(dir), 'next').slug, 'recognising-grief-responses');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test('the page gallery shows the page, a placement menu per option, and composes a build code', () => {
    const ws = loadWorkspace(WORKSPACE);
    const html = pageGallery(ws, findPage(ws, 'knowing-your-role-and-when-to-refer'));
    assert.match(html, /data-page="knowing-your-role-and-when-to-refer"/);
    assert.match(html, /What the page says/);
    assert.match(html, /<select id="where-1">[\s\S]*?<option value="after:Passing on a concern" selected>/);
    assert.match(html, /Nothing for this page/);
    assert.match(html, /Build code: /);
    assert.equal((html.match(/<input type="checkbox" value="\d+">/g) || []).length, 2);
  });

  test('a build code can pick several options, with headings that contain spaces', () => {
    const ws = loadWorkspace(WORKSPACE);
    const r = parseBuildCode(ws, 'Build code: knowing-your-role-and-when-to-refer 1@after:Passing on a concern 2@after:Your role on placement');
    assert.equal(r.decision.decision, 'build');
    assert.deepEqual(r.decision.items.map((i) => [i.option, i.insert]), [[1, { after: 'Passing on a concern' }], [2, { after: 'Your role on placement' }]]);
    assert.equal(parseBuildCode(ws, 'what-is-grief none').decision.decision, 'skip');
    assert.throws(() => parseBuildCode(ws, 'what-is-grief 7@end'), /no option 7/);
    assert.throws(() => parseBuildCode(ws, 'no-such-page 1@end'), /No page/);
  });

  test('building a page with two activities places both and packages only that page', async () => {
    const dir = copyWorkspace();
    const out = tmp();
    try {
      const ws = loadWorkspace(dir);
      const { page, decision } = parseBuildCode(ws, 'knowing-your-role-and-when-to-refer 1@after:Passing on a concern 2@after:Your role on placement');
      recordDecision(ws, page.slug, decision);
      const r = await buildPage(ws, page.slug, { out });
      assert.deepEqual(r.problems, []);
      assert.equal(r.built.length, 2);
      const pkg = unzip(readFileSync(join(out, r.package)));
      const names = pkg.map((e) => e.name);
      assert.equal(names[0], 'imsmanifest.xml');
      assert.deepEqual(names.filter((n) => n.startsWith('wiki_content/')), ['wiki_content/knowing-your-role.html']);
      assert.ok(!names.some((n) => /^g[0-9a-f]{32}/.test(n)), 'other course content in a page update');
      for (const e of pkg.filter((x) => x.name.endsWith('.xml'))) assertWellFormed(e.data, e.name);
      assert.doesNotMatch(pkg.find((e) => e.name === 'course_settings/module_meta.xml').data.toString(), /<module\b/);
      const html = pkg.find((e) => e.name === 'wiki_content/knowing-your-role.html').data.toString();
      const original = unzip(readFileSync(SAMPLE)).find((e) => e.name === 'wiki_content/knowing-your-role.html').data.toString();
      assert.equal(splitPage(html).identifier, splitPage(original).identifier);
      const a = html.indexOf('data-learnviz="knowing-your-role-and-when-to-refer-1"');
      const b = html.indexOf('data-learnviz="knowing-your-role-and-when-to-refer-2"');
      assert.ok(b > 0 && b < html.indexOf('Passing on a concern</h2>'), 'second activity not in "Your role on placement"');
      assert.ok(a > html.indexOf('Check back with the family') && a < html.indexOf('Always refer'), 'first activity not after the steps');
      assert.ok(existsSync(join(out, 'page-with-activities.html')));
      assert.match(readFileSync(join(out, 'how-to-add-it.html'), 'utf8'), /Select specific content/);
      const c = JSON.parse(readFileSync(join(dir, 'choices.json'), 'utf8'));
      assert.equal(c.pages['knowing-your-role-and-when-to-refer'].items.length, 2);
    } finally { rmSync(dir, { recursive: true, force: true }); rmSync(out, { recursive: true, force: true }); }
  });

  test('a chosen option with no sketch asks for its finished spec by name', async () => {
    const dir = copyWorkspace();
    const out = tmp();
    try {
      const ws = loadWorkspace(dir);
      const { page, decision } = parseBuildCode(ws, 'recognising-grief-responses 2@end');
      recordDecision(ws, page.slug, decision);
      const r = await buildPage(ws, page.slug, { out });
      assert.match(r.problems[0].message, /Write specs\/recognising-grief-responses-2\.json/);
    } finally { rmSync(dir, { recursive: true, force: true }); rmSync(out, { recursive: true, force: true }); }
  });

  test('a page update refuses a page that is not in the export', () => {
    assert.throws(() => writePageUpdate(unzip(readFileSync(SAMPLE)), { file: 'wiki_content/nope.html', html: 'x' }), /not a page/);
  });
});

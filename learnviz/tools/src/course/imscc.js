/**
 * Canvas course exports (.imscc), read and written back.
 *
 * A Canvas export is an IMS Common Cartridge 1.1 zip with Canvas extensions.
 * Two files describe it: imsmanifest.xml (the standard organisation tree and
 * the resource list) and course_settings/module_meta.xml (Canvas's own module
 * detail: content types, published state, text headers). Pages are HTML files
 * in wiki_content/.
 *
 * Reading follows the manifest's organisation tree for order, which is the
 * standard part, and uses module_meta.xml where it is there for content types.
 *
 * Writing never rebuilds a course from scratch. It copies the original export
 * entry for entry, replaces only the pages that change, and adds new files.
 * Rebuilt packages follow the rules Canvas imports are known to need: the
 * manifest first, nothing compressed, and identifiers of the form "g" plus 32
 * hexadecimal characters.
 */

import { createHash } from 'node:crypto';
import { unzip, zip } from '../delivery/zip.js';
import { parseXml, find, kids, kid, textOf, escXml } from './xml.js';
import { splitPage, pageText } from './html.js';

/** A Canvas-style identifier, stable for the same seed. */
export const canvasId = (seed) => `g${createHash('md5').update(String(seed)).digest('hex')}`;

const TYPE_WORDS = {
  WikiPage: 'page',
  Assignment: 'assignment',
  DiscussionTopic: 'discussion',
  'Quizzes::Quiz': 'quiz',
  Quiz: 'quiz',
  Attachment: 'file',
  ExternalUrl: 'link',
  ContextExternalTool: 'external tool',
  ContextModuleSubHeader: 'heading',
};

/**
 * @param {Buffer} buf the .imscc file
 * @returns {{ title, modules, pages, entries }}
 */
export function readCourse(buf) {
  const entries = unzip(buf);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const manifestEntry = byName.get('imsmanifest.xml');
  if (!manifestEntry) throw new Error('No imsmanifest.xml. This does not look like a Canvas course export (.imscc).');
  const manifest = parseXml(manifestEntry.data.toString('utf8'));

  const resources = new Map(find(manifest, 'resource').map((r) => [r.attrs.identifier, {
    identifier: r.attrs.identifier,
    type: r.attrs.type || '',
    href: r.attrs.href || (kid(r, 'file')?.attrs.href ?? ''),
  }]));

  // Canvas's module detail, where the export has it.
  const meta = new Map();
  const moduleMeta = new Map();
  const mm = byName.get('course_settings/module_meta.xml');
  if (mm) {
    for (const mod of find(parseXml(mm.data.toString('utf8')), 'module')) {
      moduleMeta.set(mod.attrs.identifier, { state: textOf(mod, 'workflow_state') || 'active', position: Number(textOf(mod, 'position')) || 0 });
      for (const it of find(mod, 'item')) {
        meta.set(it.attrs.identifier, {
          type: textOf(it, 'content_type'),
          state: textOf(it, 'workflow_state') || 'active',
          indent: Number(textOf(it, 'indent')) || 0,
          ref: textOf(it, 'identifierref'),
        });
      }
    }
  }

  const settings = byName.get('course_settings/course_settings.xml');
  const title = (settings && textOf(parseXml(settings.data.toString('utf8')).children[0], 'title'))
    || find(kid(manifest.children[0], 'metadata'), 'string')[0]?.text
    || 'Untitled course';

  const pageFor = new Map();
  const pages = [];
  const slugs = new Set();
  const addPage = (file, moduleTitle, state) => {
    if (pageFor.has(file)) return pageFor.get(file);
    const entry = byName.get(file);
    if (!entry) return null;
    const html = entry.data.toString('utf8');
    const split = splitPage(html);
    // Named from the title, which is what a designer recognises. Canvas's own
    // file names encode punctuation ("-percent-28learning-activity-percent-29").
    const fromFile = file.replace(/^wiki_content\//, '').replace(/\.html?$/i, '').replace(/-percent-[0-9a-f]{2}/gi, '-');
    let slug = (split.title || fromFile).toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 70).replace(/^-+|-+$/g, '') || 'page';
    for (let k = 2, base = slug; slugs.has(slug); k += 1) slug = `${base}-${k}`;
    slugs.add(slug);
    const page = {
      slug,
      file,
      title: split.title || slug,
      identifier: split.identifier,
      module: moduleTitle,
      state: state === 'active' && split.workflow === 'active' ? 'published' : 'unpublished',
      ...pageText(split.body),
    };
    pages.push(page);
    pageFor.set(file, page);
    return page;
  };

  const modules = [];
  const org = find(manifest, 'organization')[0];
  const topItems = org ? kids(org, 'item') : [];
  // Canvas wraps modules in one item, "LearningModules". Other cartridges may not.
  const moduleEls = topItems.length === 1 && !topItems[0].attrs.identifierref ? kids(topItems[0], 'item') : topItems;
  const flatten = (el, out = []) => {
    for (const c of kids(el, 'item')) { out.push(c); flatten(c, out); }
    return out;
  };
  for (const modEl of moduleEls) {
    const mod = { id: modEl.attrs.identifier, title: textOf(modEl, 'title') || 'Untitled module', state: moduleMeta.get(modEl.attrs.identifier)?.state || 'active', items: [] };
    for (const it of flatten(modEl)) {
      const m = meta.get(it.attrs.identifier) || {};
      const ref = it.attrs.identifierref || m.ref;
      const res = ref ? resources.get(ref) : null;
      const href = res?.href || '';
      const itemTitle = textOf(it, 'title');
      let kind = TYPE_WORDS[m.type] || (href.startsWith('wiki_content/') ? 'page' : !ref ? 'heading' : 'other');
      if (kind === 'page' && !href.startsWith('wiki_content/')) kind = 'other';
      const item = { kind, title: itemTitle, state: m.state || 'active', indent: m.indent || 0 };
      if (kind === 'page') {
        const page = addPage(href, mod.title, m.state || 'active');
        if (page) item.slug = page.slug;
      }
      mod.items.push(item);
    }
    modules.push(mod);
  }

  // Pages that exist but sit in no module still belong to the course.
  const loose = entries.filter((e) => e.name.startsWith('wiki_content/') && /\.html?$/i.test(e.name) && !pageFor.has(e.name));
  if (loose.length) {
    const mod = { id: 'not-in-a-module', title: 'Pages not in a module', state: 'active', items: [] };
    for (const e of loose.sort((a, b) => a.name.localeCompare(b.name))) {
      const page = addPage(e.name, mod.title, 'active');
      if (page) mod.items.push({ kind: 'page', title: page.title, state: page.state, indent: 0, slug: page.slug });
    }
    modules.push(mod);
  }

  pages.forEach((p, i) => { p.position = i + 1; });
  return { title, modules, pages, entries };
}

/**
 * Write the course back out with changed pages and added files.
 *
 * @param {{ name, data }[]} entries the original export's entries
 * @param {{ pages?: Map<string,string>, files?: { path: string, data: Buffer }[] }} changes
 *   pages maps wiki_content file names to new HTML. files are added under
 *   their path and declared in the manifest as resources.
 */
export function writeCourse(entries, { pages = new Map(), files = [] } = {}) {
  const byName = new Map(entries.map((e) => [e.name, e]));
  for (const f of files) {
    if (byName.has(f.path)) throw new Error(`${f.path} is already in the course export`);
    if (!f.path.startsWith('web_resources/')) throw new Error(`${f.path} must be under web_resources/ to be imported as a course file`);
  }
  for (const name of pages.keys()) if (!byName.has(name)) throw new Error(`${name} is not a page in the export`);

  let manifest = byName.get('imsmanifest.xml').data.toString('utf8');
  if (files.length) {
    const decl = files.map((f) => `    <resource identifier="${canvasId(`learnviz:${f.path}`)}" type="webcontent" href="${escXml(f.path)}">\n      <file href="${escXml(f.path)}"/>\n    </resource>`).join('\n');
    const close = manifest.lastIndexOf('</resources>');
    if (close < 0) throw new Error('The manifest has no <resources> section to add files to.');
    manifest = `${manifest.slice(0, close)}${decl}\n  ${manifest.slice(close)}`;
  }

  const out = [{ name: 'imsmanifest.xml', data: manifest }];
  for (const e of entries) {
    if (e.name === 'imsmanifest.xml') continue;
    out.push({ name: e.name, data: pages.has(e.name) ? pages.get(e.name) : e.data });
  }
  for (const f of files) out.push({ name: f.path, data: f.data });
  return zip(out, { store: true });
}

/**
 * Reading and editing Canvas page HTML.
 *
 * Two jobs. Turn a page into clean text that a person or a model can read,
 * keeping the headings, lists, tables and a note of every image and embed.
 * And place an activity block into a page at a chosen point, in a way that can
 * be found and replaced if the course is built again.
 */

import { decodeXml } from './xml.js';

const NAMED = {
  nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '-', mdash: ' - ',
  hellip: '...', eacute: 'é', copy: '©', reg: '®', trade: '™', deg: '°', times: '×',
  middot: '·', bull: '•', rarr: '→', larr: '←', frac12: '½', uuml: 'ü', ouml: 'ö',
};

export function decodeHtml(s) {
  return decodeXml(s.replace(/&([a-z0-9]+);/gi, (m, e) => NAMED[e.toLowerCase()] ?? m));
}

/** The page's <title>, the Canvas identifier meta tag, and the <body>. */
export function splitPage(html) {
  const title = decodeHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  const identifier = (html.match(/<meta\s+name="identifier"\s+content="([^"]+)"/i) || [])[1] || '';
  const workflow = (html.match(/<meta\s+name="workflow_state"\s+content="([^"]+)"/i) || [])[1] || 'active';
  const b = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return { title, identifier, workflow, body: b ? b[1] : html };
}

const BLOCK = new Set(['p', 'div', 'section', 'article', 'header', 'footer', 'blockquote', 'ul', 'ol', 'table', 'tr', 'details', 'summary', 'figure', 'figcaption', 'br', 'hr', 'dl', 'dt', 'dd', 'pre']);

/**
 * Page body to readable text, Markdown-flavoured: headings as #, list items as
 * -, table rows with |, images and embeds as bracketed notes. Returns the text
 * and a summary of what the page already contains.
 */
export function pageText(body) {
  const out = [];
  let line = '';
  const media = { images: [], embeds: [], links: 0 };
  const flush = () => { const t = line.replace(/[ \t]+/g, ' ').trim(); if (t) out.push(t); line = ''; };
  const headings = [];
  let heading = null;
  let skip = 0;
  const lists = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g;
  let m;
  const cleaned = body.replace(/<!--[\s\S]*?-->/g, '');
  while ((m = re.exec(cleaned))) {
    if (m[4] !== undefined) {
      if (!skip) line += decodeHtml(m[4]).replace(/\s+/g, ' ');
      continue;
    }
    const close = m[1] === '/';
    const tag = m[2].toLowerCase();
    const at = m[3];
    if (tag === 'script' || tag === 'style') { skip += close ? -1 : 1; skip = Math.max(0, skip); continue; }
    if (skip) continue;
    if (/^h[1-6]$/.test(tag)) {
      if (!close) { flush(); heading = { level: Number(tag[1]) }; } else if (heading) {
        const text = line.trim() || '';
        line = `${'#'.repeat(heading.level)} ${text}`;
        if (text) headings.push({ level: heading.level, text });
        flush();
        heading = null;
      }
      continue;
    }
    if (tag === 'li') {
      flush();
      if (!close) {
        const l = lists[lists.length - 1];
        const mark = l && l.ordered ? `${(l.n += 1)}.` : '-';
        line = `${'  '.repeat(Math.max(0, lists.length - 1))}${mark} `;
      }
      continue;
    }
    if (tag === 'ul' || tag === 'ol') {
      flush();
      if (close) lists.pop(); else lists.push({ ordered: tag === 'ol', n: 0 });
      continue;
    }
    if (tag === 'td' || tag === 'th') { if (!close && line.trim()) line += ' | '; continue; }
    if (tag === 'img' && !close) {
      const alt = decodeHtml((at.match(/\balt="([^"]*)"/i) || [])[1] || '');
      media.images.push(alt);
      line += ` [Image${alt ? `: ${alt}` : ', no alt text'}] `;
      continue;
    }
    if (tag === 'iframe' && !close) {
      const title = decodeHtml((at.match(/\btitle="([^"]*)"/i) || [])[1] || '');
      const src = (at.match(/\bsrc="([^"]*)"/i) || [])[1] || '';
      const kind = /h5p|resource_link_lookup_uuid/i.test(src) ? 'H5P or external tool'
        : /youtube|vimeo|kaltura|instructuremedia|studio/i.test(src) ? 'video' : 'embed';
      media.embeds.push({ kind, title });
      flush();
      out.push(`[Embedded ${kind}${title ? `: ${title}` : ''}]`);
      continue;
    }
    if (tag === 'a' && !close) media.links += 1;
    if (BLOCK.has(tag)) flush();
  }
  flush();
  const text = out.join('\n').replace(/\n{3,}/g, '\n\n');
  const words = (text.match(/[A-Za-z0-9À-ɏ']+/g) || []).length;
  return { text, headings, words, media };
}

/* ------------------------------------------------------------------ */
/* Placing an activity                                                 */
/* ------------------------------------------------------------------ */

const norm = (s) => decodeHtml(String(s).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Every heading in the body with its character offsets, for placement.
 */
function headingSpans(body) {
  const spans = [];
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi;
  let m;
  while ((m = re.exec(body))) spans.push({ level: Number(m[1]), text: norm(m[2]), start: m.index, end: m.index + m[0].length });
  return spans;
}

const marker = (id) => new RegExp(`<div[^>]*data-learnviz="${id.replace(/[^a-z0-9-]/gi, '')}"[^>]*>[\\s\\S]*?<!-- learnviz:end ${id.replace(/[^a-z0-9-]/gi, '')} -->\\s*</div>`, 'g');

/**
 * Put `block` into a page body.
 *
 * `where` is "end", "start", or { after: "Heading text" }, which places the
 * block straight after that heading's own content: just before the next
 * heading of any level, or at the end of the page. The review app lists every
 * heading as a flat list, so that is what "the end of the section" means to
 * the person choosing. A block already placed
 * under the same id is replaced rather than added again. Returns the new body
 * and where it actually went, since a heading may have been renamed since the
 * choice was made.
 */
export function placeBlock(body, block, id, where = 'end') {
  const safe = id.replace(/[^a-z0-9-]/gi, '');
  const wrapped = `<div class="learnviz-activity" data-learnviz="${safe}">\n<!-- learnviz:start ${safe} -->\n${block}\n<!-- learnviz:end ${safe} -->\n</div>`;
  const base = body.replace(marker(safe), '');

  if (where === 'start') return { body: `${wrapped}\n${base}`, placed: 'at the top of the page' };
  if (where && typeof where === 'object' && where.after) {
    const spans = headingSpans(base);
    const i = spans.findIndex((h) => h.text === norm(where.after));
    if (i >= 0) {
      const next = spans[i + 1];
      const at = next ? next.start : base.length;
      return { body: `${base.slice(0, at).replace(/\s*$/, '\n')}${wrapped}\n${base.slice(at)}`, placed: `at the end of the section "${where.after}"` };
    }
    return { body: `${base.replace(/\s*$/, '\n')}${wrapped}\n`, placed: `at the end of the page, because no heading "${where.after}" was found` };
  }
  return { body: `${base.replace(/\s*$/, '\n')}${wrapped}\n`, placed: 'at the end of the page' };
}

/** Replace the body of a full page document, keeping its head untouched. */
export function withBody(html, body) {
  const m = html.match(/(<body[^>]*>)([\s\S]*)(<\/body>)/i);
  if (!m) return body;
  return html.slice(0, m.index) + m[1] + body + m[3] + html.slice(m.index + m[0].length);
}

/**
 * A small XML reader for Canvas course exports.
 *
 * Enough of XML for imsmanifest.xml and the course_settings files: elements,
 * attributes, text, CDATA, comments, processing instructions and the standard
 * entities. Namespace prefixes are kept on names but can be ignored when
 * searching, because Canvas exports declare them inconsistently across
 * versions. No DTDs, no external entities, so nothing in a file can make the
 * reader fetch anything.
 */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeXml(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Parse to a tree of { name, attrs, children, text }. `children` holds elements
 * only. `text` is the element's own direct text, trimmed.
 */
export function parseXml(src) {
  const root = { name: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt < 0) { top().text += decodeXml(src.slice(i)); break; }
    if (lt > i) top().text += decodeXml(src.slice(i, lt));
    if (src.startsWith('<!--', lt)) { i = end(src, '-->', lt) + 3; continue; }
    if (src.startsWith('<![CDATA[', lt)) {
      const e = end(src, ']]>', lt);
      top().text += src.slice(lt + 9, e);
      i = e + 3;
      continue;
    }
    if (src.startsWith('<?', lt)) { i = end(src, '?>', lt) + 2; continue; }
    if (src.startsWith('<!', lt)) { i = end(src, '>', lt) + 1; continue; }
    const gt = tagEnd(src, lt);
    const raw = src.slice(lt + 1, gt);
    i = gt + 1;
    if (raw.startsWith('/')) {
      const name = raw.slice(1).trim();
      // Close back to the matching element, which tolerates a stray
      // unclosed tag rather than losing the rest of the document.
      for (let k = stack.length - 1; k > 0; k -= 1) {
        if (stack[k].name === name) { stack.length = k; break; }
      }
      continue;
    }
    const selfClosing = raw.endsWith('/');
    const body = selfClosing ? raw.slice(0, -1) : raw;
    const m = body.match(/^([^\s/>]+)/);
    if (!m) continue;
    const el = { name: m[1], attrs: attrs(body.slice(m[1].length)), children: [], text: '' };
    top().children.push(el);
    if (!selfClosing) stack.push(el);
  }
  const tidy = (el) => { el.text = el.text.trim(); el.children.forEach(tidy); };
  tidy(root);
  return root;
}

function end(src, token, from) {
  const e = src.indexOf(token, from);
  if (e < 0) throw new Error(`Unterminated ${token} in XML`);
  return e;
}

/** The closing > of a tag, skipping any > inside quoted attribute values. */
function tagEnd(src, lt) {
  let q = null;
  for (let k = lt + 1; k < src.length; k += 1) {
    const c = src[k];
    if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') return k;
  }
  throw new Error('Unterminated tag in XML');
}

function attrs(s) {
  const out = {};
  const re = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = decodeXml(m[3] ?? m[4]);
  return out;
}

/** The local part of a name, without any namespace prefix. */
export const local = (name) => name.slice(name.indexOf(':') + 1);

/** Direct children with this local name. */
export const kids = (el, name) => (el ? el.children.filter((c) => local(c.name) === name) : []);

/** The first direct child with this local name. */
export const kid = (el, name) => kids(el, name)[0] || null;

/** Every descendant with this local name, in document order. */
export function find(el, name, out = []) {
  if (!el) return out;
  for (const c of el.children) {
    if (local(c.name) === name) out.push(c);
    find(c, name, out);
  }
  return out;
}

/** The text of a direct child, or ''. */
export const textOf = (el, name) => kid(el, name)?.text ?? '';

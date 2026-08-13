/**
 * The page shell every interactive is built into.
 *
 * Hard requirements, all of them driven by where these files end up.
 *
 * - Self-contained. No CDN, no external font, no fetch. An institutional
 *   Content Security Policy will block external requests, and a file that only
 *   works while a CDN is up is not a course asset.
 * - Keyboard operable. Everything is a real button or a real input. There is no
 *   drag and drop anywhere in this toolkit, because drag and drop excludes
 *   keyboard and switch users and there is always a better control.
 * - Announced. Feedback lands in an `aria-live` region so a screen reader user
 *   hears the result of their action instead of discovering it by accident.
 * - Readable without the interaction. The text equivalent ships inside the page.
 * - Sized for an iframe. It reports its height to the parent with postMessage,
 *   and it works fine if nobody is listening.
 */

import { esc } from '../svg.js';
import { BRAND, TYPE } from '../theme.js';

/** JSON safe to inline inside a <script> tag. */
export function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const CSS = `
:root {
  color-scheme: light;
  --ink: ${BRAND.ink};
  --paper: ${BRAND.paper};
  --panel: ${BRAND.panel};
  --rule: ${BRAND.rule};
  --accent: ${BRAND.accent};
  --ok: #00706b;
  --no: #a4177c;
  --font: ${TYPE.family};
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--font);
  font-size: 15px;
  line-height: 1.5;
  color: var(--ink);
  background: var(--paper);
  padding: 20px;
}
h1 { font-size: 21px; margin: 0 0 6px; }
h2 { font-size: 16px; margin: 22px 0 8px; }
.lv-sub { margin: 0 0 14px; max-width: 70ch; }
.lv-rule { width: 64px; height: 4px; background: var(--accent); margin: 0 0 18px; }
.lv-intent {
  background: var(--panel);
  border-left: 4px solid var(--ink);
  padding: 10px 14px;
  margin: 0 0 18px;
  max-width: 80ch;
}
.lv-intent strong { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }

/* Focus is never removed, only restyled, and it is visible against every
   background this page uses. */
:focus-visible {
  outline: 3px solid var(--ink);
  outline-offset: 2px;
  border-radius: 3px;
}

button {
  font: inherit;
  font-weight: 700;
  color: var(--paper);
  background: var(--ink);
  border: 2px solid var(--ink);
  border-radius: 5px;
  padding: 9px 16px;
  cursor: pointer;
  min-height: 44px; /* Comfortable target on a phone, which is where Canvas gets read. */
}
button.lv-secondary { color: var(--ink); background: var(--paper); }
button:hover { opacity: .88; }
button:disabled { opacity: .45; cursor: not-allowed; }

input[type="number"], input[type="range"] { font: inherit; }
input[type="number"] {
  width: 6.5em; padding: 8px; min-height: 44px;
  border: 2px solid var(--rule); border-radius: 5px; color: var(--ink); background: var(--paper);
}
input[type="range"] { width: 100%; min-height: 30px; accent-color: ${BRAND.ink}; }

table { border-collapse: collapse; width: 100%; margin: 0 0 14px; }
caption { text-align: left; font-weight: 700; padding: 0 0 8px; }
th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--rule); vertical-align: top; }
/* Column headers are set in small caps. Row headers are content, often a
   proper noun, and must keep the capitalisation they were written with. */
thead th { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
tbody th { font-weight: 700; }
tbody tr:nth-child(odd) { background: var(--panel); }

.lv-actions { display: flex; gap: 10px; flex-wrap: wrap; margin: 6px 0 18px; }
.lv-feedback { margin: 0 0 16px; }
.lv-feedback:empty { margin: 0; }
.lv-verdict { padding: 12px 14px; border-radius: 6px; border-left: 5px solid; background: var(--panel); }
.lv-verdict.is-ok { border-color: var(--ok); }
.lv-verdict.is-no { border-color: var(--no); }

/* Right and wrong are marked by a word and a symbol, never by colour alone. */
.lv-mark { font-weight: 700; white-space: nowrap; }
.lv-mark.is-ok { color: var(--ok); }
.lv-mark.is-no { color: var(--no); }
.lv-why { margin: 4px 0 0; font-size: 14px; }

.lv-controls { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin: 0 0 18px; }
.lv-control label { display: block; font-weight: 700; font-size: 14px; margin: 0 0 4px; }
.lv-control output { display: inline-block; font-variant-numeric: tabular-nums; font-weight: 700; }

.lv-stage { border: 1px solid var(--rule); border-radius: 8px; background: var(--paper); overflow: hidden; }
.lv-stage svg { display: block; width: 100%; height: auto; }

.lv-readout { margin: 12px 0 0; }
.lv-readout table { margin: 0; }

details { border: 1px solid var(--rule); border-radius: 6px; margin: 20px 0 0; }
summary { cursor: pointer; padding: 12px; font-weight: 700; }
details > div { padding: 0 12px 12px; }
details pre { white-space: pre-wrap; font: inherit; margin: 0; }

.lv-visually-hidden {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: .001ms !important; transition-duration: .001ms !important; }
}
@media print {
  button, input[type="range"] { display: none; }
  details { open: true; }
}
`;

/**
 * Height reporting for the embedding page, plus a tiny helper the builders use.
 * Written as a classic script rather than a module so it runs from a `file:`
 * URL and inside a sandboxed iframe without needing a server.
 */
const RUNTIME = `
(function () {
  function reportHeight() {
    var h = Math.ceil(document.documentElement.scrollHeight);
    try { parent.postMessage({ type: 'lv:height', height: h }, '*'); } catch (e) {}
  }
  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);
  if (window.ResizeObserver) new ResizeObserver(reportHeight).observe(document.body);
  window.lvReportHeight = reportHeight;
})();
`;

/**
 * Assemble a complete standalone HTML document.
 *
 * `main` is the interactive itself. `script` is its behaviour. The text
 * equivalent is appended for every page, without exception.
 */
export function page({ spec, a11y, main, script, extraHead = '' }) {
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(spec.title)}</title>
<style>${CSS}</style>
${extraHead}
</head>
<body>
<main>
  <h1>${esc(spec.title)}</h1>
  ${spec.subtitle ? `<p class="lv-sub">${esc(spec.subtitle)}</p>` : ''}
  <div class="lv-rule"></div>
  <p class="lv-intent"><strong>What this is for</strong>${esc(spec.intent)}</p>
  ${main}
  <details>
    <summary>Text version of this activity</summary>
    <div><pre>${esc(a11y.textEquivalent)}</pre></div>
  </details>
  ${spec.source ? `<p style="opacity:.75;font-size:12px;margin-top:16px">Source: ${esc(spec.source)}</p>` : ''}
</main>
<script>${RUNTIME}</script>
<script>${script}</script>
</body>
</html>`;
}

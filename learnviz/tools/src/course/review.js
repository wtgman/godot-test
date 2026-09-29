/**
 * The course review app: one page of the course at a time.
 *
 * The designer sees what the page says, the options proposed for it, and can
 * try each option as a learner. Choosing one records it, with where on the
 * page it should go, and moves straight on to the next undecided page. Choices
 * are kept in the browser as they are made, and saved as choices.json (or
 * copied as text for Claude) when the designer is ready.
 *
 * One self-contained file. Sketches are loaded from the sketches folder beside
 * it only when an option is opened, so a long course stays quick.
 */

import { esc } from '../svg.js';
import { safeJson } from '../runtime/client.js';
import { icon } from '../lo/shell.js';

const CSS = `
:root { color-scheme: light; --ink: #000054; --soft: #3a3a6e; --line: #d9d9e6; --wash: #f5f5fa; --accent: #fac800; --ok: #00706b; --ok-wash: #e3f2f1; --miss: #a4177c; --focus: #1a56c4; --draft: #fdf223; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #ffffff; color: var(--ink); font: 16px/1.55 Helvetica, Arial, sans-serif; }
button, select, textarea { font: inherit; color: inherit; }
a { color: var(--focus); }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
[tabindex="-1"]:focus { outline: none; }
.top { position: sticky; top: 0; z-index: 5; background: #fff; border-bottom: 2px solid var(--ink); }
.top-in { max-width: 1320px; margin: 0 auto; padding: 10px 16px; display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; }
.top h1 { font-size: 17px; margin: 0; flex: 1 1 260px; }
.prog { display: flex; align-items: center; gap: 10px; font-size: 14px; flex: 1 1 220px; }
.bar { flex: 1; height: 8px; background: var(--wash); border-radius: 999px; overflow: hidden; min-width: 80px; }
.bar span { display: block; height: 100%; width: 0; background: var(--ok); transition: width 300ms ease; }
.btn { border: 2px solid var(--ink); background: var(--ink); color: #fff; border-radius: 10px; padding: 8px 14px; font-weight: 800; cursor: pointer; min-height: 44px; }
.btn.sec { background: #fff; color: var(--ink); }
.btn.ghost { border-color: transparent; background: transparent; color: var(--ink); text-decoration: underline; padding-left: 4px; padding-right: 4px; }
.btn:disabled { opacity: .45; cursor: default; }
.layout { max-width: 1320px; margin: 0 auto; display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 24px; padding: 0 16px; }
.side { position: sticky; top: 72px; align-self: start; max-height: calc(100vh - 84px); overflow: auto; padding: 16px 4px 24px 0; }
.side h2 { font-size: 12.5px; letter-spacing: .07em; text-transform: uppercase; color: var(--ok); margin: 14px 0 4px; }
.side ol { list-style: none; margin: 0; padding: 0; }
.side button { display: flex; gap: 8px; align-items: flex-start; width: 100%; text-align: left; background: none; border: 0; border-radius: 8px; padding: 6px 8px; cursor: pointer; font-size: 14.5px; min-height: 36px; }
.side button:hover { background: var(--wash); }
.side button[aria-current="page"] { background: var(--ink); color: #fff; }
.dot { flex: 0 0 20px; height: 20px; border-radius: 50%; border: 2px solid var(--line); display: grid; place-items: center; font-size: 12px; font-weight: 800; margin-top: 1px; }
.dot.build { background: var(--ok); border-color: var(--ok); color: #fff; }
.dot.skip { background: var(--wash); border-color: var(--soft); color: var(--soft); }
.dot.options { border-color: var(--miss); color: var(--miss); }
.dot.none { border-style: dashed; }
main { padding: 20px 0 80px; min-width: 0; }
.kicker { font-size: 13px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--ok); margin: 0 0 4px; }
main h2.title { font-size: 30px; line-height: 1.15; margin: 0 0 10px; }
.decided { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; background: var(--ok-wash); border-left: 5px solid var(--ok); border-radius: 0 10px 10px 0; padding: 10px 14px; margin: 0 0 14px; }
.decided.skip { background: var(--wash); border-color: var(--soft); }
.decided.options { background: #fbeaf3; border-color: var(--miss); }
.page { border: 1px solid var(--line); border-radius: 14px; margin: 0 0 18px; }
.page summary { cursor: pointer; padding: 12px 16px; font-weight: 800; }
.page-text { max-height: 380px; overflow: auto; padding: 0 18px 14px; border-top: 1px solid var(--line); }
.page-text h3, .page-text h4, .page-text h5 { margin: 14px 0 4px; font-size: 16.5px; }
.page-text p { margin: 6px 0; }
.page-text .note { color: var(--soft); font-style: italic; }
.why { background: var(--wash); border-radius: 12px; padding: 12px 16px; margin: 0 0 18px; }
.why p { margin: 0 0 6px; }
.why ul { margin: 4px 0 0; padding-left: 20px; }
h3.opts { font-size: 20px; margin: 22px 0 10px; }
.opt { border: 1px solid var(--line); border-radius: 16px; padding: 16px 18px; margin: 0 0 14px; }
.opt.is-rec { border: 2px solid var(--ink); }
.opt.is-chosen { border: 3px solid var(--ok); background: #fafefd; }
.opt h4 { font-size: 18px; margin: 0 0 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 0 0 10px; padding: 0; }
.chip { display: inline-flex; gap: 5px; align-items: center; font-size: 12.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: var(--wash); }
.chip.rec { background: var(--ink); color: #fff; }
.chip.pat { color: var(--ok); }
.chip.block { background: #fbeaf3; color: var(--miss); }
.opt dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; margin: 0 0 10px; font-size: 15px; }
.opt dt { font-weight: 800; }
.opt dd { margin: 0; }
@media (max-width: 600px) { .opt dl { grid-template-columns: 1fr; } .opt dd { margin-bottom: 6px; } }
.opt details summary { cursor: pointer; font-weight: 800; color: var(--focus); min-height: 32px; }
.opt iframe { width: 100%; height: 620px; border: 1px solid var(--line); border-radius: 12px; margin-top: 6px; background: #fff; }
.choose { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 12px 0 8px; }
.choose label { font-weight: 700; font-size: 14.5px; }
.choose select { border: 2px solid var(--line); border-radius: 10px; padding: 8px 10px; min-height: 44px; max-width: 100%; background: #fff; }
.note-field { margin: 18px 0 10px; }
.note-field label { display: block; font-weight: 800; margin-bottom: 4px; }
.note-field textarea { width: 100%; min-height: 70px; border: 2px solid var(--line); border-radius: 10px; padding: 8px 10px; }
.after { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; border-top: 1px solid var(--line); padding-top: 14px; }
.empty { border: 1px dashed var(--line); border-radius: 14px; padding: 16px; }
.err { border-left: 5px solid var(--miss); background: #fbeaf3; padding: 10px 14px; border-radius: 0 10px 10px 0; }
.summary table { width: 100%; border-collapse: collapse; font-size: 15px; }
.summary th, .summary td { text-align: left; padding: 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.pages-toggle { display: none; }
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .side { position: static; max-height: none; padding: 8px 0 0; display: none; }
  .side.open { display: block; }
  .pages-toggle { display: inline-flex; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

/* eslint-disable no-var, prefer-arrow-callback, func-names */
function app(D) {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var main = $('main');
  var live = $('live');
  var byModule = [];
  D.pages.forEach(function (p) {
    var m = byModule[byModule.length - 1];
    if (!m || m.title !== p.module) byModule.push(m = { title: p.module, pages: [] });
    m.pages.push(p);
  });

  // Choices: what was saved to choices.json, with anything done since in this
  // browser on top.
  var state = {};
  Object.keys(D.saved || {}).forEach(function (k) { state[k] = D.saved[k]; });
  try {
    var local = JSON.parse(window.localStorage.getItem(D.key) || '{}');
    Object.keys(local).forEach(function (k) { state[k] = local[k]; });
  } catch (e) { /* storage unavailable: choices still work, and can be saved */ }
  function persist() {
    try { window.localStorage.setItem(D.key, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function decided(p) { return state[p.slug] && state[p.slug].decision; }
  function progress() {
    var n = D.pages.filter(decided).length;
    $('prog-n').textContent = n + ' of ' + D.pages.length + ' pages decided';
    $('prog-bar').style.width = (n / D.pages.length * 100) + '%';
  }

  function sideNav(current) {
    $('side').innerHTML = byModule.map(function (m) {
      return '<h2>' + esc(m.title) + '</h2><ol>' + m.pages.map(function (p) {
        var d = decided(p);
        var mark = d === 'build' ? '&#10003;' : d === 'skip' ? '&minus;' : d === 'options' ? '?' : '';
        var cls = d || (p.status === 'missing' ? 'none' : '');
        var word = d === 'build' ? 'activity chosen' : d === 'skip' ? 'no activity' : d === 'options' ? 'asked for other options' : p.status === 'missing' ? 'no options yet' : 'not decided';
        return '<li><button type="button" data-slug="' + esc(p.slug) + '"' + (current && current.slug === p.slug ? ' aria-current="page"' : '') + '>'
          + '<span class="dot ' + cls + '" aria-hidden="true">' + mark + '</span><span>' + p.n + '. ' + esc(p.title) + '<span class="sr">, ' + word + '</span></span></button></li>';
      }).join('') + '</ol>';
    }).join('');
  }

  // Page text arrives as light Markdown: # headings, - and 1. lists, | tables.
  function renderText(t) {
    return t.split('\n').map(function (line) {
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) return '<h' + Math.min(5, h[1].length + 2) + '>' + esc(h[2]) + '</h' + Math.min(5, h[1].length + 2) + '>';
      if (/^\[(Image|Embedded)/.test(line)) return '<p class="note">' + esc(line) + '</p>';
      if (!line.trim()) return '';
      return '<p>' + esc(line) + '</p>';
    }).join('');
  }

  function placeOptions(p, o) {
    var cur = state[p.slug] && state[p.slug].decision === 'build' && state[p.slug].candidate === o.index ? state[p.slug].insert : o.insert;
    var val = function (v) { return typeof v === 'object' && v ? 'after:' + v.after : v; };
    var c = val(cur);
    var opts = [['end', 'At the end of the page'], ['start', 'At the top of the page']].concat(p.headings.map(function (h) { return ['after:' + h, 'At the end of the section "' + h + '"']; }));
    if (c && c.indexOf('after:') === 0 && p.headings.indexOf(c.slice(6)) < 0) opts.push([c, 'After "' + c.slice(6) + '" (not found on the page)']);
    return opts.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === c ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('');
  }

  function show(slug, focus) {
    var p = D.pages.filter(function (x) { return x.slug === slug; })[0];
    if (!p) { summary(); return; }
    if (location.hash !== '#' + slug) history.replaceState(null, '', '#' + slug);
    sideNav(p);
    var d = state[p.slug];
    var idx = D.pages.indexOf(p);
    var h = '<p class="kicker">' + esc(p.module) + ' &middot; Page ' + p.n + ' of ' + D.pages.length + (p.state !== 'published' ? ' &middot; unpublished' : '') + '</p>'
      + '<h2 class="title" id="page-h" tabindex="-1">' + esc(p.title) + '</h2>';
    if (d && d.decision) {
      var words = d.decision === 'build' ? '<strong>Chosen:</strong> ' + esc(d.name) + ' (' + esc(d.label || d.pattern) + ')'
        : d.decision === 'skip' ? '<strong>No activity for this page.</strong>' : '<strong>Asked for other options.</strong>';
      h += '<div class="decided ' + d.decision + '">' + words + (d.note ? '<span>Note: ' + esc(d.note) + '</span>' : '') + '<button type="button" class="btn ghost" data-act="undo">Undo this decision</button></div>';
    }
    if (p.badAlt) h += '<p class="err"><strong>Accessibility:</strong> ' + p.badAlt + ' image' + (p.badAlt === 1 ? '' : 's') + ' on this page ' + (p.badAlt === 1 ? 'has' : 'have') + ' no useful alt text. Fix in Canvas whatever you decide here.</p>';
    h += '<details class="page"' + (p.status === 'ready' ? '' : ' open') + '><summary>What the page says (' + p.words + ' words)</summary><div class="page-text">' + renderText(p.text) + '</div></details>';

    if (p.status === 'missing') {
      h += '<div class="empty"><p><strong>No options yet.</strong> Claude has not written a proposal for this page. Skip it, or move on and come back once options are in.</p></div>';
    } else if (p.status === 'invalid') {
      h += '<div class="err"><p><strong>The proposal for this page has a problem.</strong> ' + esc(p.error) + '</p></div>';
    } else if (p.status === 'skip') {
      h += '<div class="why"><p><strong>Suggested: no activity.</strong> ' + esc(p.reason) + '</p></div>'
        + '<div class="after"><button type="button" class="btn" data-act="skip">Agree, no activity</button><button type="button" class="btn sec" data-act="options">Ask for options for this page</button></div>';
    } else {
      var a = p.analysis || {};
      h += '<div class="why">' + (a.threshold ? '<p><strong>The idea that unlocks this page.</strong> ' + esc(a.threshold) + '</p>' : '')
        + ((a.misconceptions || []).length ? '<p><strong>What learners often believe.</strong></p><ul>' + a.misconceptions.map(function (m) { return '<li>' + esc(m.belief) + ' <em>' + esc(m.reality) + '</em></li>'; }).join('') + '</ul>' : '')
        + '</div><h3 class="opts">Options for this page</h3>';
      h += p.options.map(function (o) {
        var chosen = d && d.decision === 'build' && d.candidate === o.index;
        return '<article class="opt' + (o.recommended ? ' is-rec' : '') + (chosen ? ' is-chosen' : '') + '" aria-labelledby="o-' + o.n + '">'
          + '<h4 id="o-' + o.n + '">' + o.n + '. ' + esc(o.name) + '</h4>'
          + '<ul class="chips">' + (o.recommended ? '<li class="chip rec">Recommended</li>' : '') + (chosen ? '<li class="chip rec" style="background:var(--ok)">Chosen</li>' : '')
          + '<li class="chip pat">' + (D.icons[o.pattern] || '') + ' ' + esc(o.label) + '</li><li class="chip">' + esc(o.placement === 'any' ? 'Any time' : o.placement[0].toUpperCase() + o.placement.slice(1) + ' class') + '</li>'
          + '<li class="chip' + (o.data.blocking ? ' block' : '') + '">' + esc(o.data.label) + '</li><li class="chip">' + esc(o.effort) + ' effort</li>'
          + '<li class="chip">' + (o.scored ? 'Scored in Canvas' : 'Completion only') + '</li></ul>'
          + '<dl><dt>The angle</dt><dd>' + esc(o.angle) + '</dd><dt>Afterwards</dt><dd>' + esc(o.payoff) + '</dd>'
          + (o.addresses ? '<dt>Works on</dt><dd>' + esc(o.addresses) + '</dd>' : '')
          + (o.data.needs ? '<dt>Needs</dt><dd>' + esc(o.data.needs) + '</dd>' : '') + '</dl>'
          + '<div class="choose"><label for="where-' + o.n + '">Place it</label><select id="where-' + o.n + '">' + placeOptions(p, o) + '</select>'
          + '<button type="button" class="btn" data-act="build" data-n="' + o.n + '">' + (chosen ? 'Keep this one' : 'Build this one') + '</button></div>'
          + (o.sketch ? '<details data-sketch="' + esc(o.sketch) + '"' + (o.recommended && !chosen ? ' open' : '') + '><summary>Try it as a learner</summary></details>' : '<p><em>No sketch yet. It will be drafted if you choose it.</em></p>')
          + '</article>';
      }).join('');
      h += '<div class="note-field"><label for="note">Note for whoever builds it (optional)</label><textarea id="note" placeholder="For example: use a Vietnamese family name, or keep it under five minutes.">' + esc(d && d.note || '') + '</textarea></div>'
        + '<div class="after"><button type="button" class="btn sec" data-act="skip">No activity for this page</button><button type="button" class="btn sec" data-act="options">None of these, ask for others</button></div>';
    }
    h += '<div class="after" style="border:0;margin-top:10px">'
      + (idx > 0 ? '<button type="button" class="btn ghost" data-act="prev">&larr; Previous page</button>' : '')
      + (idx < D.pages.length - 1 ? '<button type="button" class="btn ghost" data-act="next">Next page without deciding &rarr;</button>' : '')
      + '<button type="button" class="btn ghost" data-act="summary">See all choices</button></div>';
    main.innerHTML = h;
    main.dataset.slug = p.slug;
    main.querySelectorAll('details[data-sketch]').forEach(function (det) {
      var load = function () {
        if (det.querySelector('iframe')) return;
        var f = document.createElement('iframe');
        f.src = det.getAttribute('data-sketch');
        f.title = 'Sketch: ' + det.parentNode.querySelector('h4').textContent;
        f.loading = 'lazy';
        det.appendChild(f);
      };
      if (det.open) load();
      det.addEventListener('toggle', function () { if (det.open) load(); });
    });
    if (focus) $('page-h').focus();
    window.scrollTo(0, 0);
  }

  function nextUndecided(from) {
    var i = D.pages.findIndex(function (p) { return p.slug === from; });
    for (var k = 1; k <= D.pages.length; k += 1) {
      var p = D.pages[(i + k) % D.pages.length];
      if (!decided(p)) return p.slug;
    }
    return null;
  }

  function decide(slug, entry) {
    var note = $('note');
    if (note && note.value.trim()) entry.note = note.value.trim();
    state[slug] = entry;
    persist();
    progress();
    var next = nextUndecided(slug);
    live.textContent = (entry.decision === 'build' ? 'Chosen: ' + entry.name + '.' : entry.decision === 'skip' ? 'No activity for this page.' : 'Asked for other options.') + (next ? ' Moving to the next page.' : ' Every page is decided.');
    if (next) show(next, true); else summary();
  }

  function summary() {
    history.replaceState(null, '', '#summary');
    sideNav(null);
    var n = { build: 0, skip: 0, options: 0 };
    D.pages.forEach(function (p) { var d = decided(p); if (d) n[d] += 1; });
    var left = D.pages.length - n.build - n.skip - n.options;
    main.innerHTML = '<p class="kicker">Summary</p><h2 class="title" id="page-h" tabindex="-1">' + (left ? left + ' page' + (left === 1 ? '' : 's') + ' still to decide' : 'Every page is decided') + '</h2>'
      + '<p>' + n.build + ' activit' + (n.build === 1 ? 'y' : 'ies') + ' to build, ' + n.skip + ' page' + (n.skip === 1 ? '' : 's') + ' with none, ' + n.options + ' waiting for other options.</p>'
      + '<p>Save your choices, then give them to Claude to build: put <code>choices.json</code> in the course folder, or copy them and paste them into the conversation.</p>'
      + '<p><button type="button" class="btn" data-act="save">Save choices.json</button> <button type="button" class="btn sec" data-act="copy">Copy choices for Claude</button></p>'
      + '<div class="summary"><table><thead><tr><th scope="col">Page</th><th scope="col">Decision</th><th scope="col">Where</th></tr></thead><tbody>'
      + D.pages.map(function (p) {
        var d = state[p.slug] || {};
        var what = d.decision === 'build' ? esc(d.name) + ' (' + esc(d.label || d.pattern) + ')' : d.decision === 'skip' ? 'No activity' : d.decision === 'options' ? 'Asked for other options' : '<em>Not decided</em>';
        var where = d.decision === 'build' ? (d.insert === 'start' ? 'Top of the page' : d.insert && d.insert.after ? 'End of "' + esc(d.insert.after) + '"' : 'End of the page') : '';
        return '<tr><td><button type="button" class="btn ghost" data-go="' + esc(p.slug) + '">' + p.n + '. ' + esc(p.title) + '</button></td><td>' + what + (d.note ? '<br><small>Note: ' + esc(d.note) + '</small>' : '') + '</td><td>' + where + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    $('page-h').focus();
  }

  function payload() {
    return JSON.stringify({ kind: 'course-choices', course: D.title, key: D.key, pages: state }, null, 2);
  }
  function save() {
    var blob = new Blob([payload() + '\n'], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'choices.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    live.textContent = 'Saved choices.json.';
  }
  function copy() {
    var text = 'Here are my choices for ' + D.title + '. Save them as choices.json in the course folder and build.\n\n```json\n' + payload() + '\n```';
    var done = function () { live.textContent = 'Copied. Paste it into the conversation with Claude.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { live.textContent = 'Could not copy. Use Save choices.json instead.'; });
    else live.textContent = 'Copying is not available here. Use Save choices.json instead.';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.slug) { show(b.dataset.slug, true); $('side').classList.remove('open'); return; }
    if (b.dataset.go) { show(b.dataset.go, true); return; }
    var act = b.dataset.act;
    var slug = main.dataset.slug;
    var p = D.pages.filter(function (x) { return x.slug === slug; })[0];
    if (act === 'save') save();
    else if (act === 'copy') copy();
    else if (act === 'summary') summary();
    else if (act === 'pages') { $('side').classList.toggle('open'); b.setAttribute('aria-expanded', $('side').classList.contains('open')); }
    else if (!p) return;
    else if (act === 'build') {
      var o = p.options.filter(function (x) { return String(x.n) === b.dataset.n; })[0];
      var w = $('where-' + o.n).value;
      decide(p.slug, { decision: 'build', candidate: o.index, option: o.n, name: o.name, pattern: o.pattern, label: o.label, insert: w.indexOf('after:') === 0 ? { after: w.slice(6) } : w });
    } else if (act === 'skip') decide(p.slug, { decision: 'skip' });
    else if (act === 'options') decide(p.slug, { decision: 'options' });
    else if (act === 'undo') { delete state[p.slug]; persist(); progress(); show(p.slug, true); live.textContent = 'Decision undone.'; }
    else if (act === 'prev') show(D.pages[D.pages.indexOf(p) - 1].slug, true);
    else if (act === 'next') show(D.pages[D.pages.indexOf(p) + 1].slug, true);
  });

  progress();
  var start = location.hash.slice(1);
  if (start === 'summary') summary();
  else show(D.pages.some(function (p) { return p.slug === start; }) ? start : (nextUndecided(D.pages[D.pages.length - 1].slug) || D.pages[0].slug), false);
}
/* eslint-enable */

export function reviewApp(data) {
  const icons = {};
  for (const p of data.pages) for (const o of p.options || []) icons[o.pattern] = icon(o.pattern, 13);
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(`Review: ${data.title}`)}</title>
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="top-in">
  <h1>${esc(data.title)}</h1>
  <div class="prog"><span id="prog-n"></span><div class="bar" aria-hidden="true"><span id="prog-bar"></span></div></div>
  <button type="button" class="btn sec pages-toggle" data-act="pages" aria-expanded="false" aria-controls="side">All pages</button>
  <button type="button" class="btn sec" data-act="copy">Copy choices</button>
  <button type="button" class="btn" data-act="save">Save choices.json</button>
</div></header>
<div class="layout">
  <nav class="side" id="side" aria-label="Pages in the course"></nav>
  <main id="main" aria-live="off"></main>
</div>
<p id="live" class="sr" aria-live="polite"></p>
<script>(${app.toString()})(${safeJson({ ...data, icons })});</script>
</body>
</html>
`;
}

/**
 * The browser runtime every activity carries.
 *
 * It is written here as an ordinary function so it is syntax checked and
 * readable, then inlined into each page with `Function.prototype.toString`.
 * The page therefore runs exactly this source, with no build step between.
 *
 * It does five jobs, all of them things every pattern needs and none of them
 * things a pattern should have to think about:
 *
 * 1. **LMS reporting.** Finds a SCORM 1.2 API if the page is running inside a
 *    SCORM player (Canvas's SCORM tool, for instance), and reports completion
 *    and score to it. Outside an LMS it does nothing, so the same file works
 *    opened locally, hosted, or in a package.
 * 2. **Announcements.** One polite live region, so feedback is heard, not just seen.
 * 3. **Presenter mode.** `#present` on the address turns the activity into
 *    something a teacher can drive from the front of a room with the arrow keys.
 * 4. **Frame height.** Posts its height to a parent page, for hosts that listen.
 * 5. **Small helpers.** Escaping and number formatting, identical everywhere.
 */

import { createExpr, createModel } from './expr.js';

/* eslint-disable no-var, prefer-arrow-callback, func-names */
function lvRuntime(CONFIG) {
  var doc = document;
  var root = doc.documentElement;

  /* ---------------- SCORM 1.2 ---------------- */

  function findApi(win) {
    var hops = 0;
    try {
      while (win && hops < 12) {
        if (win.API && typeof win.API.LMSInitialize === 'function') return win.API;
        if (win.parent === win) break;
        win = win.parent;
        hops += 1;
      }
    } catch (e) {
      // A cross-origin parent throws on access. That means no reachable LMS.
    }
    return null;
  }

  var api = findApi(window);
  if (!api) {
    try { if (window.opener) api = findApi(window.opener); } catch (e) { api = null; }
  }

  var lms = { connected: false, finished: false };
  if (api) {
    try {
      lms.connected = String(api.LMSInitialize('')) === 'true';
      if (lms.connected) {
        var initial = api.LMSGetValue('cmi.core.lesson_status');
        if (!initial || initial === 'not attempted') {
          api.LMSSetValue('cmi.core.lesson_status', 'incomplete');
          api.LMSCommit('');
        }
      }
    } catch (e) {
      lms.connected = false;
    }
  }

  function lmsSet(key, value) {
    try { api.LMSSetValue(key, String(value)); } catch (e) { /* ignore */ }
  }

  function finish() {
    if (!lms.connected || lms.finished) return;
    lms.finished = true;
    try { api.LMSCommit(''); api.LMSFinish(''); } catch (e) { /* ignore */ }
  }
  window.addEventListener('pagehide', finish);
  window.addEventListener('beforeunload', finish);

  // The best score across attempts is what gets reported. These are practice
  // activities: a learner who tries again and improves should be credited
  // with the improvement, not held to the first attempt.
  var best = null;
  var lastStatus = 'incomplete';

  function report(result) {
    var score = typeof result.score === 'number' && isFinite(result.score)
      ? Math.max(0, Math.min(1, result.score))
      : null;
    if (score !== null && (best === null || score > best)) best = score;

    var status = result.complete ? 'completed' : 'incomplete';
    if (result.complete && best !== null && typeof CONFIG.passMark === 'number') {
      status = best >= CONFIG.passMark ? 'passed' : 'failed';
    }
    // Never step a status backwards, for example from completed to incomplete
    // because the learner pressed "try again".
    if (lastStatus !== 'incomplete' && status === 'incomplete') status = lastStatus;
    lastStatus = status;

    if (lms.connected) {
      if (best !== null) {
        lmsSet('cmi.core.score.min', 0);
        lmsSet('cmi.core.score.max', 100);
        lmsSet('cmi.core.score.raw', Math.round(best * 100));
      }
      lmsSet('cmi.core.lesson_status', status);
      try { api.LMSCommit(''); } catch (e) { /* ignore */ }
    }
    try {
      window.parent.postMessage({ type: 'lv:result', status: status, score: best }, '*');
    } catch (e) { /* no parent */ }
    return status;
  }

  /* ---------------- Announcements ---------------- */

  var live = doc.getElementById('lv-live');
  function announce(text) {
    if (!live) return;
    // Clearing first makes a repeated message be announced again.
    live.textContent = '';
    window.setTimeout(function () { live.textContent = text; }, 40);
  }

  /* ---------------- Presenter mode ---------------- */

  var handlers = {};
  function presenting() { return /(^|[#&])present(&|$)/.test(window.location.hash); }

  function applyMode() {
    var on = presenting();
    root.classList.toggle('lv-present', on);
    var toggle = doc.getElementById('lv-present-toggle');
    if (toggle) {
      toggle.textContent = on ? 'Leave presenter view' : 'Presenter view';
      toggle.setAttribute('href', on ? '#' : '#present');
    }
    reportHeight();
  }

  doc.addEventListener('keydown', function (e) {
    if (!presenting()) return;
    var t = e.target;
    var tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    var key = e.key;
    // Space and Enter on a focused button must still press the button.
    if ((key === ' ' || key === 'Enter') && tag === 'BUTTON') return;

    if ((key === 'ArrowRight' || key === 'PageDown' || key === ' ') && handlers.next) {
      e.preventDefault();
      handlers.next();
    } else if ((key === 'ArrowLeft' || key === 'PageUp') && handlers.prev) {
      e.preventDefault();
      handlers.prev();
    } else if ((key === 'r' || key === 'R') && handlers.reveal) {
      e.preventDefault();
      handlers.reveal();
    } else if (key === 'Escape') {
      e.preventDefault();
      try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (err) { window.location.hash = ''; }
      applyMode();
    }
  });

  /* ---------------- Frame height ---------------- */

  function reportHeight() {
    try {
      window.parent.postMessage({ type: 'lv:height', height: Math.ceil(root.scrollHeight) }, '*');
    } catch (e) { /* no parent */ }
  }

  /* ---------------- Helpers ---------------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Format for display: grouped thousands, fixed decimals, never "NaN". */
  function fmt(value, decimals) {
    if (typeof value !== 'number' || !isFinite(value)) return 'not defined';
    var dp = typeof decimals === 'number' ? decimals : (Math.abs(value) < 10 ? 2 : Math.abs(value) < 100 ? 1 : 0);
    return value.toLocaleString('en-AU', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }

  window.addEventListener('hashchange', applyMode);
  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);
  if (window.ResizeObserver) new window.ResizeObserver(reportHeight).observe(doc.body);

  window.LV = {
    config: CONFIG,
    lms: lms,
    report: report,
    announce: announce,
    esc: esc,
    fmt: fmt,
    reportHeight: reportHeight,
    presenter: {
      active: presenting,
      on: function (h) {
        handlers.next = h.next || null;
        handlers.prev = h.prev || null;
        handlers.reveal = h.reveal || null;
      },
    },
  };

  applyMode();
}
/* eslint-enable */

/** JSON that is safe to place inside a <script> element. */
export function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** The runtime as source, configured, ready to put in a <script>. */
export function runtimeSource(config = {}) {
  return `(${lvRuntime.toString()})(${safeJson(config)});`;
}

/** The expression engine as source, for pages that evaluate formulas. */
export function exprSource() {
  return `var createExpr = ${createExpr.toString()};\nvar createModel = ${createModel.toString()};`;
}

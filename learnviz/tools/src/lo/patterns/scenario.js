/**
 * Scenario. Make decisions in a realistic situation and see what happens.
 *
 * Why it works: workplace judgement (what to say to a grieving client, how to
 * handle a customer who is shouting, when to escalate) is learned by practising
 * it in context. A scenario is that practice with the one thing real life does
 * not offer: failing costs nothing. A learner who says the wrong thing sees the
 * consequence, is told why, and gets to try again.
 *
 * It reads as a conversation, not a quiz, because that is what it is. Each
 * choice is answered in character, and a short coaching note says what the
 * choice did.
 *
 * The validator checks the whole graph: every branch leads somewhere, every
 * node can be reached, every path can finish, and every decision offers at
 * least one strong choice. A broken branch strands a learner mid-scenario with
 * no way forward, and that is the kind of fault nobody finds until a student
 * does.
 */

import { esc } from '../../svg.js';
import { accordion, nativeActivity, spacer } from '../native.js';

export const meta = {
  label: 'Scenario',
  verb: 'makes decisions in a realistic situation and sees the consequences',
  why: 'Judgement is learned by practising it in context, and in a scenario the wrong call costs nothing and teaches the most.',
  keys: 'Esc leave presenter view',
  scored: true,
  embleIcon: 'icon-chat',
};

const QUALITY = {
  best: { word: 'Strong', mark: '&#10003;', cls: 'is-ok', score: 1 },
  ok: { word: 'Workable', mark: '&#8776;', cls: 'is-part', score: 0.5 },
  poor: { word: 'Unhelpful', mark: '&#10007;', cls: 'is-miss', score: 0 },
};

export function validate(s, h) {
  h.str(s.setting, 'setting', { max: 700 });
  if (s.character !== undefined) {
    h.str(s.character.name, 'character.name', { max: 40 });
    h.str(s.character.role, 'character.role', { required: false, max: 100 });
  }
  const nodes = h.arr(s.nodes, 'nodes', { min: 2, max: 16 });
  const ids = new Map();
  nodes.forEach((nd, i) => {
    h.str(nd.id, `nodes[${i}].id`, { max: 40 });
    if (ids.has(nd.id)) h.fail(`nodes[${i}].id`, `"${nd.id}" is used twice`);
    ids.set(nd.id, nd);
    h.str(nd.say, `nodes[${i}].say`, { max: 600 });
    h.str(nd.speaker, `nodes[${i}].speaker`, { required: false, max: 40 });
    if (nd.choices === undefined) {
      h.str(nd.outcome, `nodes[${i}].outcome`, { max: 700 });
      return;
    }
    const choices = h.arr(nd.choices, `nodes[${i}].choices`, { min: 2, max: 4 });
    choices.forEach((c, j) => {
      h.str(c.label, `nodes[${i}].choices[${j}].label`, { max: 220 });
      h.oneOf(c.quality, `nodes[${i}].choices[${j}].quality`, Object.keys(QUALITY), { what: 'quality' });
      h.str(c.feedback, `nodes[${i}].choices[${j}].feedback`, { max: 500 });
      h.str(c.next, `nodes[${i}].choices[${j}].next`, { required: false, max: 40 });
    });
    if (!choices.some((c) => c.quality === 'best')) {
      h.fail(`nodes[${i}].choices`, 'has no choice marked "best". Every decision needs at least one strong option, or the learner can only choose between ways of getting it wrong.');
    }
  });

  h.str(s.start, 'start', { max: 40 });
  if (!ids.has(s.start)) h.fail('start', `is "${s.start}", which is not a node id`);

  for (const [id, nd] of ids) {
    for (const [j, c] of (nd.choices || []).entries()) {
      if (c.next !== undefined && !ids.has(c.next)) {
        h.fail(`node "${id}" choice ${j + 1}`, `leads to "${c.next}", which is not a node id`);
      }
    }
  }

  // Every node reachable from the start.
  const seen = new Set([s.start]);
  const queue = [s.start];
  while (queue.length) {
    const nd = ids.get(queue.shift());
    for (const c of nd.choices || []) {
      if (c.next && !seen.has(c.next)) { seen.add(c.next); queue.push(c.next); }
    }
  }
  const orphans = [...ids.keys()].filter((k) => !seen.has(k));
  if (orphans.length) h.fail('nodes', `${orphans.map((o) => `"${o}"`).join(', ')} can never be reached from the start`);

  // From every node, some path must finish. A choice without `next` finishes;
  // so does a node with an outcome. Loops are allowed (a poor choice can send
  // the learner back to try again) as long as there is a way out.
  const canFinish = new Set([...ids.values()].filter((nd) => !nd.choices).map((nd) => nd.id));
  let grew = true;
  while (grew) {
    grew = false;
    for (const nd of ids.values()) {
      if (canFinish.has(nd.id)) continue;
      if ((nd.choices || []).some((c) => !c.next || canFinish.has(c.next))) { canFinish.add(nd.id); grew = true; }
    }
  }
  const stuck = [...ids.keys()].filter((k) => !canFinish.has(k));
  if (stuck.length) h.fail('nodes', `from ${stuck.map((o) => `"${o}"`).join(', ')} there is no way to finish. Every path needs a way out.`);
  return {};
}

function speakerOf(s, nd) {
  return nd.speaker || (s.character ? s.character.name : 'Situation');
}

export function describe(s) {
  const items = [{ key: 'Setting', value: s.setting }];
  for (const nd of s.nodes) {
    items.push({ key: `${speakerOf(s, nd)} (${nd.id})`, value: nd.say });
    for (const c of nd.choices || []) {
      items.push({ key: `Choice "${c.label}"`, value: `${QUALITY[c.quality].word}. ${c.feedback}${c.next ? ` Leads to ${c.next}.` : ' Ends the scenario.'}` });
    }
    if (nd.outcome) items.push({ key: `Outcome of ${nd.id}`, value: nd.outcome });
  }
  return {
    shape: `A branching scenario with ${s.nodes.length} moments and ${s.nodes.reduce((n, nd) => n + (nd.choices || []).length, 0)} possible choices.`,
    marks: 'It reads as a conversation. At each decision the learner picks what to say or do, sees the response, and gets a short coaching note rating the choice as strong, workable or unhelpful.',
    structure: `Starts at "${s.start}". Different choices lead to different moments. It ends with a summary of every decision made.`,
    items,
    visibleText: [s.setting, ...s.nodes.map((nd) => nd.say), ...s.nodes.flatMap((nd) => (nd.choices || []).map((c) => c.label))],
  };
}

export function figure() {
  return null;
}

/* eslint-disable no-var, prefer-arrow-callback, func-names */
function client(D) {
  var LV = window.LV;
  var $ = function (id) { return document.getElementById(id); };
  var log = $('lv-sc-log');
  var choicesEl = $('lv-sc-choices');
  var endEl = $('lv-sc-end');
  var path = [];
  var nodes = {};
  D.nodes.forEach(function (n) { nodes[n.id] = n; });

  function speaker(n) { return n.speaker || D.character || 'Situation'; }

  function turn(who, text, cls) {
    var el = document.createElement('div');
    el.className = 'lv-turn ' + (cls || '');
    el.innerHTML = '<p class="lv-turn-who">' + LV.esc(who) + '</p><p class="lv-turn-say">' + LV.esc(text) + '</p>';
    log.appendChild(el);
    return el;
  }

  function show(id) {
    var n = nodes[id];
    var el = turn(speaker(n), n.say, 'is-them');
    el.setAttribute('tabindex', '-1');
    if (!n.choices) { finish(n); el.focus(); return; }
    choicesEl.innerHTML = '<p class="lv-sc-ask">What do you do?</p>' + n.choices.map(function (c, i) {
      return '<button type="button" class="lv-sc-choice" data-i="' + i + '">' + LV.esc(c.label) + '</button>';
    }).join('');
    choicesEl.setAttribute('data-node', id);
    choicesEl.hidden = false;
    el.focus();
    LV.reportHeight();
  }

  choicesEl.addEventListener('click', function (e) {
    var b = e.target.closest('.lv-sc-choice');
    if (!b) return;
    var n = nodes[choicesEl.getAttribute('data-node')];
    var c = n.choices[Number(b.getAttribute('data-i'))];
    var q = D.quality[c.quality];
    choicesEl.hidden = true;
    turn('You', c.label, 'is-you');
    var note = document.createElement('div');
    note.className = 'lv-feedback ' + q.cls;
    note.innerHTML = '<span class="lv-mark">' + q.mark + ' ' + q.word + '</span><div><p>' + LV.esc(c.feedback) + '</p></div>';
    log.appendChild(note);
    path.push({ node: n.id, label: c.label, quality: c.quality });
    LV.announce(q.word + '. ' + c.feedback);
    if (c.next) show(c.next); else finish(null);
  });

  function finish(n) {
    choicesEl.hidden = true;
    var score = path.length ? path.reduce(function (a, p) { return a + D.quality[p.quality].score; }, 0) / path.length : 1;
    var strong = path.filter(function (p) { return p.quality === 'best'; }).length;
    endEl.innerHTML = '<h2 id="lv-sc-end-h" tabindex="-1">How it went</h2>'
      + (n && n.outcome ? '<p>' + LV.esc(n.outcome) + '</p>' : '')
      + '<p><strong>' + strong + ' of ' + path.length + '</strong> of your choices were strong.</p>'
      + '<ol class="lv-sc-path">' + path.map(function (p) {
        var q = D.quality[p.quality];
        return '<li><span class="lv-tag ' + q.cls + '">' + q.mark + ' ' + q.word + '</span> ' + LV.esc(p.label) + '</li>';
      }).join('') + '</ol>'
      + '<div class="lv-actions"><button type="button" class="lv-btn" id="lv-sc-again">Try it again</button></div>';
    endEl.hidden = false;
    $('lv-sc-again').addEventListener('click', restart);
    LV.report({ complete: true, score: score });
    var h = $('lv-sc-end-h');
    if (!n) h.focus();
    LV.reportHeight();
  }

  function restart() {
    log.innerHTML = '';
    endEl.hidden = true;
    path = [];
    show(D.start);
  }

  show(D.start);
}
/* eslint-enable */

const CSS = `
.lv-sc-setting { font-size: 16.5px; }
.lv-sc-setting strong { display: block; font-size: 12.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--ok); margin-bottom: 4px; }
.lv-sc-log { display: grid; gap: 10px; }
.lv-turn { max-width: 88%; padding: 10px 14px; border-radius: 14px; background: var(--wash); }
.lv-turn:focus { outline: none; }
.lv-turn.is-them { border-top-left-radius: 4px; }
.lv-turn.is-you { justify-self: end; background: var(--ink); color: var(--paper); border-top-right-radius: 4px; }
.lv-turn-who { margin: 0 0 2px !important; font-size: 12.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; opacity: .8; }
.lv-turn-say { margin: 0 !important; font-size: 16.5px; }
.lv-sc-log .lv-feedback { margin: 0; max-width: 88%; justify-self: end; }
.lv-sc-ask { font-weight: 800; margin: 16px 0 8px !important; }
.lv-sc-choices { display: grid; gap: 8px; }
.lv-sc-choice {
  appearance: none; font: inherit; text-align: left; min-height: 48px; padding: 12px 14px; cursor: pointer;
  border: 2px solid var(--line-strong); border-radius: 12px; background: var(--paper); color: var(--ink);
  transition: border-color var(--t) ease, background var(--t) ease;
}
.lv-sc-choice:hover { border-color: var(--ink); background: var(--wash); }
.lv-sc-path { padding-left: 22px; }
.lv-sc-path li { margin-bottom: 6px; }
html.lv-present .lv-turn-say { font-size: 24px; }
html.lv-present .lv-sc-choice { font-size: 21px; }
`;

export function interactive(s, ctx) {
  const who = s.character ? `${s.character.name}${s.character.role ? `, ${s.character.role}` : ''}` : '';
  const body = `
<div class="lv-card is-quiet lv-sc-setting"><strong>The situation</strong>${esc(s.setting)}${who ? `<br><span class="lv-hint">You are speaking with ${esc(who)}.</span>` : ''}</div>
<div class="lv-card">
  <div class="lv-sc-log" id="lv-sc-log" aria-live="off"></div>
  <div class="lv-sc-choices" id="lv-sc-choices" role="group" aria-label="Your choices"></div>
</div>
<section class="lv-card" id="lv-sc-end" hidden aria-live="off"></section>`;
  const data = {
    start: s.start,
    nodes: s.nodes,
    character: s.character ? s.character.name : '',
    quality: QUALITY,
  };
  return { body, css: CSS, script: `(${client.toString()})(${ctx.safeJson(data)});` };
}

export function native(s) {
  const first = s.nodes.find((nd) => nd.id === s.start);
  const byId = Object.fromEntries(s.nodes.map((nd) => [nd.id, nd]));
  const instructions = `<p><strong>The situation.</strong> ${esc(s.setting)}</p>
    <p><strong>${esc(speakerOf(s, first))}:</strong> ${esc(first.say)}</p>
    <p>What would you do? Decide before you open any of the options below.</p>`;
  const items = (first.choices || []).map((c) => {
    const next = c.next ? byId[c.next] : null;
    const inside = `<p><strong>${esc(QUALITY[c.quality].word)}.</strong> ${esc(c.feedback)}</p>`
      + (next ? `<p><strong>What happens next.</strong> ${esc(next.say)}</p>` : '');
    return accordion(c.label, inside);
  }).join('\n');
  const tail = s.nodes.length > 1 + (first.choices || []).length
    ? `<p>This is the first decision only. The full scenario, where each choice leads on to what happens next, is in the interactive version.</p>`
    : '';
  return nativeActivity({ title: `Scenario: ${s.title}`, iconClass: meta.embleIcon, instructions, content: `${items}\n${spacer}\n${tail}` });
}

export function teach(s) {
  return {
    placement: 'during',
    before: 'Can be set before class, but works best when learners can talk about their choices afterwards.',
    during: 'Run it in presenter view as a whole class. At each decision, have the room vote, pick the most popular answer, and see what happens. Then go back and try the choice nobody picked. The poor choices are where the learning is, so make sure the room sees at least one.',
    after: 'Set it for individual practice. Learners can replay it and try different approaches. The score reflects how many strong choices they made.',
    presenter: ['Click the choice the room votes for.', 'Use Try it again at the end to explore a different path.'],
  };
}

export function answerKey(s) {
  const rows = [];
  for (const nd of s.nodes) {
    for (const c of nd.choices || []) {
      rows.push({ prompt: `${nd.id}: ${c.label}`, answer: QUALITY[c.quality].word, why: c.feedback });
    }
  }
  return rows;
}

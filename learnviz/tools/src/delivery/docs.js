/**
 * The two documents that travel with every learning object.
 *
 * The teacher guide answers "how do I use this": where it goes in the week,
 * what to say at the front of the room, what to listen for, the answer key and
 * how to get it into Canvas. The review sheet answers "is this safe to put in
 * front of students": every source with a box to tick, every answer to confirm,
 * and what the automated accessibility checks found.
 *
 * Both are written once as a list of blocks and rendered to Markdown (for the
 * repository and for an agent to read) and to a printable HTML page (for the
 * teacher, who should not need a Markdown viewer).
 */

import { esc } from '../svg.js';

const PLACEMENT_WORDS = {
  before: 'Before class, as a hook or a warm-up',
  during: 'During class, at the front of the room',
  after: 'After class, as practice or revision',
  any: 'Anywhere in the week',
};

const KIND_WORDS = {
  supplied: 'From the supplied course material',
  research: 'Found by research. Check it against the original.',
  teacher: 'From the teacher',
  constructed: 'Written for this activity. Check it for realism, not accuracy.',
  general: 'General knowledge in the field',
};

/* ------------------------------------------------------------------ */
/* Blocks and renderers                                                */
/* ------------------------------------------------------------------ */

// Inline markup allowed in block text: **bold** and `code`. Nothing else, so
// content written by anyone renders the same in both formats.
function inlineHtml(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function toMarkdown(blocks) {
  const out = [];
  for (const b of blocks) {
    switch (b[0]) {
      case 'h1': out.push(`# ${b[1]}`); break;
      case 'h2': out.push(`## ${b[1]}`); break;
      case 'h3': out.push(`### ${b[1]}`); break;
      case 'p': out.push(b[1]); break;
      case 'note': out.push(`> ${b[1]}`); break;
      case 'ul': out.push(b[1].map((t) => `- ${t}`).join('\n')); break;
      case 'ol': out.push(b[1].map((t, i) => `${i + 1}. ${t}`).join('\n')); break;
      case 'check': out.push(b[1].map((t) => `- [ ] ${t}`).join('\n')); break;
      case 'kv': out.push(b[1].map(([k, v]) => `- **${k}.** ${v}`).join('\n')); break;
      case 'pre': out.push(`\`\`\`\n${b[1]}\n\`\`\``); break;
      case 'table': {
        const [head, rows] = [b[1], b[2]];
        const cell = (t) => String(t).replace(/\|/g, '\\|').replace(/\n/g, ' ');
        out.push([
          `| ${head.map(cell).join(' | ')} |`,
          `| ${head.map(() => '---').join(' | ')} |`,
          ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
        ].join('\n'));
        break;
      }
      default: throw new Error(`Unknown block ${b[0]}`);
    }
  }
  return `${out.join('\n\n')}\n`;
}

const DOC_CSS = `
:root { color-scheme: light; }
body { margin: 0; background: #ffffff; color: #000054; font: 16px/1.55 Helvetica, Arial, sans-serif; }
main { max-width: 780px; margin: 0 auto; padding: 28px 16px 48px; }
h1 { font-size: 28px; line-height: 1.2; margin: 0 0 6px; }
h2 { font-size: 20px; margin: 30px 0 8px; padding-top: 14px; border-top: 1px solid #d9d9e6; }
h3 { font-size: 16.5px; margin: 20px 0 6px; }
p, ul, ol { margin: 0 0 12px; }
li { margin: 3px 0; }
code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 14px; background: #f5f5fa; padding: 1px 5px; border-radius: 4px; }
pre { white-space: pre-wrap; background: #f5f5fa; padding: 14px; border-radius: 8px; font-size: 14px; }
.note { border-left: 4px solid #fac800; background: #fffbe6; padding: 10px 14px; border-radius: 0 8px 8px 0; }
.check { list-style: none; padding-left: 0; }
.check li { display: flex; gap: 10px; align-items: flex-start; }
.check li::before { content: ""; flex: 0 0 18px; height: 18px; margin-top: 3px; border: 2px solid #000054; border-radius: 4px; }
table { width: 100%; border-collapse: collapse; font-size: 14.5px; margin: 0 0 14px; }
th, td { text-align: left; vertical-align: top; padding: 8px; border-bottom: 1px solid #d9d9e6; }
th { font-size: 12.5px; text-transform: uppercase; letter-spacing: .04em; }
a { color: #1a56c4; }
.kicker { font-size: 13px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #00706b; margin: 0 0 8px; }
@media print { body { font-size: 12pt; } h2 { break-after: avoid; } main { padding: 0; } a { color: inherit; } }
`;

function toHtml(blocks, { title, kicker }) {
  const out = [];
  for (const b of blocks) {
    switch (b[0]) {
      case 'h1': out.push(`${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ''}<h1>${inlineHtml(b[1])}</h1>`); break;
      case 'h2': out.push(`<h2>${inlineHtml(b[1])}</h2>`); break;
      case 'h3': out.push(`<h3>${inlineHtml(b[1])}</h3>`); break;
      case 'p': out.push(`<p>${inlineHtml(b[1])}</p>`); break;
      case 'note': out.push(`<p class="note">${inlineHtml(b[1])}</p>`); break;
      case 'ul': out.push(`<ul>${b[1].map((t) => `<li>${inlineHtml(t)}</li>`).join('')}</ul>`); break;
      case 'ol': out.push(`<ol>${b[1].map((t) => `<li>${inlineHtml(t)}</li>`).join('')}</ol>`); break;
      case 'check': out.push(`<ul class="check">${b[1].map((t) => `<li><span>${inlineHtml(t)}</span></li>`).join('')}</ul>`); break;
      case 'kv': out.push(`<ul>${b[1].map(([k, v]) => `<li><strong>${esc(k)}.</strong> ${inlineHtml(v)}</li>`).join('')}</ul>`); break;
      case 'pre': out.push(`<pre>${esc(b[1])}</pre>`); break;
      case 'table': out.push(`<table><thead><tr>${b[1].map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${b[2].map((r) => `<tr>${r.map((c) => `<td>${inlineHtml(String(c))}</td>`).join('')}</tr>`).join('')}</tbody></table>`); break;
      default: throw new Error(`Unknown block ${b[0]}`);
    }
  }
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${DOC_CSS}</style>
</head>
<body><main>
${out.join('\n')}
</main></body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

/** The pattern's defaults, overridden and extended by whatever the spec says. */
export function teachingNotes(b) {
  const d = b.teach || {};
  const t = b.lo.teach || {};
  return {
    placement: b.lo.placement || d.placement || 'any',
    before: t.before || d.before,
    during: t.during || d.during,
    after: t.after || d.after,
    watchFor: t.watchFor,
    ask: t.ask || [],
    say: t.say || d.script || [],
    presenter: d.presenter || [],
  };
}

function lmsBehaviour(b) {
  if (!b.meta.scored) {
    return 'Through the SCORM package, it tells Canvas when the learner has finished. There is no score: this activity is about the thinking, not the mark.';
  }
  const pass = typeof b.lo.passMark === 'number' ? ` A pass needs ${Math.round(b.lo.passMark * 100)} per cent.` : '';
  return `Through the SCORM package, it sends completion and a score to Canvas. The score kept is the learner's best attempt, so trying again never lowers it, and showing a model answer never raises it.${pass}`;
}

function deliveryBlocks(b, slug, files) {
  const has = (name) => files.some((f) => f.name === name);
  const blocks = [
    ['h2', 'Getting it into Canvas'],
    ['p', 'Four routes, from the most capable to the most portable. Choose one for students, and keep presenter view for class.'],
    ['h3', '1. As a SCORM activity (tracked, can be graded)'],
    ['p', `Upload \`${slug}.scorm.zip\` through the SCORM tool in your course navigation, if your institution has it switched on. Choose whether to import it as a graded assignment. The activity runs inside Canvas and reports back.`],
    ['h3', '2. As a Canvas page (works everywhere, no hosting)'],
    ['p', 'Open `canvas-page.html` in a text editor, copy everything, and paste it into the HTML editor of a Canvas page. It uses Emble blocks and expandable answers rather than scripts, so it survives the Canvas editor and works in the mobile app. Learners answer before they open each answer.'],
    ['h3', '3. As an embedded web page'],
    ['p', 'If your institution can host a web page, publish `index.html` and paste `canvas-embed.html` into a Canvas page, replacing the highlighted placeholder with the page address. Do not upload `index.html` to Canvas Files: Canvas shows uploaded HTML without running its scripts, so it will load and do nothing.'],
    ['h3', '4. In class, from your own computer'],
    ['p', 'Open `index.html` in a browser and add `#present` to the end of the address, or use the Presenter view link at the bottom of the page. It needs no internet connection and no login.'],
  ];
  const video = files.find((f) => /^animation\./.test(f.name));
  if (video) {
    blocks.push(
      ['h3', 'As a video in Canvas Studio'],
      ['p', `Upload \`${video.name}\` to Canvas Studio rather than Course Files. Studio adds captions and plays it everywhere, including the mobile apps. It shows the model running at its starting settings, so pair it with a question about what learners notice. Keep the text version on the page beside it.`],
    );
  }
  if (has('figure.png')) {
    blocks.push(
      ['h3', 'The figure on its own'],
      ['p', 'Upload `figure.png` to Canvas Files and paste `figure.canvas.html` into a page, then replace the highlighted line with the uploaded image. The alt text and the image description are already written.'],
    );
  }
  return blocks;
}

/* ------------------------------------------------------------------ */
/* Teacher guide                                                       */
/* ------------------------------------------------------------------ */

export function teacherGuide(b, { slug, files }) {
  const n = teachingNotes(b);
  const blocks = [['h1', b.lo.title]];
  if (b.draft.isDraft) {
    blocks.push(['note', `**Draft.** ${b.draft.reasons.join(' ')} Check it with the review sheet before students see it.`]);
  }
  blocks.push(
    ['kv', [
      ['Activity', `${b.meta.label}. The learner ${b.meta.verb}.`],
      ['Learning intent', b.lo.intent],
      ['Best placed', PLACEMENT_WORDS[n.placement] || PLACEMENT_WORDS.any],
      ['Why it works', b.meta.why],
      ['In Canvas', lmsBehaviour(b)],
    ]],
    ['h2', 'Using it across the week'],
    ['kv', [
      ['Before class', n.before],
      ['During class', n.during],
      ['After class', n.after],
    ].filter(([, v]) => v)],
  );
  if (n.watchFor) blocks.push(['h3', 'Listen for'], ['p', n.watchFor]);
  if (n.ask.length) blocks.push(['h3', 'Questions to ask the room'], ['ol', n.ask]);

  blocks.push(
    ['h2', 'Presenter view'],
    ['p', 'Add `#present` to the address, or use the link at the bottom of the page. Text gets larger, the page fills the screen, and the keyboard drives it.'],
    ['ul', [...n.presenter, `Keys: ${b.meta.keys}.`]],
  );
  if (n.say.length) blocks.push(['h3', 'A script, if you want one'], ['p', 'Put it in your own words. Reading it out word for word is slower than talking.'], ['ol', n.say]);

  if (b.answerKey.length) {
    blocks.push(
      ['h2', 'Answer key'],
      ['table', ['Prompt', 'Answer', 'Why'], b.answerKey.map((k) => [k.prompt, k.answer, k.why || ''])],
    );
  }

  blocks.push(...deliveryBlocks(b, slug, files));

  blocks.push(
    ['h2', 'Files in this folder'],
    ['ul', files.map((f) => `\`${f.name}\`. ${f.what}`)],
  );

  return {
    md: toMarkdown(blocks),
    html: toHtml(blocks, { title: `Teacher guide: ${b.lo.title}`, kicker: 'Teacher guide' }),
  };
}

/* ------------------------------------------------------------------ */
/* Review sheet                                                        */
/* ------------------------------------------------------------------ */

export function reviewSheet(b) {
  const sources = b.lo.sources || [];
  const blocks = [['h1', b.lo.title]];
  blocks.push(b.draft.isDraft
    ? ['note', `**Status: draft.** ${b.draft.reasons.join(' ')}`]
    : ['note', '**Status: ready for release.** Every source is marked verified.']);

  blocks.push(
    ['h2', '1. Does it do what it is for?'],
    ['p', `**Intent.** ${b.lo.intent}`],
    ['p', `**Activity.** ${b.meta.label}: the learner ${b.meta.verb}.`],
    ['check', [
      'Doing this activity would move a learner towards the intent.',
      'The language suits the learners who will see it.',
      'Nothing in it would surprise or upset a learner without warning.',
    ]],
  );

  blocks.push(['h2', '2. Sources']);
  if (!sources.length) {
    blocks.push(['p', 'No sources are listed. If any fact, figure or quotation in the activity came from somewhere, add it to the spec and rebuild.']);
  } else {
    blocks.push(
      ['p', 'Open each source and confirm it says what the activity says. Then change its status to `verified` in the spec.'],
      ['table', ['Check', 'Source', 'Where it came from', 'Status', 'Note'], sources.map((s) => [
        '[ ]',
        s.url ? `${s.label} (${s.url})` : s.label,
        KIND_WORDS[s.kind] || s.kind,
        s.status === 'verified' ? 'Verified' : '**To check**',
        s.note || '',
      ])],
    );
  }
  const constructed = sources.filter((s) => s.kind === 'constructed');
  if (constructed.length) {
    blocks.push(
      ['h3', 'Written for this activity'],
      ['p', 'These parts were written, not quoted. Ask someone who does this work whether they ring true.'],
      ['check', constructed.map((s) => s.label)],
    );
  }

  if (b.answerKey.length) {
    blocks.push(
      ['h2', '3. Answers'],
      ['p', 'Confirm each answer, and that the reason given is the one you would give.'],
      ['table', ['Check', 'Prompt', 'Answer', 'Reason'], b.answerKey.map((k) => ['[ ]', k.prompt, k.answer, k.why || ''])],
    );
  }

  blocks.push(
    ['h2', `${b.answerKey.length ? '4' : '3'}. Accessibility`],
    b.problems.length
      ? ['ul', b.problems.map((p) => `Unresolved: ${p}`)]
      : ['p', 'Automated checks passed: colour contrast meets WCAG 2.2 AA, nothing is carried by colour alone, and every part of the figure appears in the text version. Every control works from the keyboard, and the page respects reduced motion.'],
    ['check', [
      'Try the activity with the keyboard only: Tab, arrow keys, Enter and Space.',
      'Read the text version. It should stand on its own for someone who cannot use the activity.',
    ]],
    ['h3', 'Text version'],
    ['pre', b.a11y.textEquivalent],
  );

  blocks.push(
    ['h2', 'Releasing it'],
    ['ol', [
      'Tick every box above.',
      'In the spec, set each source\'s `status` to `verified`, and set `"status": "release"`.',
      'Build again with `--release`. The build refuses anything still marked as a draft, and the draft banner disappears.',
    ]],
    ['p', 'Reviewed by: ______________________  Date: ____________'],
  );

  return {
    md: toMarkdown(blocks),
    html: toHtml(blocks, { title: `Review sheet: ${b.lo.title}`, kicker: 'Review sheet' }),
  };
}

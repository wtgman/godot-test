---
name: learnviz
description: Turns a piece of course content into learning activities for Canvas LMS, things a learner does rather than pictures they look at. Reads pasted text, a document or a link, works out what matters and what learners get wrong, and proposes a short menu of activities (predict, estimate, step-through, sort, order or timing, branching scenario, explorable model, recall cards), each with a working sketch to try in a gallery before anything is built. Once chosen, it builds each activity as a self-contained page with a presenter view for class, a SCORM package that reports to the Canvas gradebook, a script-free Canvas page, a teacher guide and a review sheet, plus figures, alt text and text versions. It also works through a whole Canvas course export page by page: the designer chooses an activity for each page in a review app, and everything chosen is built at once and written back into a course package to import. Use it whenever someone hands over course content or a Canvas course export and wants it made more engaging, interactive or visual, wants ideas for how to teach it, or asks how to get an interactive, simulation, animation, timeline, chart or diagram into Canvas. Pairs with cove-canvas-page, which builds the page these drop into.
---

# Learning activity builder

Turns content into something a learner does. Not a picture of the content: an
activity where the learner commits to an answer, gets told why, and comes away
able to do something they could not do before.

**Propose before you build.** The first output is a menu, never an artefact. The
first idea is usually the one the prose already states, and once something is
built people edit it rather than ask whether it was the right thing. Choosing is
the decision worth spending time on.

---

## Who it is for

Three people use what this skill produces, and each needs something different.

- **The learning designer** needs ideas, and a way to judge them. The proposal
  gallery gives them options they had not thought of, each tried as a learner
  before choosing. The dashboard lays the chosen activities across the week and
  shows the gaps. The review sheet tells a subject expert exactly what to check.
- **The teacher** needs to explain a concept at the front of a room. Every
  activity has a presenter view (add `#present` to the address) with large text
  and keyboard control, and a teacher guide with what to say, what to ask and
  what to listen for, before, during and after class.
- **The student** needs a reason to think. Every pattern asks for a commitment
  before it explains, gives feedback that says why, makes failing safe and
  retrying worthwhile, and works on a phone and from the keyboard.

---

## The process

### 1. Diagnose the content

Before any idea, answer these from the content. They go into the proposal's
`analysis`, and the validator requires them.

- **Key ideas.** The one to six things a learner would be lost without.
- **The threshold idea.** The one that, once grasped, changes how the rest
  looks. Usually not what the content spends longest on.
- **Misconceptions.** What learners arrive believing that is wrong. It never
  appears in the source, because the source was written by someone who does
  not hold it. Write each as the belief and what is actually the case.
- **Know or do.** What learners need to know, and what they need to be able to
  do. Knowing points to predict, step-through and cards. Doing points to sort,
  order, scenario and explore.

### 2. Find the angles

Read `references/ideation.md`. It has the ten moves for finding an angle (compared
to what, the misconception to pre-empt, the decision the learner will face, the
counterfactual and six more) and which pattern each one leads to. Aim for two or
three options the teacher had not thought of. A menu of the obvious is not
worth reading.

### 3. Choose patterns

Read `references/patterns.md` for how each works, why, and how it is used in
class. In short:

| The learner needs to... | Pattern |
|---|---|
| Confront something they already believe | `predict` |
| Get a feel for how big something is | `estimate` |
| Follow an explanation built one piece at a time | `stepthrough` |
| Tell similar things apart | `sort` |
| Get a sequence, or the timing of overlapping steps, right | `order` (`"mode": "timing"` for timing) |
| Make judgements in a conversation or situation | `scenario` |
| See how a relationship behaves when they push on it | `explore` |
| Make facts, terms or phrases automatic | `cards` |

A static figure (timeline, process, cycle, gantt, comparison, hierarchy, chart,
labelled, stat, waffle) is a component, not an activity. It sits inside a
predict reveal or drives a step-through, and it can still be built on its own
when a figure is all that is needed. `learnviz types` lists them.

Plan an arc, not a single object: something before class that makes learners
want to know, something during class for the teacher to explain with, and
something after class to practise with.

### 4. Propose, then stop

Write a proposal (`kind: "proposal"`, fields in `references/spec-reference.md`)
and give each strong candidate a **sketch**: a real learning-object spec, marked
`"sketch": true` or with its sources still to check, so it builds as a draft.
Point at it with `"sketchFile"` or put it inline.

```
node bin/learnviz.js propose ../examples/grief/proposal.json --out build
```

This writes `<topic>.gallery.html`, where every sketch runs live, and
`<topic>.options.md`. The teacher tries the sketches, ticks what they want and
copies a one-line reply ("Please build 1, 3 and 4."). **Build nothing until they
choose.** If their answers to the questions change the menu, revise the menu.

The validator enforces what makes a menu useful: an analysis, one to three
recommendations (not none, not most), a data status on every candidate that says
what is missing when something is, and sketches that can never pass as finished.
Fill in `rejected` too. It records why the obvious idea was not built, so nobody
proposes it again next term.

Skip straight to building only when the person has named the activity they want
and the content is in hand. Even then, say in one line what else it would
support.

### 5. Source everything

Read `references/sources-and-review.md`. Every fact, figure, date and quotation
in an activity gets an entry in `sources`, with its `kind` and a `status` of
`to-check`. Only a person who has opened the source can make it `verified`.
Content written for the activity, such as a scenario or example sentences, is
`kind: "constructed"`, checked for realism rather than accuracy.

**Never state a figure from memory as fact.** When research is needed, record
what you found and where in a `research.md` beside the specs, with a confidence
level, as `examples/instagram/research.md` does. If the figure does not exist,
say so, and propose the honest version instead.

### 6. Build

```
cd learnviz/tools
node bin/learnviz.js doctor                                  # what this machine can do
node bin/learnviz.js validate ../examples/grief/*.json       # readable errors, nothing written
node bin/learnviz.js build ../examples/grief/*.json --out build
node bin/learnviz.js build spec.json --out build --video     # also record a moving model
```

Each learning object becomes a folder, `build/<group>/<slug>/`, holding
`index.html` (the activity), `<slug>.scorm.zip`, `canvas-page.html`,
`canvas-embed.html`, the figure as SVG and PNG with its block, `text-version.txt`,
`spec.json`, and the teacher guide and review sheet in HTML and Markdown. The
output folder gets an `index.html` dashboard.

The build prints `OK`, `DRAFT` or `CHECK`. `CHECK` means an accessibility or
content check failed: fix the spec and build again. Never hand over a `CHECK`.
`DRAFT` is expected until a person has reviewed it.

Write the `intent` first, as a capability ("Learners can work backwards from a
serving time to decide when each part of a meal must start"), and the `goal` as
the learner-facing version ("work backwards from a serving time..."). If you
cannot write the intent, go back to step 1.

Fill the reasoning fields: `why` on sort and order items, `feedback` on scenario
choices, `explain` on explore outputs, the reveal on predict and estimate. That
is where the teaching lives. An activity that marks answers without saying why
is a quiz, not a lesson.

### 7. Review and release

A subject expert works through `review-sheet.html`: every source, every answer,
the constructed content, and the accessibility checks. Then set each source's
`status` to `verified` and `"status": "release"` in the spec, and build with
`--release`. The build refuses anything still in draft, and the draft banner
disappears.

### 8. Deliver

Read `references/canvas-delivery.md` before promising anything. The routes, best
first:

1. **SCORM** through the Canvas SCORM tool, where the institution has it on. The
   activity runs inside Canvas and reports completion, and a score for scored
   patterns, to the gradebook.
2. **Canvas page.** Paste `canvas-page.html` into the HTML editor. No scripts, so
   it survives the editor and works in the mobile app. The interaction becomes
   "answer, then open the box".
3. **Embedded page.** Publish `index.html` on a web host and paste
   `canvas-embed.html`. Never upload it to Course Files: Canvas will not run its
   scripts there.
4. **In class.** Open `index.html#present` from the teacher's own computer.

Where a URL, file id or H5P UUID is needed and not known, the blocks carry the
house placeholder highlight `#fdf223`. Never invent one.

### 9. Teach

The teacher guide carries it. Point the teacher at presenter view and at the
questions to ask, and remind them that the reveal is where the talking happens.

---

## A whole course

When the input is a Canvas course export (`.imscc`), read
`references/course-workflow.md` and follow it. The steps are the same, run
across the course:

```
node bin/learnviz.js course import my-course.imscc --out my-course   # outline and page texts
node bin/learnviz.js course status my-course                         # what each page needs next
node bin/learnviz.js course page my-course next                      # one page's gallery for the designer
node bin/learnviz.js course build-page my-course "<build code>"      # build that page, as a one-page update
```

Work one page at a time by default: send the designer that page's gallery,
build what they tick from the build code in their reply, hand over the
one-page update package, then the next page. `course review` and
`course build` do the whole course at once instead.

Read the whole course before proposing for any page. Write
`proposals/<slug>.json` for every page: options with sketches and a place on
the page, or `{ "kind": "skip", "reason": "..." }` for pages that need nothing.
A page can take more than one activity. Write finished specs for chosen
options into `specs/` when a sketch needs work or is missing. The designer
imports each one-page package into their existing course, choosing only that
page, or pastes the page HTML instead.

---

## Rules that are not negotiable

- **No invented data, dates, figures, quotations or citations.** Ask, research
  with sources, or choose a pattern that does not need them.
- **Nothing reaches students as fact until a person has checked it.** Sources
  start `to-check`. Placeholder content is `"sketch": true`.
- **Every activity explains itself.** Feedback says why, not just right or wrong.
- **Showing the answer never earns marks.** Model answers report completion,
  never a score. The score kept is the best attempt.
- **Accessible by construction.** No drag and drop, every control works from the
  keyboard with a 24px target or larger, nothing is carried by colour alone,
  contrast meets WCAG 2.2 AA, motion respects reduced-motion settings, and every
  activity ships a text version. If asked to override one, do not. Say which
  one and why it is there.
- **House style.** Australian English. No em dashes, en dashes or semicolons.
  Placeholder highlight `#fdf223`, brand accent `#fac800`, never swapped.
- **No fabricated Canvas file ids, course ids or H5P UUIDs.**

---

## Pre-flight

```
[ ] Analysis written: key ideas, threshold idea, misconceptions, know or do
[ ] Proposal presented with sketches, and options chosen by the teacher
[ ] Every fact has a source entry. Nothing from memory marked verified
[ ] Intent written as a capability, goal written for the learner
[ ] Reasoning fields filled: why, feedback, explain, reveal
[ ] Every build reports OK or DRAFT, never CHECK
[ ] Teacher guide read: placement, questions and answer key make sense
[ ] Review sheet handed to a subject expert, or the draft status explained
[ ] Delivery route chosen, and the teacher told what it needs
[ ] Placeholders #fdf223, accent #fac800, no invented ids or URLs
[ ] Australian English, no em dashes, en dashes or semicolons
```

---

## Reference files

- **`references/course-workflow.md`.** A whole Canvas course: import, proposals per page, the review app, choices, the build, and importing the package. Read when given an export.
- **`references/ideation.md`.** The analysis, the ten moves for finding an angle, questions worth asking, recommending an arc, recording what was ruled out. Read at steps 1 and 2.
- **`references/patterns.md`.** Each pattern: what the learner does, why it works, how a teacher uses it, what Canvas receives, and the traps. Read at step 3.
- **`references/spec-reference.md`.** Every field of every learning-object pattern, the proposal, and the figure types. Read before writing any spec.
- **`references/sources-and-review.md`.** Source kinds and statuses, research notes, drafts, the review sheet and release. Read at step 5.
- **`references/canvas-delivery.md`.** What Canvas strips, the delivery routes including SCORM, hosting, and how to check an embed worked. Read before promising anything.
- **`references/visual-design.md`.** How figures are drawn and checked, and how to add a figure type or a pattern.
- **`references/prompt-packs.md`.** Prompts for handing work to another model, for when something is needed that this toolkit does not build.

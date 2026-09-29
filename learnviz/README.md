# learnviz

Turns a piece of course content into learning activities for Canvas LMS:
things a learner does, not pictures they look at.

Give it content about the five stages of grief and it will not draw five boxes.
It will notice that almost every learner arrives believing the stages happen in
order, and propose an activity that asks them to put the stages in order before
showing them why that is the misconception. Then a step-through for the teacher
to explain with in class, and a sorting task for practice afterwards. Each
option comes as a working sketch to try before choosing.

Built for three people:

- **Learning designers** get ideas they had not thought of, a gallery to try
  them in, a week-by-week dashboard that shows the gaps, and a review sheet for
  the subject expert.
- **Teachers** get a presenter view of every activity (add `#present` to the
  address) and a teacher guide saying what to say, what to ask and what to
  listen for, before, during and after class.
- **Students** get activities that ask them to commit before they are told,
  explain why an answer is right or wrong, make failing safe and retrying
  worthwhile, and work on a phone and from the keyboard.

Sits alongside the `cove-canvas-page` skill, which builds the page these drop
into. `DESIGN.md` explains the thinking behind the design.

## What it is

Two halves, and the split is the point.

- **A skill** (`SKILL.md` and `references/`). The judgement: what matters in this
  content, what learners get wrong, which activity would change that, and how
  it gets into Canvas. That is language work, so a language model does it.
- **A toolkit** (`tools/`). The building: activities that behave identically
  every time, WCAG-checked colour, generated text versions, SCORM packages,
  Canvas-safe markup. That has to be exact and verifiable, so deterministic code
  does it.

## Quick start

Node 22 or later. No runtime dependencies.

```bash
cd tools
node bin/learnviz.js doctor                          # what this machine can do
node bin/learnviz.js patterns                        # the eight activity patterns
node bin/learnviz.js propose ../examples/grief/proposal.json --out build
node bin/learnviz.js build ../examples/*/[0-9]*.json --out build
npm test
```

`propose` writes a gallery page where every option can be tried as a learner,
ticked, and turned into a one-line reply. `build` writes a folder per activity
and a dashboard at `build/index.html`.

A built copy of every example is in `examples/build/`. Open
`examples/build/index.html` to try them.

## A whole course at once

Give it a Canvas course export and it works through the course page by page.

```bash
node bin/learnviz.js course import my-course.imscc --out my-course
# Claude reads the course and writes options for every page
node bin/learnviz.js course galleries my-course                    # every page's gallery, linked
node bin/learnviz.js course build-page my-course --from replies.txt   # build the stacked replies
```

Each page gets a gallery like the proposal galleries: the page's text, then
the options to try, each with a box to tick and a place on the page. The
designer goes through them all, ticks one or several per page, and stacks
each page's reply in one note. The build reads every build code in the
stack and builds each page as a small package that updates just that page in
the existing course, all in one folder, `ready-to-import/`, with an index
saying what to import. `course page` and a single build code do one page at a
time, and `course review` and `course build` do the whole course as a new
export. `examples/course/` has a sample export and a worked example.
`references/course-workflow.md` has the detail.

## The eight patterns

| Pattern | The learner | Scored |
|---|---|---|
| `predict` | commits to an answer, an order or a number before the explanation | No |
| `estimate` | guesses hidden values on a chart, then sees the real bars land against their guesses | No |
| `stepthrough` | follows a figure that builds one part at a time, with a sentence for each | No |
| `sort` | puts real examples into categories, with a nudge on the first miss and the reason on the second | Yes |
| `order` | puts steps in order, or times overlapping steps against a deadline | Yes |
| `scenario` | makes decisions in a conversation and sees where each leads | Yes |
| `explore` | pushes on a model with sliders (a formula, orbits, compounding) to meet challenges | With challenges |
| `cards` | recalls answers, and meets the missed ones again a few cards later | No |

Ten static figure types (timeline, process, cycle, gantt, comparison,
hierarchy, chart, labelled, stat, waffle) sit inside these as components, and
can still be built on their own. `references/patterns.md` covers each pattern.

## What each activity ships as

| File | For |
|---|---|
| `index.html` | The activity. One self-contained page that loads nothing from anywhere. `#present` for presenter view |
| `<slug>.scorm.zip` | SCORM 1.2 for the Canvas SCORM tool. Reports completion, and a score and pass or fail where the pattern is scored |
| `canvas-page.html` | Paste into any Canvas page. No scripts, so it survives the editor and works in the mobile app |
| `canvas-embed.html` | Iframe block for when `index.html` is hosted |
| `figure.svg`, `figure.png`, `figure.canvas.html` | The figure, with alt text and image description |
| `animation.mp4` | With `--video`, a recording of a moving model for Canvas Studio |
| `teacher-guide.html` | How to use it across the week, a script, questions, the answer key, and every delivery route |
| `review-sheet.html` | What a subject expert checks before release |
| `text-version.txt`, `spec.json` | The text version, and the spec to edit and rebuild |

## Getting it into Canvas

Canvas will not run JavaScript on a page, and an HTML file uploaded to Course
Files is shown without running its scripts. So the activities reach learners
through routes that do work:

1. **SCORM**, where the institution has the Canvas SCORM tool. The full
   activity, inside Canvas, reporting to the gradebook.
2. **A Canvas page**, pasted in. Works everywhere, today.
3. **An embedded page**, when there is a web host.
4. **Presenter view** from the teacher's own computer, for class.

`references/canvas-delivery.md` has the detail, including where Flourish,
Datawrapper, Chart.js and Plotly fit.

## Nothing reaches students unchecked

Every fact in an activity carries a source, and every source starts `to-check`.
Until a person has checked them all, the activity is a draft with a banner
across the top, and `build --release` refuses it. `references/sources-and-review.md`
explains the review.

## Accessibility

Generated from the same spec as the activity, so it cannot drift, and checked at
build time. The build prints `CHECK` rather than `OK` if anything fails.

- WCAG 2.2 AA contrast for every colour pair, and CIELAB distance between
  series colours
- Nothing carried by colour alone: every right and wrong has a word and a
  symbol, every coloured mark a label or texture
- No drag and drop. Every control works from the keyboard, with targets of 24px
  or more and focus that follows the action
- Changes are announced to screen readers, and motion respects reduced-motion
  settings
- Every activity ships a text version, and every figure a short alt, a full alt
  and a five-part image description
- Pages fit a 375px phone without sideways scrolling

## Tests

`npm test` runs 340 tests in about twelve seconds. They build every example and
check it is self-contained, deterministic, accessible and correctly drafted,
pin the validation rules, check every bundle file, and drive every example in
Chromium: completing it, reaching a control by keyboard, fitting a phone, and
using presenter view. A fake LMS hosts each SCORM package the way Canvas's
player does and checks the status, score, pass mark and best attempt it
receives, and that showing a model answer never sends a score. The course tests read
the sample export, place activities, write the package and check it, and a
designer's pass through the review app is driven in the browser. The browser
tests are skipped where Chromium or playwright-core is missing.

## Layout

```
SKILL.md                  the skill: diagnose, ideate, propose, source, build, deliver, teach
DESIGN.md                 why it is built this way
references/               ideation, patterns, spec reference, sources and review,
                          Canvas delivery, visual design, prompt packs
examples/                 grief, instagram, kitchen, science, service, project:
                          proposals, activity specs, research notes
examples/figures/         standalone figure specs
examples/build/           everything built, with a dashboard
examples/course/          a sample Canvas export and a worked course workspace
tools/
  bin/learnviz.js         the CLI
  src/lo/                 learning objects: schema, page shell, Canvas blocks
  src/lo/patterns/        the eight patterns
  src/runtime/            the in-page runtime (SCORM, presenter view), formulas, seeded shuffles
  src/delivery/           bundle, dashboard, teacher guide, review sheet, SCORM, zip
  src/proposal.js         proposals and the gallery
  src/course/             Canvas exports: reading, the workspace, the review app, writing back
  src/renderers/          the ten figure types
  src/spec.js             the figure schema
  src/a11y.js             alt text, image descriptions, the audit
  src/emble.js            Emble blocks for Canvas
  src/theme.js            palette and colour checks
  src/raster.js           PNG and video
  test/                   unit, proposal, learning-object and browser tests
```

# learnviz

Turns a piece of learner content into a visual or interactive learning object
that can be embedded in Canvas LMS, together with the alt text, the image
description, the plain text equivalent and the paste-ready Canvas markup.

Built to sit alongside the `cove-canvas-page` skill, which builds the page this
drops into. That skill reaches its Visual Element section and can only write a
brief for a human to draw something. This builds the actual thing.

## What it is

Two halves, and the split is the point.

- **A skill** (`SKILL.md` and `references/`). The judgement: what shape is this
  content, does it deserve a visual at all, which type teaches it, how does it
  get into Canvas. That is language work, so a language model does it.
- **A toolkit** (`tools/`). The rendering: exact geometry, WCAG-checked colour,
  generated text equivalents, Canvas-safe markup. That has to be identical every
  time and verifiable, so deterministic code does it.

A model asked to draw an accessible SVG freehand will produce something that
looks right and fails an audit. Code asked to decide what a piece of content
means will produce a bar chart of nothing. Neither half works alone.

## Quick start

```bash
cd tools
node bin/learnviz.js doctor                                  # what this machine can do
node bin/learnviz.js types                                   # the twelve visual types
node bin/learnviz.js validate ../examples/*.json
node bin/learnviz.js build ../examples/*.json --out ../examples/out
npm test
```

No dependencies. Node 22 or later. PNG output uses whatever Chromium is on the
machine; without one you still get SVG.

## What a build produces

For a static visual, from one spec:

| File | What it is |
|---|---|
| `.png` | Upload this to Canvas Files. Rendered at 2x so it stays sharp |
| `.svg` | The editable original. Do not paste it into Canvas, which strips inline SVG |
| `.canvas.html` | Paste-ready Emble block with the image description accordion |
| `.generic.html` | Plain HTML for anywhere that is not Canvas |
| `.txt` | Plain text equivalent, for a handout or transcript |
| `.notes.md` | Alt text, five-part image description, embed steps, audit results |

For an interactive: a single self-contained `.html` that loads nothing from
anywhere, plus the same supporting files.

## The twelve types

| Type | For |
|---|---|
| `timeline` | When things happened, in order |
| `process` | How something is done, first to last |
| `cycle` | Something that repeats, no start or end |
| `gantt` | What runs at the same time as what |
| `comparison` | How options differ across shared criteria |
| `hierarchy` | How a whole breaks into named parts and sub-parts |
| `chart` | How much, and which way it is moving |
| `labelled` | What the parts of a thing are called |
| `stat` | Big-number callouts. The infographic register |
| `waffle` | What share of a whole each part takes, as countable squares. Use instead of a pie chart |
| `sequencer` | **Interactive.** Learner predicts the timing, then checks against the model |
| `simulation` | **Interactive.** A model with sliders. Orbit (Kepler) and growth (compounding) |

## The Canvas constraint, in short

Canvas will not run your JavaScript. The Rich Content Editor strips `<script>`
on save, and an HTML file uploaded to Course Files is previewed in a sandboxed
iframe that usually withholds `allow-scripts`, so it loads and does nothing.

So there is a ladder, and the toolkit emits markup for the right rung:

1. **Static image.** Always works. The default.
2. **Video**, via Canvas Studio, for things that must move but need not respond.
3. **H5P**, the only rung that puts a mark in the gradebook.
4. **A self-contained page in an iframe**, which needs a host that serves it as
   an ordinary web page.

`references/canvas-embedding.md` has the detail, including where Flourish,
Datawrapper, Chart.js and Plotly fit and what each costs you.

## Accessibility

Generated from the same spec that draws the picture, so it cannot drift out of
step, and checked at build time. The build reports `CHECK` instead of `OK` if
anything fails.

- Short alt for `alt`, full alt for `data-ally-user-updated-alt`, five-part
  image description in the exact house labels and order
- Every colour pair meets WCAG 2.2 AA contrast
- No two series colours are perceptually close, measured as CIELAB distance
  rather than contrast ratio
- Nothing encoded by colour alone. Every coloured element carries a number, a
  label or a texture as well
- Bar chart axes include zero whenever the data is non-negative
- No drag and drop anywhere. Every control is keyboard operable
- Every iframe carries a title

## Layout

```
SKILL.md                  the skill: what to build and why
references/               spec reference, Canvas embedding, design notes, prompt packs
examples/                 eight worked examples, and their built output
tools/
  bin/learnviz.js         the CLI
  src/spec.js             the schema and validator
  src/theme.js            palette, contrast and colour-distance checks
  src/svg.js              SVG primitives and text measurement
  src/a11y.js             alt text, image descriptions, the audit
  src/emble.js            Canvas and Emble embed markup
  src/png.js              PNG cropping, for the Chromium screenshot bug
  src/raster.js           PNG and video rendering
  src/renderers/          the ten static types
  src/interactive/        the two interactive types
  test/                   104 tests
```

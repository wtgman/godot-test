---
name: learnviz
description: Turns a piece of learner content into a visual or interactive learning object that can be embedded in Canvas LMS. Takes pasted text, a document or a link, works out what shape the content actually is, and builds the visual that teaches it, along with the alt text, the five-part image description, the plain text equivalent and the paste-ready Canvas block. Use this skill whenever someone hands over course content and wants a diagram, timeline, schedule, process flow, cycle, comparison, chart, labelled diagram, simulation, animation or interactive built from it, or asks how to get an interactive into Canvas. Also use for auditing an existing visual against accessibility and Canvas embedding rules. Pairs with cove-canvas-page, which builds the page this drops into.
---

# Learning visual builder

Turns content into a learning object. Not a picture of the content, a thing a
learner does something with.

The output is always a bundle: the visual, its text equivalent, and the markup
to paste into Canvas. Never just an image.

## What this is for, and what it is not for

This skill exists because `cove-canvas-page` reaches its Visual Element section
and can only write a brief for a human to draw something in Napkin or Canva.
This builds the actual thing.

**Do not use this** to decorate a page. A visual that adds no information a
learner could not get from the prose is worse than no visual: it costs load
time, it costs a screen reader user a detour, and it teaches the learner that
the graphics on this course can be skipped. If the content does not have a
shape, say so and move on.

---

## Stage 0: Read the content and find the shape

**Do this before choosing anything.** The commonest failure is picking a chart
type because it looks good and then bending the content to fit.

Read the supplied content and answer one question: **what is the relationship
in here that a learner has to hold in their head?**

| The content is really about... | Build |
|---|---|
| When things happened, in order | `timeline` |
| How something is done, first to last | `process` |
| Something that repeats with no start or end | `cycle` |
| What runs at the same time as what | `gantt` |
| How options differ across the same criteria | `comparison` |
| How a whole breaks into named parts and sub-parts | `hierarchy` |
| How much, and which way it is moving | `chart` |
| What the parts of a thing are called | `labelled` |
| A handful of figures that should land as figures | `stat` |
| What share of a whole each part takes | `waffle` |
| Getting the timing right, as a skill to practise | `sequencer` (interactive) |
| A relationship the learner should push on and test | `simulation` (interactive) |

Two rules that resolve most of the hard cases.

- **Share versus amount.** If the point is what fraction of the whole something is, that is a `waffle`. If the point is how big it is, or which way it is moving, that is a `chart`. Never a pie: people read angles badly, and a learner cannot check a wedge the way they can count squares.
- **Sequence versus schedule.** If the steps happen one after another, that is a
  `process`. If they overlap, it is a `gantt`. A recipe with one pan is a
  process. A roast dinner is a gantt, because the whole difficulty is that the
  potatoes go in while the lamb is still cooking.
- **Show versus practise.** If the learner needs to *know* the timing, build the
  `gantt` and they read it. If they need to be *able to work it out*, build the
  `sequencer` and they predict it first. Prefer the sequencer whenever timing is
  an assessable skill rather than a fact.

If the content carries more than one shape, build more than one object. Do not
compress two relationships into one diagram.

### When to build nothing

Say so plainly, and say why, if:

- the content is a list of unrelated facts, which is a bold lead-in list, not a diagram
- the content is a single idea, which is a sentence
- there is no data, and inventing plausible numbers would be fabrication
- the only honest visual would need a photograph of real equipment that you do not have. Use `labelled` with no image, which produces a placed and numbered pin overlay plus a brief for the photograph.

---

## Stage 1: Write the learning intent first

Every spec requires an `intent`, and the builder refuses to run without one. It
is one sentence, and it starts with what the learner can do afterwards.

- Good: "Learners can work backwards from a serving time to decide when each component must start."
- Bad: "This shows the timing of a roast dinner."

The second one describes the picture. The first one describes a capability, and
it is the only test of whether the visual earned its place. Write it before the
data. If you cannot write it, go back to Stage 0.

---

## Stage 2: Write the spec

Specs are JSON. Run `learnviz types` for the list, and read
`references/spec-reference.md` for every field of every type.

Content rules that apply to all of them.

- **Never invent data.** If the content says enrolments rose, do not make up the numbers. Ask, or pick a type that does not need them.
- **Carry the reasoning across.** Fields like `detail`, `note` and `because` are where the teaching lives. A gantt bar that says "Rest the meat, 15 minutes" is a schedule. One that adds "carve straight away and the juices run out onto the board" teaches. Fill these in from the source content.
- **Respect the item limits.** The validator caps each type, and the caps are pedagogical rather than technical. Fourteen events on a timeline is the point at which it stops being a timeline and becomes a list. If you are over, split it.
- **Australian English, and the house punctuation rules.** No em dashes, no en dashes, no semicolons. Use "to" for ranges. These match `cove-canvas-page`.

---

## Stage 3: Build

```
cd learnviz/tools
node bin/learnviz.js doctor                              # once, to see what this machine can do
node bin/learnviz.js validate my-spec.json               # catches spec errors with a readable message
node bin/learnviz.js build my-spec.json --out build      # writes the bundle
node bin/learnviz.js build my-spec.json --out build --video   # also record an interactive as video
```

A static build writes `.svg`, `.png`, `.canvas.html`, `.generic.html`, `.txt`
and `.notes.md`. An interactive writes `.html`, `.canvas.html`, `.txt` and
`.notes.md`.

**Read the `.notes.md` before handing anything over.** It carries the alt text,
the five-part image description, the embed steps, and the result of the
automated accessibility checks. If any check is unresolved, the build prints
`CHECK` rather than `OK` and the notes list the problem. Fix the spec and build
again. Do not hand over a bundle with an unresolved check.

---

## Stage 4: Get it into Canvas

**Read `references/canvas-embedding.md` before promising anyone anything.**

The short version, because this is where the effort gets wasted:

- **Canvas will not run your JavaScript.** The Rich Content Editor strips `<script>` and every `on*` handler when the page is saved.
- **An HTML file uploaded to Course Files will not run its JavaScript either.** Canvas previews it in a sandboxed iframe that usually withholds `allow-scripts`. The page loads and does nothing. There is no workaround from inside the file.
- **So a static image is the default**, and it is what the Emble component library already expects. It always works.
- **An interactive needs a host**: somewhere that serves it as an ordinary web page, then an `<iframe>` pointing at it. Or rebuild it as an H5P activity through the tool already in Canvas, which is the only route that also puts a mark in the gradebook.

The `.canvas.html` file is written for the right rung automatically. Where a URL
or file id is needed and not known, it emits the house placeholder highlight
`#fdf223` rather than inventing one, exactly as `cove-canvas-page` requires.

---

## Stage 5: Pair it with a retrieval check

A visual a learner looks at is worth much less than a visual a learner is asked
a question about. Every object this skill produces should be followed on the
page by something that makes them use it.

- Interactive types already contain their own check.
- Static types need one alongside. Choose an H5P type from the taxonomy in `cove-canvas-page/references/h5p-library.md`, and write a question that cannot be answered without reading the graphic. "According to the schedule, what is already in the oven when the potatoes go in?" beats "What temperature is the lamb roasted at?"

---

## Accessibility is not a later step

It is generated from the same spec that draws the picture, so it cannot drift,
and it is not optional.

- **Short alt** goes in `alt`. One sentence, names the graphic, carries no data.
- **Full alt** goes in `data-ally-user-updated-alt`. This is what Ally reports against.
- **Five-part image description** goes in the `<details>` accordion, using the exact house labels in the exact house order. Under Visible text, every word that appears in the graphic is listed.
- **Plain text equivalent** ships as a `.txt` and inside every interactive.

The build enforces, and the test suite pins:

- every colour pair meets WCAG 2.2 AA contrast
- no two series colours are perceptually close, measured as Lab distance
- nothing is encoded by colour alone. Every coloured element also carries a number, a label or a texture
- a bar chart of non-negative values always includes zero on its axis
- no drag and drop anywhere, because it excludes keyboard and switch users
- every iframe has a title

If you are asked to override one of these, do not. Say which one and why it is
there.

---

## Pre-flight

Run every line before handing over. Fix and rebuild on any failure.

```
[ ] Learning intent written as a capability, not a description
[ ] Visual type chosen from the content shape, not from preference
[ ] No invented data, dates, figures or citations
[ ] Reasoning fields filled from the source, not left bare
[ ] Build reports OK, not CHECK, for every spec
[ ] Notes file read, alt text sensible when read aloud
[ ] Visible text list covers every label in the graphic
[ ] Correct embed rung chosen, and the teacher told what hosting it needs
[ ] Placeholder highlights are #fdf223, brand accent #fac800, neither swapped
[ ] No fabricated Canvas file ids, course ids or H5P UUIDs
[ ] A retrieval check accompanies every static visual
[ ] Australian English, no em dashes, en dashes or semicolons
```

---

## Reference files

- **`references/spec-reference.md`.** Every type, every field, worked examples. Read before writing a spec.
- **`references/canvas-embedding.md`.** The embedding ladder, what Canvas strips, hosting options, and the exact markup for each. Read before promising an interactive.
- **`references/visual-design.md`.** Why each type is drawn the way it is, the accessibility rules, and how to extend the toolkit with a new type.
- **`references/prompt-packs.md`.** Prompt templates for handing a spec to another LLM, for when a visual is needed that this toolkit does not build.

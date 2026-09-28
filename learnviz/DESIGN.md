# learnviz v2: design

This is the plan for the rebuild. It starts from the question the first version
skipped: **what does each person in the chain actually need?**

---

## The reframe

Version 1 was a visualisation tool. It read content and drew a picture of it.

That was the wrong frame. A picture is something a learner looks at. Learning
happens when the learner *does* something: makes a guess, sorts an example,
chooses what to say, drags a slider and watches the consequence. Ten of the
twelve types in v1 were static images, and the best thing it built was the one
exception, the recipe sequencer, where the learner commits to an answer before
seeing the model.

So v2 builds **learning moments**. Each one is a small activity, grounded in a
specific finding about how people learn, with a visual inside it where a visual
helps. The visual is a component, not the product.

---

## Three people, three jobs

### The learning designer: *enhance the content*

Gets a Word document or a slide deck from a subject expert. It is mostly prose.
The job is to turn it into something that works online, in Canvas, to the house
standard, accessibly, and on a deadline, and then get the expert to sign it off.

What they need from the tool:

1. **A diagnosis, not a drawing.** Where is this content hard? What do learners
   arrive believing that is wrong? Where is the prose hiding a process, a
   comparison, a decision? This is the part that takes experience, and the tool
   should do it first.
2. **Ideas they would not have had.** A menu of candidate activities, each with
   the angle, the payoff, and an honest statement of what data it needs.
3. **To try before choosing.** Every candidate in the menu is a live, clickable
   sketch. Choosing from working previews is faster and better than choosing
   from descriptions.
4. **Production that is already compliant.** Alt text, text equivalents,
   contrast, keyboard access, Emble markup, all generated, none of it an
   afterthought.
5. **Something to send the expert.** A review sheet listing every claim, where it
   came from, and every answer key, with a box to tick.
6. **Delivery that actually works in Canvas.** Not "host it somewhere". A route
   that works on Monday.

### The teacher: *explain the concept better*

Often an industry expert rather than a trained educator. Explains things live,
in a room, on a screen, and in the CoVE blended model has a before-class,
in-class and after-class moment for every topic.

What they need:

1. **Presenter mode.** The same activity the students use, opened full screen
   with big type, stepping through one piece at a time with the arrow keys. A
   diagram that builds while they talk is the single most useful thing a
   projector can show.
2. **A script.** What to say at each step. The misconception to listen for. The
   question to ask the room. Where students usually go wrong.
3. **A place in the week.** Which activity is the before-class hook, which is
   the in-class explanation, which is the after-class practice.

### The student: *a reason to lean in*

Engagement is not colour or animation. It comes from a small number of things,
and every activity must use at least one:

| Driver | What it looks like here |
|---|---|
| **Curiosity** | A question before the answer. You cannot un-want to know whether you were right. |
| **Agency** | Something to manipulate, choose or arrange, where the choice matters. |
| **Feedback that explains** | Not "incorrect". Why, and what to look at. |
| **Safe failure** | Being wrong in a scenario costs nothing and teaches the most. Predictions are never marked. |
| **Relevance** | The situations are the workplace they are training for. |
| **Just enough challenge** | A slider sandbox becomes a task when it has a challenge: "make Mars take one Earth year". |

---

## The eight patterns

Each pattern is a learner action with a reason it works. The research behind
each is in `references/learning-design.md`.

| Pattern | The learner | Why it works | Reach for it when |
|---|---|---|---|
| `predict` | commits to a guess (a choice, a number, an order) before the answer is shown | Generating an answer, even a wrong one, makes the correct one stick. It also surfaces the misconception so it can be corrected. | learners arrive with a wrong belief, or a fact is surprising |
| `stepthrough` | advances through a diagram that builds one piece at a time, with narration | Segmenting a complex visual lowers load. It is also the teacher's presenter mode. | a diagram has more than about five parts |
| `sort` | classifies real examples into categories, with feedback on each | Contrasting cases train discrimination, which is what recognition on the job actually is | categories are easy to define and hard to tell apart |
| `order` | puts steps in order, or times them, then checks | Retrieval of a procedure, and the errors expose the dependencies | a procedure, a sequence, a schedule |
| `scenario` | makes decisions in a realistic situation and sees what happens | Practice of judgement in context, where failing is free | workplace communication, ethics, customer or client work |
| `estimate` | guesses values on a chart before they are revealed | Confronting intuition about scale. The gap between guess and truth is memorable | numbers, comparisons, proportions |
| `explore` | changes inputs to a model and meets challenges | An explorable explanation: cause and effect felt rather than read | formulas, systems, anything with an "if this, then that" |
| `cards` | recalls, flips, rates themselves, repeats what they missed | Retrieval practice, spaced within the session | terms, rules, facts that must become automatic |

`explore` has three engines: a general **formula** engine (safe expressions, so
it covers Ohm's law, food cost percentage, break-even, dosage arithmetic and
most VET calculations), **orbit** (Kepler), and **growth** (compounding).

The ten v1 renderers stay, as **figures** that patterns use: the reveal after a
prediction, the diagram in a step-through, the chart in an estimate. A figure can
still be built on its own.

---

## One spec, every rendition

A learning object is written once and built into everything each person needs.

| File | For | What it is |
|---|---|---|
| `index.html` | student | The full interactive. One file, loads nothing from anywhere. |
| `index.html#present` | teacher | The same file in presenter mode: full screen, big type, arrow keys. |
| `<slug>.scorm.zip` | designer | The interactive as a SCORM 1.2 package. Upload through Canvas's SCORM tool as a graded or ungraded assignment. **No hosting needed.** Reports completion and score. |
| `canvas-page.html` | designer | A no-script version built from Emble components, to paste straight into a page. Answer first, then open the box. Works in every Canvas, today, including the mobile app. |
| `canvas-embed.html` | designer | The Emble iframe block for when the page is hosted somewhere. |
| `figure.svg`, `figure.png`, `figure.canvas.html` | designer | The figure, with its alt text and image description, for the page and for Ally. |
| `animation.mp4` | designer | With `--video`, a recording of a moving model for Canvas Studio. |
| `teacher-guide.html` and `.md` | teacher | Before, during and after class. What to say, what to ask, what to listen for. Presenter keys. The answer key. Every delivery route. |
| `review-sheet.html` and `.md` | expert | Every source and claim, every answer, the constructed content, the accessibility checks, a box to tick for each. |
| `spec.json` | designer | The spec it was built from, to edit and rebuild. |
| `text-version.txt` | student | The whole activity as text. |

### The Canvas ladder, corrected

v1 concluded that static images were the default because JavaScript does not run
on a Canvas page. That was true and incomplete. There are two routes through:

1. **Native.** `<details>` and `<summary>` survive the Canvas sanitiser and are
   already the Emble accordion. That is enough for predict-then-reveal, flip
   cards, check-your-answer lists and a one-level scenario. No hosting, no
   upload beyond the image.
2. **SCORM.** Canvas's SCORM tool runs packages from Storyline and Captivate,
   which are full JavaScript applications, as graded or ungraded assignments.
   The same single-file interactive, wrapped in a manifest, goes in the same way.
3. **Hosted iframe.** Where there is a host, the richest route for ungraded use.
4. **H5P.** When the activity is one of H5P's types and must be marked per question.
5. **Canvas Studio.** For anything that must move but need not respond.

Every learning object ships with (1) and (2), so it works on the first day
whatever the institution has configured.

---

## The pipeline

```
content ─▶ diagnose ─▶ ideate ─▶ propose ─▶ [designer chooses] ─▶ source ─▶ build ─▶ deliver ─▶ teach
```

1. **Diagnose.** Key ideas, the threshold concept, the misconceptions learners
   bring, knowledge or skill, where the prose works against the reader.
2. **Ideate.** Ten moves for finding an angle (compared to what, the
   misconception to pre-empt, the decision the learner will face, the ratio
   nobody computed, and so on), crossed with the eight patterns.
3. **Propose.** A gallery of candidates, each a live sketch, each declaring its
   data provenance, one to three recommended as a before, during and after
   arc, and a record of what was ruled out and why. **Nothing is built.**
4. **Source.** Anything needing data is researched and cited, or handed to the
   teacher. Nothing is filled in from memory.
5. **Build.** Every rendition, from one spec.
6. **Deliver.** Native block and SCORM package by default.
7. **Teach.** Teacher guide and presenter mode.

### Draft and release

A spec with unverified sources, or built from a sketch, is a **draft**. Drafts
build, but carry a visible "draft, not for students" banner, and the review sheet
lists what is outstanding. `--release` refuses to build a draft. The gate exists
because the moment an activity looks finished, people stop checking it.

---

## What does not change

- Accessibility is generated from the same spec as the activity, so it cannot drift.
- Nothing is encoded by colour alone. Every control is keyboard operable. No drag and drop.
- WCAG 2.2 AA contrast and perceptual colour distance are checked at build time.
- Builds are deterministic. Shuffles are seeded from the title, so a rebuild is byte-identical.
- No runtime dependencies.
- Australian English and the house punctuation rules.

# Design decisions, and how to extend the toolkit

Why each visual is drawn the way it is. Read this before changing a renderer or
adding a type, because most of these choices are load-bearing for accessibility
rather than aesthetic.

---

## The rules that are not negotiable

### Nothing is encoded by colour alone

Every coloured element carries a second channel: a number, a label, or a
texture. Bars get patterns. Line series get distinct marker shapes and a label
at the end of the line. Cycle stages and diagram pins get numbers that tie them
to a key. Right and wrong in an interactive get a word and a symbol, not just
green and magenta.

This is WCAG 1.4.1, and it is also just better teaching: a learner reading a
printout, or a projected slide with the colour washed out, gets the same
information.

### The text equivalent is generated from the same spec as the picture

Each renderer exports `render()` and `describe()` side by side in one file. The
description is built from the spec, not from the drawing, and never by hand.

This is the single most important structural decision in the toolkit. Hand
written alt text drifts the moment the data changes, and nobody notices, because
the people who can see the picture never read the alt text. Here, changing the
data changes the description, and the test suite fails if an item is drawn but
missing from the text.

### Contrast and colour distance are checked at build time

`assertPaletteAccessible()` checks every foreground and background pair against
WCAG 2.2 AA. `assertPaletteDistinct()` checks that no two series colours are
perceptually close.

The second one uses CIELAB distance, not contrast ratio. Contrast ratio only
compares lightness, so it would happily call pure red and pure blue identical.
The minimum is a Lab distance of 30, and the shipped palette's closest pair is
about 35.

Editing a colour without running the tests can ship an unreadable chart. The
tests are the guard.

### Bar chart axes include zero

Whenever the data is all non-negative. Not configurable. A truncated axis turns
a two percent change into an apparent doubling, and a learner meeting a chart
inside a course has no reason to distrust it.

### No drag and drop

Anywhere. It excludes keyboard users, switch users, and anyone on a phone with
imprecise touch. There is always a better control: the sequencer uses number
inputs, which are operable by every input method and record a more precise
answer than a dropped tile.

---

## Why each type is laid out as it is

**Timeline runs vertically.** Dates in course content are written, not numeric.
"October 2010" and "Third trimester" cannot be placed proportionally, so a
horizontal axis would imply a precision that is not there. A vertical spine is
honest about showing order, gives every event room for a real explanation, and
survives being read on a phone.

**Process adapts.** Up to five steps reads best as a left to right row, which
looks like a flow at a glance. Beyond that the boxes get too narrow for a real
label, so it stacks. Numbered badges and arrows are what distinguish it from a
timeline: order the learner controls, not dates that already happened.

**Cycle puts detail in a key.** Explanations on the ring crowd it and destroy
the one thing the shape is for, which is seeing that the end feeds the
beginning. Detail goes in a numbered key underneath, which has the useful side
effect that the key alone is a complete text version.

**Gantt keeps one row per task.** Overlap is the thing being taught, so tasks
never share a row. Start and end times are printed on the bar rather than left
to be read off the axis, because the timing is the lesson.

**Comparison puts criteria in rows.** Criteria are usually longer text and items
are usually few, so this puts the long text down the left where it has room.

**Hierarchy grows rightwards.** Labels in course content are phrases, not job
titles. A top-down chart forces them into narrow columns and gets unreadably
wide by the third level. Growing rightwards gives every node a full line and
grows one row per leaf, which is predictable.

**Labelled expects a supplied photograph.** Generating a picture of real
equipment or real anatomy is a liability in a course. What the toolkit
contributes is the fiddly part that is easy to get wrong: pins at exact
coordinates, a key that always matches, and a text equivalent that names each
position in words.

---

## Two bugs worth knowing about

Both produced output that looked plausible and was wrong, which is the worst
kind. Both now have regression tests.

**Chromium truncates tall screenshots.** Headless Chromium paints roughly 95 CSS
pixels less than the window height it is given, but still writes a PNG at the
full window size. Asking for exactly the drawing height silently blanked
everything below about 660 pixels, which is most visuals. The fix is to ask for
a taller window and crop back, in `src/png.js`. Cropping is cheap because PNG
row filters only ever reference the row above, so truncating the decompressed
stream at a row boundary yields a valid shorter image.

**Floating point ate the longest label.** The gantt label gutter is
`longest + padding`, and the budget passed to the truncator is
`gutter - padding`. In floating point that round trip does not always return the
number it started from, so the single longest label failed its own budget by an
epsilon and had an ellipsis put through it. A `Math.ceil` fixes it. The lesson
generalises: never round-trip a measurement through arithmetic and expect
equality.

---

## Adding a visual type

1. **Add a validator** to `validators` in `src/spec.js`, and add the name to `VISUAL_TYPES`. Write the error messages for whoever will read them. Set item caps by what stops teaching, not by what stops rendering.
2. **Write the renderer** in `src/renderers/<type>.js`, exporting two functions.
   - `render(spec, width)` returns `{ body, width, height }`. `body` is SVG fragment markup. Measure text with `measure()` and `textBlock()` from `src/svg.js`, and grow containers to fit rather than clipping.
   - `describe(spec)` returns `{ shape, marks, structure, items, visibleText }`. This is what becomes the alt text and the five-part description. Every item drawn must appear in `items`, and every word drawn must appear in `visibleText`.
3. **Register it** in `src/renderers/index.js`.
4. **Add a fixture** to `FIXTURES` in `test/learnviz.test.js`. The whole static suite runs over every fixture automatically, so a new type immediately inherits the determinism, escaping, balance, audit and text-equivalent checks.
5. **Add a line** to `cmdTypes()` in `bin/learnviz.js` and to `references/spec-reference.md`.

Interactive types follow the same shape in `src/interactive/`, exporting
`build(spec, a11y)` and `describe(spec)`, and registering in
`src/interactive/index.js`. Build the page with `page()` from
`interactive/shell.js` so it inherits the styling, the focus handling, the
height reporting and the text equivalent.

An interactive that animates should expose `window.lvSeek(t)` for `t` from 0 to
1, rendering synchronously. That is what lets it be captured as a deterministic
video.

---

## Determinism

Same spec in, byte-identical SVG out. No timestamps, no random ids, no
unrounded floats: every emitted number goes through `n()`.

This matters because these files get committed, reviewed and diffed by
teachers. A diff that shows only the change you made is reviewable. One that
shows every coordinate shifting by 0.0001 is not.

The test suite pins it for every type.

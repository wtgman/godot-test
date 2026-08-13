# Spec reference

Every visual is built from one JSON object. This is every field of every type.

Run `node bin/learnviz.js validate my-spec.json` to check one. The validator's
messages are written to be acted on, so read them rather than guessing.

---

## Fields every spec has

| Field | Required | Notes |
|---|---|---|
| `type` | yes | One of the twelve below |
| `title` | yes | Up to 120 characters. Becomes the heading and the basis of the alt text |
| `intent` | yes | What the learner can do afterwards. The build refuses to run without it |
| `subtitle` | no | One line under the title. Use it to say what to look for |
| `caption` | no | Sits under the visual. Use it for a caveat or a reading instruction |
| `source` | no | Where the content came from. Reproduce citations exactly, never invent one |

`intent` is not decoration. It is the only test of whether the visual earns its
place, and it is printed on every interactive.

---

## timeline

Dated events in order. Drawn as a vertical spine, because dates in course
content are written rather than numeric, so even spacing is honest about showing
order rather than rate.

| Field | Required | Notes |
|---|---|---|
| `events` | yes | 2 to 14 |
| `events[].date` | yes | Free text. "October 2010", "Third trimester", "Week 4" |
| `events[].label` | yes | The headline. Up to 90 characters |
| `events[].detail` | no | Why it mattered. This is where the teaching is |
| `events[].emphasis` | no | `true` marks a turning point with a larger ringed dot |

```json
{
  "type": "timeline",
  "title": "The rise of Instagram",
  "intent": "Learners can place the platform's pivots in order and explain what pressure each one answered.",
  "events": [
    { "date": "October 2010", "label": "Launch, iPhone only", "detail": "Photo sharing with filters, built for slow mobile connections." },
    { "date": "April 2012", "label": "Acquired by Facebook", "detail": "One billion US dollars for thirteen employees and no revenue.", "emphasis": true }
  ]
}
```

---

## process

Ordered steps with a first and a last. Up to five steps renders as a left to
right row; more stacks vertically, because narrower boxes cannot hold a real
label.

| Field | Required | Notes |
|---|---|---|
| `steps` | yes | 2 to 10 |
| `steps[].label` | yes | The action. Start with a verb |
| `steps[].detail` | no | How to do it, or what people get wrong |

---

## cycle

A loop with no start and no end. Stage names sit on the ring, explanations go in
a numbered key underneath, so the ring stays legible and the key alone is a
complete text version.

| Field | Required | Notes |
|---|---|---|
| `stages` | yes | 3 to 8 |
| `stages[].label` | yes | Short. It has to fit in a node |
| `stages[].detail` | no | Appears in the numbered key |
| `centre` | no | A name for the whole cycle, printed in the middle |

---

## gantt

Tasks on a shared time axis, free to overlap. The workhorse. Use it whenever the
lesson is that two things happen at once.

| Field | Required | Notes |
|---|---|---|
| `timeUnit` | yes | Named on the axis. "minutes from start", "weeks from project start" |
| `tasks` | yes | 2 to 20 |
| `tasks[].label` | yes | |
| `tasks[].start` | yes | Number, zero or greater |
| `tasks[].duration` | yes | Number, greater than zero |
| `tasks[].track` | no | Groups tasks by colour and adds a legend. Omit it and every bar is one colour, which is correct when the grouping means nothing |
| `tasks[].note` | no | Printed under the chart. Why this timing. Fill these in |
| `milestones` | no | Up to 10 |
| `milestones[].at` | yes | Where the dashed line sits |
| `milestones[].label` | yes | |

The axis extends to the next round tick past the data, so a task finishing at
the maximum does not draw against the margin.

---

## comparison

Items scored against shared criteria. Criteria are rows, items are columns,
because criteria are usually the longer text and columns are usually few.

| Field | Required | Notes |
|---|---|---|
| `criteria` | yes | 2 to 8 |
| `items` | yes | 2 to 6 |
| `items[].label` | yes | Column header |
| `items[].values` | yes | One per criterion, in the same order. The validator checks the count |

Values are free text, not scores. "Depends on the page" is a better answer than
a number when that is the truth.

---

## hierarchy

A tree, drawn left to right so long labels get a full line and the diagram grows
one row per leaf.

| Field | Required | Notes |
|---|---|---|
| `root` | yes | A node |
| `root.label` | yes | |
| `root.detail` | no | Small text under the label |
| `root.children` | no | 1 to 8 nodes, each the same shape |

Maximum four levels and 30 nodes in total. Past that it is a document, not a
diagram.

---

## chart

Quantities, as grouped bars or lines.

| Field | Required | Notes |
|---|---|---|
| `mode` | yes | `"bar"` or `"line"` |
| `categories` | yes | 2 to 24. The horizontal axis |
| `series` | yes | 1 to 5 |
| `series[].label` | yes | |
| `series[].values` | yes | One per category. The validator checks the count |
| `xLabel`, `yLabel` | no | Axis titles. Include units |

The vertical axis includes zero whenever the data is all non-negative. This is
not configurable. A truncated axis makes a two percent change look like a
doubling, and a learner meeting a chart inside a course has no reason to suspect
the axis of misleading them.

Series are told apart by colour, by texture, and by direct labelling on line
charts. Never by colour alone.

---

## labelled

A subject with its parts named. The base image is supplied by a teacher, because
a generated picture of real equipment is a liability. What this contributes is
the fiddly part: numbered pins at exact coordinates and a key that always
matches them.

| Field | Required | Notes |
|---|---|---|
| `subject` | yes | What the image shows |
| `parts` | yes | 2 to 12 |
| `parts[].label` | yes | |
| `parts[].detail` | no | Appears in the key |
| `parts[].x`, `parts[].y` | yes | 0 to 100, as a percentage of image width and height. 0,0 is top left |
| `image` | no | A path or data URI. Omit it to get a marked placeholder frame with the pins already positioned |

The text equivalent describes each pin's position in words, so a learner who
cannot see the image still knows the steam wand is upper right.

---

## stat

Big-number callouts. The infographic register, for figures that deserve to land
as figures rather than be buried mid-paragraph.

| Field | Required | Notes |
|---|---|---|
| `stats` | yes | 2 to 6 |
| `stats[].value` | yes | Up to 20 characters. A **string**, so "1 billion", "68%", "1 in 4" and "under 30 seconds" all work |
| `stats[].label` | yes | What the figure counts. Required, and the validator enforces it |
| `stats[].detail` | no | The qualifier that stops the number being misread |

The value is reproduced exactly as written. The toolkit computes nothing and
rounds nothing, so it cannot quietly turn 47.6 into "nearly 50" or invent a
percentage the source never gave.

`label` is required for a reason. A number without its unit and its population
is not a fact, it is decoration. "13" means nothing; "13 employees at the time
of sale" means something.

Tiles lay out in one row up to three, then a grid. The figure is auto-sized to
the widest value so all tiles share one type size.

```json
{
  "type": "stat",
  "title": "The Instagram acquisition, in four numbers",
  "intent": "Learners can state what Facebook actually bought in 2012.",
  "stats": [
    { "value": "$1bn", "label": "Paid by Facebook in April 2012", "detail": "For a company that had never charged anyone anything." },
    { "value": "$0", "label": "Revenue at the time of sale" }
  ]
}
```

---

## waffle

Part to whole, as a grid of countable squares.

| Field | Required | Notes |
|---|---|---|
| `unitLabel` | yes | What one square is. "marks", "students", "minutes". Singularised automatically |
| `total` | yes | Whole number, 1 to 400. The number of squares |
| `categories` | yes | 2 to 6 |
| `categories[].label` | yes | |
| `categories[].value` | yes | Whole number of squares. The validator rejects fractions, because a square cannot be split |
| `categories[].detail` | no | Appears under the category in the key |

**Use this instead of a pie chart.** People read angles badly: asked to compare
a 30 per cent wedge against a 25 per cent wedge, most cannot, and labelling does
not fix it because the quantity is encoded in the channel the eye is worst at.
Squares are counted rather than estimated. It also degrades honestly into text:
"50 of 100 squares" carries the picture's information, "a wedge of roughly half"
does not.

Values may add to less than `total`. The shortfall is drawn as empty outlined
squares and named in the key and the text equivalent as "Not accounted for",
never silently filled. Values may not add to more than `total`, and the
validator says so with the arithmetic.

Blocks are contiguous, filled left to right then down, which is what makes the
proportion readable at a glance.

```json
{
  "type": "waffle",
  "title": "Where the marks come from in this unit",
  "intent": "Learners can say how much each assessment is worth.",
  "unitLabel": "marks",
  "total": 100,
  "categories": [
    { "label": "Practical observation", "value": 50, "detail": "Two observed sessions, 25 marks each." },
    { "label": "Knowledge quiz", "value": 20 }
  ]
}
```

---

## sequencer (interactive)

Predict, check, explain. The learner is asked when each item should happen,
commits to an answer, and only then sees the model timing and the reasoning.

| Field | Required | Notes |
|---|---|---|
| `timeUnit` | yes | |
| `prompt` | yes | The question. State the total time available |
| `items` | yes | 3 to 14 |
| `items[].label` | yes | |
| `items[].at` | yes | The model timing |
| `items[].because` | yes | Why. Shown after checking. **This is the whole activity** |
| `items[].tolerance` | no | How close counts. Defaults to about 5 percent of the span |

`because` is required for a reason. Without it the activity marks answers and
teaches nothing.

Use this over `gantt` whenever getting the timing right is an assessable skill
rather than a fact to know.

---

## simulation (interactive)

A model the learner can push on. Two engines ship.

| Field | Required | Notes |
|---|---|---|
| `model` | yes | `"orbit"` or `"growth"` |
| `parameters` | yes | 1 to 6 sliders |
| `parameters[].key` | yes | Identifier the engine reads. `orbit` reads `mass`; `growth` reads `initial`, `rate` and `periods` |
| `parameters[].label` | yes | Shown by the slider |
| `parameters[].min`, `.max`, `.value` | yes | `value` must sit within the range |
| `parameters[].unit` | no | Singularised automatically at a value of one |
| `bodies` | orbit only | 1 to 6 |
| `bodies[].label` | yes | |
| `bodies[].distance` | yes | Astronomical units |
| `bodies[].radius` | yes | Drawn size in pixels, not to scale |

### orbit

Periods come from Kepler's third law in solar units: period in years equals the
square root of distance in AU cubed, divided by mass in solar masses. Earth at
1 AU around 1 solar mass gives exactly 1 year, and Jupiter at 5.2 AU gives 11.86,
which is the real figure. The physics is checked by the test suite.

Orbit *spacing on screen* uses a square-root scale, because drawn linearly with
Jupiter at the edge, Mercury lands inside the star. The diagram says so on its
face and the text equivalent repeats it. The distances in the table are real.

### growth

Compounding: value equals initial times one plus rate, raised to the number of
periods. The readout marks the doubling point.

---

## Things the validator will not let you do

These are all pedagogical limits, not technical ones.

- More than 14 timeline events, 10 process steps, 8 cycle stages, 20 gantt tasks, 30 hierarchy nodes
- A hierarchy more than four levels deep
- A comparison where an item has the wrong number of values
- A chart series whose length does not match the categories
- A gantt task with zero or negative duration
- A stat tile with no label, or waffle parts that add to more than the whole
- A fractional waffle count, because a square cannot be split
- A pin coordinate outside 0 to 100
- Any spec with no `intent`

If you are hitting a cap, the answer is two visuals, not a bigger one.

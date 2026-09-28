# Spec reference

Everything is built from JSON. There are three kinds of spec:

- a **learning object** (`"kind": "learning-object"`), an activity built from one of eight patterns
- a **proposal** (`"kind": "proposal"`), the menu that comes before building
- a **figure** (no `kind`, a `type` instead), a static diagram or chart, used on its own or inside a learning object

Check any of them with `node bin/learnviz.js validate spec.json`. The messages
name the field and say what to do, so read them rather than guessing. Every
example under `examples/` validates and builds, and is the quickest way to see a
field in use.

---

# Part 1: Learning objects

## Fields every learning object has

| Field | Required | Notes |
|---|---|---|
| `kind` | yes | `"learning-object"` |
| `pattern` | yes | `predict`, `stepthrough`, `sort`, `order`, `scenario`, `estimate`, `explore` or `cards` |
| `title` | yes | Up to 120 characters. The heading on the page |
| `intent` | yes | Up to 300. What the learner can do afterwards, for the teacher: "Learners can..." |
| `goal` | no | Up to 300. The learner-facing version, shown as "After this, you can ...". Write it without "they" or "their". Without it, the page uses the intent |
| `lede` | no | Up to 400. The paragraph under the heading that sets the task up |
| `placement` | no | `before`, `during`, `after` or `any`. Where it goes in the week. Defaults to the pattern's usual place |
| `passMark` | no | A proportion, 0 to 1, for scored patterns. `0.7` means 70 per cent. Goes into the SCORM manifest and turns completion into passed or failed |
| `status` | no | `draft` or `release`. A draft always carries the draft banner |
| `sketch` | no | `true` when any content is placeholder. Makes it a draft |
| `teach` | no | Notes for the teacher guide. See below |
| `sources` | no | Up to 16. Where every fact came from. See below |

A learning object is a draft, with a banner on the page, if it is a sketch, if
its status is `draft`, or if any source is still `to-check`. `build --release`
refuses drafts.

### teach

All optional. Anything missing falls back to the pattern's own advice.

| Field | Notes |
|---|---|
| `before`, `during`, `after` | Up to 600 each. How to use it at that point in the week |
| `watchFor` | Up to 600. What to listen for in the room |
| `ask` | 1 to 5 questions to put to the room, up to 240 each |
| `say` | 1 to 30 lines of script, up to 400 each. The step-through pattern writes one from its steps if this is empty |

### sources

| Field | Required | Notes |
|---|---|---|
| `label` | yes | Up to 240. Author, title, publisher and year, exactly as the source gives them |
| `kind` | yes | `supplied` (the course material), `research` (found for this), `teacher`, `constructed` (written for the activity) or `general` (standard knowledge in the field) |
| `status` | yes | `to-check` or `verified`. Only a person who has opened the source sets `verified` |
| `url` | no | Must start with `http://` or `https://` |
| `note` | no | Up to 400. What to check, and any doubt about it |

See `sources-and-review.md` for how these are used.

---

## predict

| Field | Required | Notes |
|---|---|---|
| `question` | yes | Up to 300 |
| `response.kind` | yes | `choice`, `number` or `order` |
| `reveal.explanation` | yes | Up to 900. The teaching. Shown after the learner commits |
| `reveal.heading` | no | Up to 140 |
| `reveal.points` | no | 1 to 6, up to 240 each |
| `reveal.figure` | no | A figure spec, shown in the reveal |

For `"kind": "choice"`: `options` (2 to 6, each `{ "label", "feedback" }`) and
`answer`, the index of the right option, or `null` when there is no single right
answer. For `"kind": "number"`: `min`, `max`, `answer`, and optionally `step`,
`tolerance`, `decimals`, `unit` and `prefix`. The answer may sit outside the
slider on purpose. For `"kind": "order"`: `items` (3 to 7) and `fixedOrder`,
required: `true` when the items are listed in the right order, `false` when
there is no right order.

```json
{
  "kind": "learning-object", "pattern": "predict",
  "title": "What was Instagram earning?",
  "intent": "Learners can explain what Facebook was paying for when it bought Instagram.",
  "question": "About how much revenue was Instagram making a year when Facebook agreed to buy it?",
  "response": { "kind": "choice", "answer": 0, "options": [
    { "label": "Nothing", "feedback": "Right. It had no revenue at all." },
    { "label": "About US$10 million a year", "feedback": "A reasonable guess for a popular app, but it had no revenue." }
  ] },
  "reveal": { "heading": "No revenue at all", "explanation": "Facebook was paying for users and growth, not income." }
}
```

## estimate

| Field | Required | Notes |
|---|---|---|
| `question` | yes | Up to 300 |
| `unit` | yes | Up to 40, in words: "billion US dollars, announced". Screen readers hear it |
| `prefix`, `suffix` | no | Short symbols around each value, such as `US$` and `bn` |
| `decimals` | no | Fixed decimals. Otherwise up to 2 below ten and 1 above, without trailing zeros |
| `max` | no | The scale's top. Rounded up to a clean gridline either way |
| `bars` | yes | 2 to 8, each `{ "label", "value", "hidden", "note" }`. At least one hidden and one visible. Values are zero or more |
| `reveal.explanation` | yes | Up to 900, with optional `heading` and `points` as for predict |

## stepthrough

| Field | Required | Notes |
|---|---|---|
| `figure` | yes | A figure spec. Its parts appear one at a time |
| `steps` | yes | 1 to 30, each `{ "say" }`, up to 600 |
| `steps[].show` | no | How many parts are visible after this step. Give it on every step or none. It only goes up, and the last step shows every part |
| `intro` | no | Up to 500. A step before the first part appears |

Without `show`, write one step per part. The parts are the figure's events,
steps, stages, tasks, items, rows, bars or series, in drawing order. The
validator names them if the count is wrong.

## sort

| Field | Required | Notes |
|---|---|---|
| `prompt` | yes | Up to 300 |
| `categories` | yes | 2 to 6, each `{ "key", "label", "hint" }`. The hint, up to 220, is shown as a legend and used for the first-miss nudge |
| `items` | yes | 3 to 16, each `{ "text", "category", "why" }`. `category` is a key. `why`, up to 420, is the teaching |

## order

| Field | Required | Notes |
|---|---|---|
| `prompt` | yes | Up to 300 |
| `mode` | no | `order` (the default) or `timing` |
| `items` | yes | 3 to 12, each `{ "label", "why" }`, listed in the right order |
| `timeUnit` | timing | Up to 40, such as "minutes from the start" |
| `items[].at` | timing | The model time |
| `items[].duration` | no | When every item has one, timing mode draws bars and the figure is a gantt |
| `items[].tolerance` | no | How close counts. Defaults to 5 per cent of the latest time, at least 1 |
| `deadline` | no | Timing only. `{ "at", "label" }`, such as `{ "at": 105, "label": "Dinner is served" }`, drawn as a line |

## scenario

| Field | Required | Notes |
|---|---|---|
| `setting` | yes | Up to 700. The situation, in the second person |
| `character` | no | `{ "name", "role" }`, the person the learner speaks with |
| `start` | yes | The id of the first node |
| `nodes` | yes | 2 to 16 |
| `nodes[].id`, `.say` | yes | `say` up to 600 is what happens or is said |
| `nodes[].speaker` | no | Defaults to the character |
| `nodes[].choices` | or `outcome` | 2 to 4, each `{ "label", "quality", "feedback", "next" }`. `quality` is `best`, `ok` or `poor`. Without `next`, the choice ends the scenario |
| `nodes[].outcome` | or `choices` | Up to 700. Makes the node an ending |

The validator checks that every node can be reached, every path can finish,
every `next` exists and every decision has a `best` choice.

## explore

| Field | Required | Notes |
|---|---|---|
| `engine` | yes | `formula`, `orbit` or `growth` |
| `parameters` | yes | 1 to 6 sliders, each `{ "key", "label", "min", "max", "value" }`, with optional `step`, `decimals`, `unit`, `prefix`. Keys are plain names: letters, digits, underscores |
| `outputs` | formula | 1 to 6, each `{ "key", "label", "expr" }`, with optional `explain`, `unit`, `prefix`, `decimals` |
| `plot` | no | Formula only. `{ "x": parameter key, "y": output key }` |
| `bodies` | orbit | 1 to 6, each `{ "label", "distance" }` in astronomical units, optional `radius` in pixels. Needs a `mass` parameter in solar masses |
| `challenges` | no | Up to 6, met in order |

The **orbit** engine uses Kepler's third law in solar units: period in years is
the square root of distance cubed over mass. Earth at 1 AU and one solar mass
takes one year, Jupiter at 5.2 AU about 11.86. Orbits are drawn on a
square-root scale so inner planets stay visible, and the picture says so.
The **growth** engine needs parameters `initial`, `rate` (per cent per period)
and `periods`, and provides outputs `final` and `doubling`.

**Formulas** may use `+ - * / ^`, brackets, `pi`, `e`, and `sqrt abs min max
floor ceil exp pow ln log sin cos tan round`. They may refer to parameters and
to other outputs, in any order, but not in a loop. They are parsed and
evaluated directly, never with `eval`.

**Challenges.** Each is `{ "prompt", "key", "success" }` plus either `target`
(with `tolerance`, default 1 per cent of the target) or `min` and/or `max`, and
an optional `hint`. `key` is any parameter or output, or for the orbit engine
`period_<Label>`, such as `period_Earth`. `given` lists slider settings the
challenge depends on, such as `{ "cost": 11, "target": 30 }`, each met to within
half a step. The validator tries every combination of slider positions, when
there are fewer than 250,000, and refuses a challenge nobody can meet.

## cards

| Field | Required | Notes |
|---|---|---|
| `cards` | yes | 3 to 30, each `{ "front", "back" }`, up to 240 and 600 |
| `prompt` | no | Up to 240 |
| `frontLabel`, `backLabel` | no | Up to 40. Default "Recall" and "Answer" |

---

# Part 2: Proposals

| Field | Required | Notes |
|---|---|---|
| `kind` | yes | `"proposal"` |
| `topic` | yes | Up to 160 |
| `sourceSummary` | yes | Up to 900. What the content is and where it came from |
| `audience` | no | Up to 200 |
| `analysis.keyIdeas` | yes | 1 to 6, up to 240 each |
| `analysis.threshold` | no | Up to 400. The idea that unlocks the rest |
| `analysis.knowledge`, `analysis.skill` | no | Up to 300. What learners need to know, and to be able to do |
| `analysis.misconceptions` | no | Up to 5, each `{ "belief", "reality" }` |
| `questions` | no | Up to 6, each `{ "ask", "why", "options" }`, options 2 to 5 |
| `candidates` | yes | 2 to 8. See below |
| `rejected` | no | Up to 8, each `{ "name", "because" }` |

Each candidate:

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Up to 120 |
| `pattern` | yes | One of the eight |
| `placement` | yes | `before`, `during`, `after` or `any` |
| `angle` | yes | Up to 500. What the learner does, and what makes it work |
| `payoff` | yes | Up to 300. What the learner can do afterwards |
| `addresses` | no | Up to 240. Which key idea or misconception it works on |
| `effort` | yes | `low`, `medium` or `high` |
| `recommended` | no | One to three candidates in the proposal |
| `data.status` | yes | `none-needed`, `in-source`, `needs-teacher`, `needs-research` or `unavailable` |
| `data.needs` | when blocking | What exactly is missing |
| `sketch` or `sketchFile` | no | A learning-object spec of the same pattern, inline or as a path relative to the proposal. Must build as a draft |

---

# Part 3: Figures

## Fields every figure has

| Field | Required | Notes |
|---|---|---|
| `type` | yes | One of the ten below |
| `title` | yes | Up to 120 characters. Becomes the heading and the basis of the alt text. Inside a learning object it defaults to the activity's title |
| `intent` | yes | What the learner can do afterwards. Inside a learning object it defaults to the activity's intent |
| `subtitle` | no | One line under the title. Use it to say what to look for |
| `caption` | no | Sits under the visual. Use it for a caveat or a reading instruction |
| `source` | no | Where the content came from. Reproduce citations exactly, never invent one |


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
right row. More stacks vertically, because narrower boxes cannot hold a real
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
is not a fact, it is decoration. "13" means nothing. "13 employees at the time
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

## Things the validator will not let you do

These are all pedagogical limits, not technical ones.

For learning objects:

- A sort item whose category is not a category key, or fewer than 3 items
- A predict order that does not say whether a right order exists
- A scenario node that cannot be reached, a path that cannot finish, or a decision with no strong choice
- An explore challenge that no slider setting can meet, or a formula that loops or divides by zero at the start
- A step-through whose last step does not show the whole figure
- An estimate with nothing hidden, or nothing visible to guess against
- A proposal with no analysis, no recommendation, more than three, or a sketch that would build as finished

For figures:


- More than 14 timeline events, 10 process steps, 8 cycle stages, 20 gantt tasks, 30 hierarchy nodes
- A hierarchy more than four levels deep
- A comparison where an item has the wrong number of values
- A chart series whose length does not match the categories
- A gantt task with zero or negative duration
- A stat tile with no label, or waffle parts that add to more than the whole
- A fractional waffle count, because a square cannot be split
- A pin coordinate outside 0 to 100
- Any figure with no `intent`

If you are hitting a cap, the answer is two visuals, not a bigger one.

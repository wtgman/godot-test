# The eight patterns

Each pattern is a thing a learner does. This file says, for each one, what the
learner does, why it works, how a teacher uses it at the front of a room, what
Canvas receives, and the traps. Field-by-field specs are in
`spec-reference.md`, and every pattern has a working example under `examples/`.

Three things are true of all eight:

- **Commit, then explain.** The learner answers, orders, sorts, guesses or
  chooses before anything is explained. The explanation lands because it answers
  a question the learner now has.
- **Feedback says why.** Right or wrong is never the whole message. The reason is
  the teaching, and it is written in the spec, not generated.
- **Failing is safe.** Every activity can be retried, the score kept is the best
  attempt, and nothing a learner does is shown to anyone else.

## Choosing

| The learner needs to... | Pattern | Scored | Best placed |
|---|---|---|---|
| Confront something they already believe | `predict` | No | Before |
| Get a feel for how big something is | `estimate` | No | Before |
| Follow an explanation built one piece at a time | `stepthrough` | No | During |
| Tell similar things apart | `sort` | Yes | After |
| Get a sequence, or the timing of overlapping steps, right | `order` | Yes | After |
| Make judgements in a conversation or situation | `scenario` | Yes | During |
| See how a relationship behaves when they push on it | `explore` | With challenges | During |
| Make facts, terms or phrases automatic | `cards` | No | After |

"Scored" means the SCORM package sends a score to the Canvas gradebook, and a
`passMark` turns completion into passed or failed. Unscored patterns send
completion only. Placement is a default the spec can override with `placement`.

---

## predict: Predict, then check

**The learner** answers a question before being told: picks an option, sets a
number on a slider, or puts items in order. They lock it in, and the reveal
explains the answer beside theirs, optionally with a figure.

**Why it works.** Attempting an answer first, even a wrong one, makes the
explanation that follows more memorable than reading it cold (the pretesting
effect). And a learner who has just used a mistaken belief, and seen it fail,
is far more likely to let it go than one who is simply told it is wrong.

**In class.** Presenter view. Read the question, have the room commit with a
show of hands or on paper, press **R** to reveal, then ask two or three people
why they chose what they chose before explaining.

**In Canvas.** Completion when the answer is revealed. Never scored: a guess is
not a test.

**Use it when** there is a misconception to surface, a number people get badly
wrong, or an order people think they know.

**Traps.** A question with an obvious answer teaches nothing. An order response
must say `fixedOrder`: `true` when the items are listed in the right order,
`false` when there is no right order at all. The grief example uses `false`,
and "there is no order" is the lesson.

---

## estimate: Estimate, then compare

**The learner** sees a bar chart with some bars shown and some hidden, drags each
hidden bar to their guess (or uses the arrow keys), then reveals. The real bars
grow in, a marker stays where they guessed, and each gap is described: close,
a percentage off, or several times too high or too low.

**Why it works.** People carry intuitions about scale that reading a figure does
not correct. Guessing against visible reference values, then seeing the gap, is
what turns "one billion dollars" from a number into a size. The format was
popularised by the New York Times as "You Draw It".

**In class.** Ask the room for guesses for each hidden bar, write two or three on
the board, then press **R**. Ask whoever was furthest out what they assumed. That
assumption is the lesson.

**In Canvas.** Completion on reveal. Never scored.

**Use it when** a quantity only means something beside other quantities: a
price, a population, a proportion, a time.

**Traps.** Show enough reference bars to guess against, and hide the one or two
that matter. Bars start at zero, always. Values need sources like any other
figure. Use `suffix` for short units ("bn") so bars read "US$1.65bn".

---

## stepthrough: Step by step

**The learner** moves through a figure that builds one part at a time, with a
sentence for each part. Back, next, jump to any step, or show it all.

**Why it works.** A complex diagram shown whole leaves a novice not knowing
where to look. Showing one part at a time, with its sentence beside it, does
that work for them (the segmenting principle), and the learner controls the
pace.

**In class.** This is the teacher's pattern. Presenter view, **→** for each step.
Put each step in your own words rather than reading it, and pause on each new
part to ask what the room notices. It replaces a slide deck of the same diagram
built up by hand.

**In Canvas.** Completion at the last step. Never scored.

**Use it when** there is a figure worth explaining: a timeline, a process, a
schedule, a comparison, a hierarchy.

**Traps.** One step per part of the figure by default. To reveal several parts
at once, give every step a `show` count, which only ever goes up and ends at
the whole figure. An optional `intro` step comes before the first part.

---

## sort: Sort it

**The learner** reads real examples, such as things a client says, and puts each
in a category. On checking, the right ones explain why. A first miss gets a
nudge ("Denial means not accepting the information itself. Is that what this
shows?"), and only a second miss shows the answer and the cue to look for.

**Why it works.** Categories are learned from contrasting examples, not from
definitions. Seeing several cases side by side, each with its reason, teaches
which features matter. The nudge before the answer keeps the retry a real act
of thinking rather than copying.

**In class.** Presenter view. **→** highlights each example in turn. Read it out,
take a vote, press **R** to show the answer and the reason. The disagreements
are where the teaching is.

**In Canvas.** Scored: the share sorted correctly, best attempt kept.

**Use it when** learners must recognise which case they are in: a response, a
risk level, a type of error, a legal category.

**Traps.** Use real-sounding examples, not definitions reworded. Include at
least one that sounds like a different category, because the near miss teaches
most. Constructed examples need a practitioner to confirm they ring true.

---

## order: Put it in order

**The learner** either puts shuffled steps in order with up and down buttons
(`"mode": "order"`), or types when each step should start (`"mode": "timing"`).
In timing mode, each step with a `duration` is drawn as a bar against an
optional `deadline`, and the chart redraws as they type, so a plan that
finishes late is visible before checking.

**Why it works.** Producing a procedure is more durable than recognising one,
and each misplaced step exposes a dependency the reason can explain. Timing is
the harder skill, and drawing the plan makes the overlaps visible.

**In class.** Show the shuffled steps, ask the room for the first one and why,
then press **R** for the model answer.

**In Canvas.** Scored: steps in the right place, or timings within tolerance.
**Showing the model never earns a score**, and after it has been shown, later
checks give feedback but no longer raise the score.

**Use it when** a procedure has a right order for a reason, or when timing is
the skill (cooking, scheduling, dosing, a project plan).

**Traps.** Every item needs a `why`: an order with no reasons is a memory test.
Only use order mode when there really is one right order.

---

## scenario: Scenario

**The learner** is in a situation with a named person, reads what they say, and
chooses a reply. Each choice is marked strong, workable or weak, with coaching
on why, and leads somewhere different. At the end they see how it went and the
path they took.

**Why it works.** Judgement is learned by practising it in context. A scenario
makes the wrong call cost nothing and teach the most, and it is the closest a
course page gets to the moment the learner will actually face.

**In class.** Put it on the projector and let the room vote at each point. Take
the weak option on purpose once, to show where it leads.

**In Canvas.** Scored: the average quality of the choices made.

**Use it when** the skill is a conversation or a decision under uncertainty:
de-escalation, a difficult disclosure, a client with conflicting needs.

**Traps.** The validator checks the graph: every node reachable, every path able
to finish, every decision with at least one strong option. Keep it short.
Three decisions is plenty. Written scenarios are `constructed` content and need
a practitioner's check for realism.

---

## explore: Explore the model

**The learner** moves sliders and watches the outputs, a chart or an animation
respond. Challenges turn the sandbox into tasks ("make Earth's year last two
years"), met one at a time, with hints.

Three engines:

- **formula**: outputs computed from the sliders by formulas you write, such as
  `cost / (target / 100)`, with an optional plot of one output against one input.
  The formula language is arithmetic, powers and common functions only, and is
  evaluated without `eval`.
- **orbit**: planets around a star whose mass is a slider, using Kepler's third
  law. Build with `--video` to record it for Canvas Studio.
- **growth**: compounding from an initial value, a rate and a number of periods.

**Why it works.** Changing an input and watching the result makes a relationship
felt rather than stated. Free play alone is weak, which is why challenges
exist: a target makes the learner form and test a hypothesis.

**In class.** On the projector, ask for a prediction before each slider move
("what happens to every orbit if the star is heavier?"), then move it.

**In Canvas.** With challenges, scored as the share met. Without, completion
once the learner has moved a slider.

**Use it when** the content contains a relationship: a formula, a rate, a
trade-off.

**Traps.** The validator tries every slider position and refuses a challenge
nobody can meet. When a challenge depends on particular settings ("at $11 and 30
per cent, what is the price?"), put them in `given`, or the learner can meet it
with any settings that happen to give the same answer.

---

## cards: Recall practice

**The learner** reads the front of a card, recalls the answer, turns it, and says
whether they had it. Cards marked "not yet" come back a few cards later, until
every card is secure.

**Why it works.** Pulling an answer out of memory strengthens it far more than
reading it again (the testing effect), and meeting the misses again after a gap,
rather than immediately, spaces the practice.

**In class.** Read a card, give the room a few seconds of silence, then press
**Space** to turn it. A quick opener for what stuck from last time.

**In Canvas.** Completion when every card is secure. Never scored: it is
self-rated.

**Use it when** something has to become automatic: terms, rules, what to say
instead of what not to say.

**Traps.** One idea per card. Encourage learners to come back on a later day, as
spacing across days is where most of the benefit is.

---

## Adding a pattern

A pattern is one module in `tools/src/lo/patterns/` exporting `meta`,
`validate`, `describe`, `figure`, `interactive`, `native`, `teach` and
`answerKey`. Register it in `tools/src/lo/index.js`. The browser client is a
real function inlined with `toString()`, written in ES5 so it runs anywhere,
and it reports through `window.LV` (`report`, `announce`, `presenter`). Add an
example under `examples/`, and the unit and browser suites pick it up.

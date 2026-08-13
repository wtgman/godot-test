# Finding the angles

How to get from a piece of content to a menu worth choosing from.

This is the part of the job that is actually hard. Turning a decided idea into a
visual is mechanical, and the toolkit does it. Deciding *which* visual, out of
the ones nobody has thought of yet, is the work.

---

## Why the first idea is usually the wrong one

The visual that comes to mind first is almost always the one the prose already
states. Content lists five stages, so you draw five boxes. Content mentions a
price, so you write the price larger.

That visual adds nothing. The learner already read the sentence. It costs load
time, it costs a screen reader user a detour, and it teaches them that the
graphics in this course can be skipped.

The visuals worth building are the ones that make a relationship visible that
the prose left implicit. So the question is never "how do I illustrate this
paragraph". It is **"what is true about this content that you cannot see from
reading it?"**

---

## Ten moves for finding an angle

Run these against any content. Most will produce nothing; two or three will
produce something the teacher had not considered, which is the entire point of
proposing rather than building.

### 1. Compared to what

A number alone means nothing. Find what it should sit beside.

> One billion dollars for Instagram. Compared to what? YouTube went for less six
> years earlier. WhatsApp went for nineteen times more two years later.

→ `chart` or `stat`. This is the highest-yield move and the most neglected.

### 2. The rate hiding in the sequence

A timeline carries dates. The *gaps* between them carry a story nobody wrote
down.

> Launch to billion-dollar acquisition: eighteen months.

→ `stat`

### 3. The ratio nobody computed

Two figures in the source imply a third that is more striking than either.

> One billion dollars, thirteen employees. That is about seventy-seven million
> per person.

Only if the ratio means something. Dividing two unrelated numbers produces a
figure that looks like a fact and is not.

→ `stat`

### 4. The misconception to pre-empt

What do learners arrive already believing that is wrong? This is often the
single most valuable visual on a page, and it never appears in the source
content, because the source is written by someone who does not hold the
misconception.

> Everyone arrives believing grief runs denial to acceptance in order. The
> content does not say that. Correcting it is the lesson.

→ `timeline` of how the error spread, or `comparison` of the claim against the
evidence.

### 5. The decision the learner will actually face

Content describes. Practice decides. Find the moment where the learner has to
choose, and build that instead of the description.

> Not "the five responses are X". Instead: a client says this, what do you say
> back?

→ `comparison` or `sequencer`

### 6. The invisible whole

Where does all of something go? Time, marks, budget, effort, a shift.

> A hundred marks in this unit. Where do they come from?

→ `waffle`

### 7. What had to be true first

Dependencies that the prose lists in narrative order rather than causal order.

> The permit takes six weeks and nothing on site can start without it. Every
> other task is arranged around that fact.

→ `gantt` or `hierarchy`

### 8. The counterfactual

What if the number were different? If the content contains a relationship rather
than a fact, the learner should be able to push on it.

> What happens to every orbit if the star is three times heavier?

→ `simulation`

### 9. What an expert notices that a novice does not

Expertise is largely perceptual. Make the noticing explicit.

> A practitioner glances at a machine and sees six things. A student sees a
> machine.

→ `labelled`

### 10. The thing that is easy to get wrong in the right order

If sequence is a skill rather than a fact, make them commit to an order and then
show them the model.

> When does each dish go on so everything arrives hot at once?

→ `sequencer`

---

## Questions worth asking

Ask at most five or six. More is an interview, and it will not get answered.
Only ask what would **change what you build**. If both answers lead to the same
visual, do not ask.

The six that most often change the build:

1. **Purpose.** Is this for recognising, recalling, applying, deciding, or
   critiquing? Recognise and recall take a static visual. Apply and decide take
   an interactive or a scenario.
2. **The one thing.** If a learner remembers one thing from this page in a year,
   what should it be? The answer is often not what the content emphasises.
3. **The prior belief.** What do learners arrive believing that is wrong? Feeds
   move 4 directly.
4. **Data.** Do you have the figures, or do they need sourcing, or do they not
   exist? See the next section. Ask early, because it decides which candidates
   are even possible.
5. **Assessment.** Is this assessed? If yes, H5P is the only embed route that
   reaches the gradebook, which constrains the build.
6. **Placement.** Before class, in class, or after? A before-class page frames
   and does not teach. A class page carries the full treatment.

Give options where the answer is a choice between named alternatives. A question
with three options gets answered; an open question gets skipped.

---

## Data provenance, and why it is a required field

Every candidate declares where its content comes from before anyone commits to
building it. The validator enforces it. Five statuses:

| Status | Means | Blocking |
|---|---|---|
| `none-needed` | Structural. Everything is in the source already | No |
| `in-source` | Every figure comes from the supplied content and can be checked against it | No |
| `needs-teacher` | The shape is right, the numbers must come from the unit guide, the cohort or the workplace | Yes |
| `needs-research` | The figures are public but must be found, cited and verified | Yes |
| `unavailable` | Proposed, then ruled out because the data does not exist or cannot be separated | Yes |

The status that matters most is the last one, because it is the one that saves
someone from publishing a fabrication.

> "Show Instagram's profit over time" is a reasonable-sounding request. Meta has
> never reported Instagram's profit separately; it reports segments, not
> individual apps. Every figure available online is a third-party model of
> revenue with an assumed margin applied. Charting that as profit presents a
> guess as a disclosure.

The right response is not to refuse the idea. It is to say what does not exist,
then offer the honest version: estimated revenue, attributed to the firm that
estimated it, labelled as an estimate on the face of the chart. That is a better
teaching object than the original request, because reading the difference
between a reported figure and a modelled one is itself a skill.

**Never soften a `needs-research` into an `in-source` by filling the gap from
memory.** A figure recalled rather than sourced is a fabrication with a
confident tone.

---

## Recommending

The validator allows one or two recommendations and rejects a proposal that
recommends everything or nothing.

Recommending nothing pushes the decision back onto the teacher, which is the
work they asked you to do. Recommending five of five is the same thing wearing a
disguise.

Pick on this order:

1. **What corrects a misconception** beats what adds information.
2. **What a learner will use** beats what a learner will admire.
3. **What can be built honestly today** beats what needs data nobody has.
4. **What the page does not already say in prose** beats a restatement.

Say why in one sentence. "This is the one they will remember" is a better reason
than "this is the most comprehensive".

---

## Recording what you ruled out

The `rejected` list is not padding. On well-known content it is often the most
useful part of the brief, because it stops the obvious-but-wrong visual being
proposed again next term by someone else.

Give the reason in terms of what it would teach, not in terms of taste:

> **The five stages as a numbered process flow.** Five numbered boxes with
> arrows asserts a fixed order, which is exactly the claim Kübler-Ross denied. A
> diagram states it more persuasively than prose, so building this would
> actively teach the misconception.

Three things belong here almost every time:

- The visual the content most obviously suggests, if it is wrong.
- Anything whose data turned out not to exist.
- Anything that would need more than about eight items, because that is where a
  visual stops teaching and starts listing.

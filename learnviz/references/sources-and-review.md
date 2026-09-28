# Sources, drafts and release

Nothing this toolkit or a language model produces is true on its own say-so. An
activity that states a figure, a date or a claim to learners has to be able to
say where it came from, and a person has to have checked it. This file is how
that is recorded and enforced.

---

## Every claim gets a source entry

Each learning object has a `sources` list. Add an entry for anything a learner
could reasonably ask "says who?" about: a figure, a date, a quotation, a
description of a model, a procedure.

```json
"sources": [
  {
    "label": "Facebook newsroom, Facebook to acquire Instagram (2012)",
    "url": "https://about.fb.com/news/2012/04/facebook-to-acquire-instagram/",
    "kind": "research",
    "status": "to-check",
    "note": "Source for the announced price of about US$1 billion."
  }
]
```

Write `label` as the source gives it: author, title, publisher, year. Never
reconstruct a citation from memory. If you cannot find the source, you do not
have one, and the claim either comes out or waits for the teacher.

### Kinds

| Kind | Means | What checking involves |
|---|---|---|
| `supplied` | From the course material you were given | That it was carried across accurately |
| `research` | Found for this activity | Opening the original and confirming it says this |
| `teacher` | Given by the teacher | Nothing more, beyond confirming it was theirs |
| `constructed` | Written for the activity: a scenario, example sentences, a case | That it rings true to someone who does this work |
| `general` | Standard knowledge in the field, such as a model named in every textbook | That the wording matches the unit's prescribed reading |

`constructed` matters. A scenario is not a fact, so it cannot be checked for
accuracy, but it can be unrealistic, stereotyped or out of step with how the
service actually works. The review sheet asks a practitioner about it
separately.

### Statuses

Two, deliberately: `to-check` and `verified`.

Everything starts `to-check`. **Only a person who has opened the source sets
`verified`.** That includes you: a source you found in a search result and did
not open is `to-check`, however confident the snippet looked. A figure you
remember is not a source at all.

---

## Research notes

When a topic needs figures found, keep a `research.md` beside the specs, as
`examples/instagram/research.md` does. For each figure:

- the value, exactly as found
- where it was found, with the address
- what it is a figure of (announced or at close, registered or active users)
- a confidence: high when it comes from a filing or the organisation itself,
  medium when it is reported by a reputable outlet, low when it is one source
  repeating another
- anything that does not exist, said plainly

The last point is often the most useful. "Meta reports two segments, not
individual apps, so there is no Instagram profit figure" saved the Instagram
examples from charting a guess.

---

## Drafts

A learning object is a **draft** when any of these is true:

- it is `"sketch": true`, because some of its content is placeholder
- its `status` is `draft`
- any source is still `to-check`

A draft builds normally, with two differences: a yellow banner across the top of
the page saying what is outstanding ("8 sources still to check. Not for students
until a subject expert has checked it."), and the build prints `DRAFT`. It can
be shared, reviewed, tried in class by the teacher and uploaded to a sandbox
course. It should not reach students.

Every sketch in a proposal must be a draft, and the validator enforces it, so a
preview can never be mistaken for a finished activity.

---

## The review sheet

Every build writes `review-sheet.html` (and `.md`) for a subject expert. It is
the whole review on one page:

1. **Does it do what it is for?** The intent, the activity, and three boxes:
   it moves learners toward the intent, the language suits them, and nothing in
   it would surprise or upset a learner without warning.
2. **Sources.** Every source with its kind, status and note, and a box to tick.
   Constructed content is listed again, for a practitioner.
3. **Answers.** Every prompt, its answer and its reason, with a box to tick.
   A wrong answer key is the most damaging error an activity can have.
4. **Accessibility.** What the automated checks found, two manual checks
   (keyboard only, and the text version standing on its own), and the text
   version itself.
5. **Releasing it**, and a line for the reviewer's name and the date.

---

## Release

When the review is done:

1. Set each source's `status` to `verified`.
2. Set `"status": "release"`.
3. Build with `--release`.

```
node bin/learnviz.js build ../examples/grief/*.json --out build --release
```

`--release` refuses anything still in draft and says why, so a release build can
only contain checked activities. The banner is gone from the released page.

If a checked source turns out to be wrong later, set it back to `to-check`,
fix the content, and review again. The status is a record of what a person has
done, so it should never be changed to make a build pass.

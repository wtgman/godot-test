# A whole course, page by page

For when someone hands over a Canvas course export rather than a single piece
of content. The designer works through the course one page at a time, choosing
an activity for each page or none, and everything chosen is built in one go and
written back into the course.

The same principles as a single proposal apply to every page. What changes is
that the pages are read as a course: an activity on page 3 changes what page 9
needs.

---

## 1. Get the export

In Canvas: **Settings**, then **Export Course Content**, then **Course**. When
it finishes, download the `.imscc` file. Ask for a fresh export just before
building, because re-importing overwrites pages edited since the export (see
step 7).

## 2. Import it

```
cd learnviz/tools
node bin/learnviz.js course import ~/Downloads/my-course.imscc --out ~/courses/my-course
```

This writes a workspace:

| Path | What it is |
|---|---|
| `course.json` | The outline: modules, items, pages, and what each page holds |
| `outline.md` | The same, to read first |
| `pages/NN-slug.md` | Each page as clean text, in course order, with its headings and a note of every image and embed |
| `proposals/` | Where the options for each page go. Empty to start |
| `specs/` | Where finished specs go once options are chosen |
| `source.imscc` | A copy of the export, which the build writes back from |

## 3. Read the course before any page

Read `outline.md`, then every page in order, before proposing anything for any
of them. Note:

- **The arc.** What the course builds towards, and where each idea is first
  introduced. An activity belongs where the idea is taught, not everywhere it
  is mentioned.
- **The assessments.** What learners will be assessed on, from the assessment
  pages and assignment titles. Activities that rehearse assessed skills earn
  their place first.
- **What already exists.** Pages that already have an H5P activity, a video or
  a quiz may not need another.
- **Misconceptions that recur.** Address each once, where it first matters.

## 4. Write one file per page

For every page, write `proposals/<slug>.json`. The slug is in each page file.

**A page that needs no activity** gets a skip, with a reason the designer can
agree or disagree with in a sentence:

```json
{ "kind": "skip", "reason": "An orientation page. Its job is to tell learners how the unit runs, and an activity would slow them down on the way to the content." }
```

Welcome pages, assessment instructions, contact details, reading lists and
reflective pages usually want a skip. Say so: a course where every page has an
activity is as tiring as one where none do.

**A page that would benefit** gets a normal proposal (fields in
`spec-reference.md`), sized for one page:

- A short `analysis`: two or three key ideas, the threshold idea, any
  misconception.
- Two or three candidates, one recommended.
- An `insert` on each candidate saying where on the page it goes: `"start"`
  for a hook before the content, `{ "after": "Heading text" }` for straight
  after that heading's own content, or `"end"`. Use the page's real headings,
  listed in its page file.
- A sketch for each candidate you would recommend, inline as `"sketch"` or as a
  file with `"sketchFile": "sketches/name.json"`, relative to `proposals/`.
  Keep sketch files inside the workspace, so it can be copied or shared whole.
  A candidate without a sketch is fine: the review app says it will be drafted
  if chosen.

Across the course:

- **Vary the patterns.** Five sorting tasks in a row is a worksheet. Match the
  pattern to what each page asks learners to know or do.
- **Use the real content.** Build activities from what the page says. Where an
  activity needs something the page does not have, such as example sentences
  or a scenario, write it as `constructed` content with its source `to-check`.
- **Mark the data honestly** on every candidate, as for any proposal.

Check progress as you go:

```
node bin/learnviz.js course status ~/courses/my-course
```

It lists every page with what it needs next and any error in its proposal.

## 5. Let the designer review

```
node bin/learnviz.js course review ~/courses/my-course
```

This writes `review/index.html`. Point the designer at it. For each page they
see what the page says, the analysis, and the options, each playable as a
learner. They choose one and where it goes, and the app moves to the next page.
They can also agree to a skip, say "no activity", ask for other options, add a
note for the builder, go back and change their mind.

For a long course, do not wait until every page is proposed. Write one module,
run `course review`, and let the designer start while you write the next. The
app picks up where they left off, because choices are kept in their browser.

When they finish, they either save `choices.json` into the workspace, or copy
their choices and paste them into the conversation. If pasted, save the JSON as
`choices.json` in the workspace.

## 6. Act on the choices

Run `course status` again. Each page now says what it needs:

- **write options: the designer wants some** means they rejected the options, or
  asked for options on a page you skipped. Read any note, write a new proposal,
  run `course review`, and ask them to decide that page again.
- **ready to build from the sketch, as a draft** means the chosen option has a
  sketch. It can be built as it is.
- **write the finished spec** means the chosen option had no sketch. Write
  `specs/<slug>.json`.

For anything chosen, write the finished activity to `specs/<slug>.json` when
the sketch needs work: the designer's note applied, placeholder content
replaced, every source listed. The build prefers a spec in `specs/` over the
sketch.

## 7. Build

```
node bin/learnviz.js course build ~/courses/my-course
```

It writes `build/`:

| Path | What it is |
|---|---|
| `<course>-with-activities.imscc` | The course export with every activity placed on its page, as a script-free Emble block, and every figure added as a course file |
| `scorm/NN-slug.scorm.zip` | The full interactive version of each activity, for the SCORM tool |
| `activities/` | Every activity's complete folder, with a dashboard |
| `upload-checklist.html` | What was built where, and the steps to get it into Canvas |

Each draft activity carries a yellow draft note on its page. Once sources are
checked and each spec is marked `"status": "release"`, build with `--release`,
which refuses to write anything while a draft remains.

## 8. Get it into Canvas

The checklist has the steps. In short:

1. **Import the package into a blank sandbox course first**: Settings, then
   Import Course Content, then Canvas Course Export Package. Every activity is
   already on its page, with its figure.
2. **Then the live course.** Canvas matches re-imported content by its
   identifier and overwrites it, so importing into the course the export came
   from updates those pages in place. It also overwrites any edits made to them
   since the export, which is why the export should be fresh.
3. **Upload each SCORM package** where the SCORM tool is available, and add it to
   the module beside its page. Then delete the teacher note on that page.
4. **Check in Student View.**

This path has been checked against the documented export format and a sample
course, not yet against every institution's Canvas. Try it in a sandbox course
first, every time.

# Building a twelve week schedule

> **Draft.** 1 source still to check. Check it with the review sheet before students see it.

- **Activity.** Step by step. The learner advances through a diagram that builds one piece at a time.
- **Learning intent.** Learners can read a schedule for parallel work and identify which tasks sit on the critical path.
- **Best placed.** During class, at the front of the room
- **Why it works.** Showing one part at a time, with a sentence about each, removes the work of finding where to start and what to read next.
- **In Canvas.** Through the SCORM package, it tells Canvas when the learner has finished. There is no score: this activity is about the thinking, not the mark.

## Using it across the week

- **Before class.** Not usually a before-class activity. If you do set it, ask learners to note one step they would like explained further.
- **During class.** This is built for the front of the room. Open it in presenter view and press the right arrow for each step. Say each step in your own words rather than reading it, and pause on each new part to ask what the room notices before moving on.
- **After class.** Point learners back to it for revision. Working through it again at their own pace, with the narration, is the segmented version of what you showed in class.

## Presenter view

Add `#present` to the address, or use the link at the bottom of the page. Text gets larger, the page fills the screen, and the keyboard drives it.

- Right arrow or space: next step. Left arrow: back.
- The progress dots show the room how far through you are.
- Each new part glows briefly as it appears.
- Keys: → next step · ← back · Esc leave presenter view.

### A script, if you want one

Put it in your own words. Reading it out word for word is slower than talking.

1. Step 1: The council permit takes six weeks, and nothing on site can start without it. This is the critical path. Everything else is arranged around it.
2. Step 2: Soil testing runs inside the permit window. It does not hold anything up, so it has slack.
3. Step 3: Volunteer recruitment also runs in parallel, finishing exactly as the permit arrives.
4. Step 4: Induction cannot start until recruitment closes, and must finish before anyone is on site.
5. Step 5: Site clearing starts the day the permit lands. Any delay to the permit pushes this, and everything after it.
6. Step 6: The raised beds follow the clearing.
7. Step 7: Irrigation overlaps the bed build on purpose: the plumber is only available in week 9.
8. Step 8: Paths go down while the beds are finished.
9. Step 9: Planting day lands in week 11, one week before handover. Ask the room: which single task, if it slipped by a week, would push the handover?

## Getting it into Canvas

Four routes, from the most capable to the most portable. Choose one for students, and keep presenter view for class.

### 1. As a SCORM activity (tracked, can be graded)

Upload `building-a-twelve-week-schedule.scorm.zip` through the SCORM tool in your course navigation, if your institution has it switched on. Choose whether to import it as a graded assignment. The activity runs inside Canvas and reports back.

### 2. As a Canvas page (works everywhere, no hosting)

Open `canvas-page.html` in a text editor, copy everything, and paste it into the HTML editor of a Canvas page. It uses Emble blocks and expandable answers rather than scripts, so it survives the Canvas editor and works in the mobile app. Learners answer before they open each answer.

### 3. As an embedded web page

If your institution can host a web page, publish `index.html` and paste `canvas-embed.html` into a Canvas page, replacing the highlighted placeholder with the page address. Do not upload `index.html` to Canvas Files: Canvas shows uploaded HTML without running its scripts, so it will load and do nothing.

### 4. In class, from your own computer

Open `index.html` in a browser and add `#present` to the end of the address, or use the Presenter view link at the bottom of the page. It needs no internet connection and no login.

### The figure on its own

Upload `figure.png` to Canvas Files and paste `figure.canvas.html` into a page, then replace the highlighted line with the uploaded image. The alt text and the image description are already written.

## Files in this folder

- `index.html`. The activity. One self-contained page: no fonts, libraries or data loaded from anywhere. Add #present to the address for presenter view.
- `building-a-twelve-week-schedule.scorm.zip`. SCORM 1.2 package for the Canvas SCORM tool. Reports completion, and a score where the activity has one.
- `canvas-page.html`. Paste into the HTML editor of a Canvas page. No scripts, so it survives the editor and works in the mobile app.
- `canvas-embed.html`. Iframe block for when index.html is published on a web host.
- `figure.svg`. The figure as a vector. Edit or rescale from this. Do not paste it into the Canvas editor, which strips SVG.
- `figure.png`. The figure as an image for Canvas Files, at twice size so it stays sharp.
- `figure.canvas.html`. Emble diagram block for the figure, with its alt text and image description.
- `text-version.txt`. The whole activity as plain text, for a handout, a screen reader or a transcript.
- `spec.json`. The spec this was built from. Edit it and build again to change anything.
- `teacher-guide.html`. This guide, as a printable page. Also as teacher-guide.md.
- `review-sheet.html`. The checklist for a subject expert before release. Also as review-sheet.md.

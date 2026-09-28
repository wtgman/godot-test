# Why the outer planets move so slowly

> **Draft.** 1 source still to check. Check it with the review sheet before students see it.

- **Activity.** Explore the model. The learner changes the inputs to a model and meets challenges.
- **Learning intent.** Learners can state Kepler's third law in their own words and predict how an orbital period changes with distance and stellar mass.
- **Best placed.** During class, at the front of the room
- **Why it works.** Changing an input and watching the result makes a relationship felt, and a challenge turns the sandbox into a task.
- **In Canvas.** Through the SCORM package, it sends completion and a score to Canvas. The score kept is the learner's best attempt, so trying again never lowers it, and showing a model answer never raises it.

## Using it across the week

- **Before class.** Set the first challenge before class, so learners arrive having already pushed on the model once.
- **During class.** Put it up in presenter view and ask the room to predict, before you move a slider, which way the result will go and by roughly how much. Then move it. Work through the challenges together, asking someone to direct you.
- **After class.** Set the remaining challenges as individual practice. The score is the proportion of challenges completed.

## Presenter view

Add `#present` to the address, or use the link at the bottom of the page. Text gets larger, the page fills the screen, and the keyboard drives it.

- Move the sliders with the mouse, or focus one and use the arrow keys for fine steps.
- Pause stops the animation while you talk.
- Keys: Esc leave presenter view.

## Answer key

| Prompt | Answer | Why |
| --- | --- | --- |
| Make Earth's year last two years. | period_Earth within 0.05 of 2 | A quarter of the Sun's mass. Halving the pull does not halve the speed: the period goes as one over the square root of the mass, so a quarter of the mass doubles the year. |
| Now get Jupiter round the star in under seven years. | period_Jupiter at most 7 | It takes nearly three Suns. Jupiter is so far out that even tripling the star's mass only brings its year down from about 12 years to about 7. |

## Getting it into Canvas

Four routes, from the most capable to the most portable. Choose one for students, and keep presenter view for class.

### 1. As a SCORM activity (tracked, can be graded)

Upload `why-the-outer-planets-move-so-slowly.scorm.zip` through the SCORM tool in your course navigation, if your institution has it switched on. Choose whether to import it as a graded assignment. The activity runs inside Canvas and reports back.

### 2. As a Canvas page (works everywhere, no hosting)

Open `canvas-page.html` in a text editor, copy everything, and paste it into the HTML editor of a Canvas page. It uses Emble blocks and expandable answers rather than scripts, so it survives the Canvas editor and works in the mobile app. Learners answer before they open each answer.

### 3. As an embedded web page

If your institution can host a web page, publish `index.html` and paste `canvas-embed.html` into a Canvas page, replacing the highlighted placeholder with the page address. Do not upload `index.html` to Canvas Files: Canvas shows uploaded HTML without running its scripts, so it will load and do nothing.

### 4. In class, from your own computer

Open `index.html` in a browser and add `#present` to the end of the address, or use the Presenter view link at the bottom of the page. It needs no internet connection and no login.

### As a video in Canvas Studio

Upload `animation.mp4` to Canvas Studio rather than Course Files. Studio adds captions and plays it everywhere, including the mobile apps. It shows the model running at its starting settings, so pair it with a question about what learners notice. Keep the text version on the page beside it.

## Files in this folder

- `index.html`. The activity. One self-contained page: no fonts, libraries or data loaded from anywhere. Add #present to the address for presenter view.
- `why-the-outer-planets-move-so-slowly.scorm.zip`. SCORM 1.2 package for the Canvas SCORM tool. Reports completion, and a score where the activity has one.
- `canvas-page.html`. Paste into the HTML editor of a Canvas page. No scripts, so it survives the editor and works in the mobile app.
- `canvas-embed.html`. Iframe block for when index.html is published on a web host.
- `animation.mp4`. The animation as a video (H.264 in MP4) for Canvas Studio, which adds captions and plays in the mobile apps. It shows the starting settings. Learners cannot change them.
- `text-version.txt`. The whole activity as plain text, for a handout, a screen reader or a transcript.
- `spec.json`. The spec this was built from. Edit it and build again to change anything.
- `teacher-guide.html`. This guide, as a printable page. Also as teacher-guide.md.
- `review-sheet.html`. The checklist for a subject expert before release. Also as review-sheet.md.

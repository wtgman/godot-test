# Handling a complaint

> **Draft.** 1 source still to check. Check it with the review sheet before students see it.

- **Activity.** Put it in order. The learner puts the steps in order, or times them, then checks against the model.
- **Learning intent.** Learners can carry out the steps of handling a customer complaint in an order that resolves it rather than escalating it.
- **Best placed.** After class, as practice or revision
- **Why it works.** Recalling a procedure is more durable than recognising one, and each misplaced step exposes a dependency the reason can teach.
- **In Canvas.** Through the SCORM package, it sends completion and a score to Canvas. The score kept is the learner's best attempt, so trying again never lowers it, and showing a model answer never raises it.

## Using it across the week

- **Before class.** Works as a before-class check of what learners already know about the procedure.
- **During class.** Put it up in presenter view and build the order with the room, one step at a time, asking why before each move. Press R to show the model order with the reasons.
- **After class.** Set it as practice. The score goes to the gradebook through the SCORM package if you want it to.

## Presenter view

Add `#present` to the address, or use the link at the bottom of the page. Text gets larger, the page fills the screen, and the keyboard drives it.

- R: show the model answer with the reasons.
- Keys: R show the model answer · Esc leave presenter view.

## Answer key

| Prompt | Answer | Why |
| --- | --- | --- |
| Listen without interrupting | Position 1 | People need to be heard before they can hear you. Jumping in with a fix usually makes it take longer. |
| Acknowledge it and apologise for the experience | Position 2 | Apologising for how it felt is not admitting fault. It puts you on their side of the problem. |
| Ask what would put it right | Position 3 | The fix you assume they want is often not the one they do. |
| Agree what you will do, and by when | Position 4 | A specific action and a time is what turns an apology into a plan. |
| Follow up afterwards | Position 5 | Checking back is what customers remember, and it catches the fixes that did not work. |

## Getting it into Canvas

Four routes, from the most capable to the most portable. Choose one for students, and keep presenter view for class.

### 1. As a SCORM activity (tracked, can be graded)

Upload `handling-a-complaint.scorm.zip` through the SCORM tool in your course navigation, if your institution has it switched on. Choose whether to import it as a graded assignment. The activity runs inside Canvas and reports back.

### 2. As a Canvas page (works everywhere, no hosting)

Open `canvas-page.html` in a text editor, copy everything, and paste it into the HTML editor of a Canvas page. It uses Emble blocks and expandable answers rather than scripts, so it survives the Canvas editor and works in the mobile app. Learners answer before they open each answer.

### 3. As an embedded web page

If your institution can host a web page, publish `index.html` and paste `canvas-embed.html` into a Canvas page, replacing the highlighted placeholder with the page address. Do not upload `index.html` to Canvas Files: Canvas shows uploaded HTML without running its scripts, so it will load and do nothing.

### 4. In class, from your own computer

Open `index.html` in a browser and add `#present` to the end of the address, or use the Presenter view link at the bottom of the page. It needs no internet connection and no login.

## Files in this folder

- `index.html`. The activity. One self-contained page: no fonts, libraries or data loaded from anywhere. Add #present to the address for presenter view.
- `handling-a-complaint.scorm.zip`. SCORM 1.2 package for the Canvas SCORM tool. Reports completion, and a score where the activity has one.
- `canvas-page.html`. Paste into the HTML editor of a Canvas page. No scripts, so it survives the editor and works in the mobile app.
- `canvas-embed.html`. Iframe block for when index.html is published on a web host.
- `text-version.txt`. The whole activity as plain text, for a handout, a screen reader or a transcript.
- `spec.json`. The spec this was built from. Edit it and build again to change anything.
- `teacher-guide.html`. This guide, as a printable page. Also as teacher-guide.md.
- `review-sheet.html`. The checklist for a subject expert before release. Also as review-sheet.md.

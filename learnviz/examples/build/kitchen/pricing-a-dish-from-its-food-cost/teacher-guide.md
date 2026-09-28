# Pricing a dish from its food cost

> **Draft.** 1 source still to check. Check it with the review sheet before students see it.

- **Activity.** Explore the model. The learner changes the inputs to a model and meets challenges.
- **Learning intent.** Learners can calculate a menu price from a portion cost and a target food cost percentage, and explain how a change in cost affects price.
- **Best placed.** During class, at the front of the room
- **Why it works.** Changing an input and watching the result makes a relationship felt, and a challenge turns the sandbox into a task.
- **In Canvas.** Through the SCORM package, it sends completion and a score to Canvas. The score kept is the learner's best attempt, so trying again never lowers it, and showing a model answer never raises it.

## Using it across the week

- **Before class.** Set the first challenge before class, so learners arrive having already pushed on the model once.
- **During class.** Put it up in presenter view and ask the room to predict, before you move a slider, which way the result will go and by roughly how much. Then move it. Work through the challenges together, asking someone to direct you.
- **After class.** Set the remaining challenges as individual practice. The score is the proportion of challenges completed.

### Listen for

Learners adding the target percentage to the cost (a markup) instead of dividing by it. Ask them to check: at a 30 per cent food cost, is the cost 30 per cent of the price?

## Presenter view

Add `#present` to the address, or use the link at the bottom of the page. Text gets larger, the page fills the screen, and the keyboard drives it.

- Move the sliders with the mouse, or focus one and use the arrow keys for fine steps.
- Keys: Esc leave presenter view.

## Answer key

| Prompt | Answer | Why |
| --- | --- | --- |
| Your supplier puts the portion cost up to $11. Keep food cost at 30 per cent. What does the menu price before GST need to be? | price within 0.2 of 36.67 | About $36.67. A $2 rise in cost needs a price rise of about $6.67 to hold the same percentage, because the price has to cover the cost more than three times over. |
| A competitor sells the same dish for $32 before GST. At a portion cost of $11, roughly what food cost percentage would you be running if you matched them? | price within 0.6 of 32 | About 34 per cent. Matching the competitor's price costs you around four points of margin on every plate. |
| Find a portion cost and a target that give a price before GST of exactly $40. What does the customer pay? | price_gst within 0.05 of 44 | $44. GST goes on top of the price you set, so work the price out first and then add 10 per cent. |

## Getting it into Canvas

Four routes, from the most capable to the most portable. Choose one for students, and keep presenter view for class.

### 1. As a SCORM activity (tracked, can be graded)

Upload `pricing-a-dish-from-its-food-cost.scorm.zip` through the SCORM tool in your course navigation, if your institution has it switched on. Choose whether to import it as a graded assignment. The activity runs inside Canvas and reports back.

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
- `pricing-a-dish-from-its-food-cost.scorm.zip`. SCORM 1.2 package for the Canvas SCORM tool. Reports completion, and a score where the activity has one.
- `canvas-page.html`. Paste into the HTML editor of a Canvas page. No scripts, so it survives the editor and works in the mobile app.
- `canvas-embed.html`. Iframe block for when index.html is published on a web host.
- `figure.svg`. The figure as a vector. Edit or rescale from this. Do not paste it into the Canvas editor, which strips SVG.
- `figure.png`. The figure as an image for Canvas Files, at twice size so it stays sharp.
- `figure.canvas.html`. Emble diagram block for the figure, with its alt text and image description.
- `text-version.txt`. The whole activity as plain text, for a handout, a screen reader or a transcript.
- `spec.json`. The spec this was built from. Edit it and build again to change anything.
- `teacher-guide.html`. This guide, as a printable page. Also as teacher-guide.md.
- `review-sheet.html`. The checklist for a subject expert before release. Also as review-sheet.md.

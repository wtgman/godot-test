# A conversation in the corridor

> **Draft.** 1 source still to check. Check it with the review sheet before students see it.

- **Activity.** Scenario. The learner makes decisions in a realistic situation and sees the consequences.
- **Learning intent.** Learners can respond to a grieving family member in a way that keeps the conversation open, without arguing, over-promising or stepping outside their role.
- **Best placed.** During class, at the front of the room
- **Why it works.** Judgement is learned by practising it in context, and in a scenario the wrong call costs nothing and teaches the most.
- **In Canvas.** Through the SCORM package, it sends completion and a score to Canvas. The score kept is the learner's best attempt, so trying again never lowers it, and showing a model answer never raises it.

## Using it across the week

- **Before class.** Can be set before class, but works best when learners can talk about their choices afterwards.
- **During class.** Run it in presenter view as a whole class. At each decision, have the room vote, pick the most popular answer, and see what happens. Then go back and try the choice nobody picked. The poor choices are where the learning is, so make sure the room sees at least one.
- **After class.** Set it for individual practice. Learners can replay it and try different approaches. The score reflects how many strong choices they made.

### Listen for

Learners who look for the one magic sentence. There is not one. Every strong choice here does the same thing: it keeps the conversation open and leaves the family member in charge of their own feelings.

### Questions to ask the room

1. Which poor choice was the most tempting, and why?
2. At which point did your role as a student matter most?

## Presenter view

Add `#present` to the address, or use the link at the bottom of the page. Text gets larger, the page fills the screen, and the keyboard drives it.

- Click the choice the room votes for.
- Use Try it again at the end to explore a different path.
- Keys: Esc leave presenter view.

## Answer key

| Prompt | Answer | Why |
| --- | --- | --- |
| start: "It sounds like the results came as a real shock. What did the doctor tell you?" | Strong | You neither agree that there is a mistake nor argue that there is not. You name the feeling and ask what she understands, which tells you where she is. |
| start: "I'm sorry, but the results are right. You need to accept this." | Unhelpful | Correct on the facts, but it tells her what she is allowed to feel. Denial often protects someone while the news sinks in, and pushing against it usually makes them hold on harder. |
| start: "I'm sure it's a mistake. I'll ask them to redo it." | Unhelpful | Kind in the moment, but it is a promise you cannot keep, it steps outside your role as a student, and it strengthens a belief that will hurt more later. |
| pushback: "I can hear how frustrated you are. You've been left without answers." | Strong | Naming the anger lets it be said, which usually lowers it. You have not taken it personally, and you have not defended anyone. |
| pushback: "That's not fair. The staff here work really hard." | Unhelpful | Defending the team is a natural reflex, but it turns her anger into an argument. Anger aimed at the person in the room is rarely about that person. |
| pushback: "Let me get the nurse in charge for you." | Workable | Bringing in the right person is a fair step. Done straight away, before acknowledging anything, it can feel like being handed off. |
| overpromise: "I'm sorry. I shouldn't have said that. I wanted to help and I got it wrong." | Strong | A plain apology, with no excuses, repairs more than an explanation would. It also shows her you can be trusted to tell her the truth. |
| overpromise: "I must have misunderstood what you were asking." | Unhelpful | It moves the mistake onto her. She will notice, and it makes the next conversation harder for whoever has it. |
| opens: "What do you think he needs to hear from you?" | Strong | It hands the question back to her, where the answer is. She knows her father. Your job is to help her find the words, not to supply them. |
| opens: "Tell him not to think like that. It's not his fault." | Workable | Reassuring and well meant, but it can close the conversation he is trying to have. "If only" is how many people work through what is happening to them. |
| opens: "The doctors did say smoking was the likely cause." | Unhelpful | True, and it confirms his guilt at the moment he is most exposed to it. Accuracy is not what is needed here. |

## Getting it into Canvas

Four routes, from the most capable to the most portable. Choose one for students, and keep presenter view for class.

### 1. As a SCORM activity (tracked, can be graded)

Upload `talking-with-grieving-families.scorm.zip` through the SCORM tool in your course navigation, if your institution has it switched on. Choose whether to import it as a graded assignment. The activity runs inside Canvas and reports back.

### 2. As a Canvas page (works everywhere, no hosting)

Open `canvas-page.html` in a text editor, copy everything, and paste it into the HTML editor of a Canvas page. It uses Emble blocks and expandable answers rather than scripts, so it survives the Canvas editor and works in the mobile app. Learners answer before they open each answer.

### 3. As an embedded web page

If your institution can host a web page, publish `index.html` and paste `canvas-embed.html` into a Canvas page, replacing the highlighted placeholder with the page address. Do not upload `index.html` to Canvas Files: Canvas shows uploaded HTML without running its scripts, so it will load and do nothing.

### 4. In class, from your own computer

Open `index.html` in a browser and add `#present` to the end of the address, or use the Presenter view link at the bottom of the page. It needs no internet connection and no login.

## Files in this folder

- `index.html`. The activity. One self-contained page: no fonts, libraries or data loaded from anywhere. Add #present to the address for presenter view.
- `talking-with-grieving-families.scorm.zip`. SCORM 1.2 package for the Canvas SCORM tool. Reports completion, and a score where the activity has one.
- `canvas-page.html`. Paste into the HTML editor of a Canvas page. No scripts, so it survives the editor and works in the mobile app.
- `canvas-embed.html`. Iframe block for when index.html is published on a web host.
- `text-version.txt`. The whole activity as plain text, for a handout, a screen reader or a transcript.
- `spec.json`. The spec this was built from. Edit it and build again to change anything.
- `teacher-guide.html`. This guide, as a printable page. Also as teacher-guide.md.
- `review-sheet.html`. The checklist for a subject expert before release. Also as review-sheet.md.

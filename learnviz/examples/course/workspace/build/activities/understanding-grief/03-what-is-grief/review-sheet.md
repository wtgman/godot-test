# Put the five stages of grief in order

> **Status: draft.** 2 sources still to check.

## 1. Does it do what it is for?

**Intent.** Learners can explain why grief does not follow a fixed sequence, and what that changes about how they respond to a grieving client.

**Activity.** Predict, then check: the learner commits to a guess before the answer is shown.

- [ ] Doing this activity would move a learner towards the intent.
- [ ] The language suits the learners who will see it.
- [ ] Nothing in it would surprise or upset a learner without warning.

## 2. Sources

Open each source and confirm it says what the activity says. Then change its status to `verified` in the spec.

| Check | Source | Where it came from | Status | Note |
| --- | --- | --- | --- | --- |
| [ ] | Kübler-Ross, E. (1969). On Death and Dying. | General knowledge in the field | **To check** | Check the date and the claim that the interviews were with dying patients against the unit's reading list. |
| [ ] | Kübler-Ross, E. and Kessler, D. (2005). On Grief and Grieving. | General knowledge in the field | **To check** | Check the 'not stops on a linear timeline' wording against the text. |

## 3. Answers

Confirm each answer, and that the reason given is the one you would give.

| Check | Prompt | Answer | Reason |
| --- | --- | --- | --- |
| [ ] | In what order do people move through these five stages of grief? | There is no correct order. | It was a trick question. Elisabeth Kübler-Ross described these five responses in 1969, from interviews with people who were dying. She did not claim that people pass through them in sequence, and in 2005 she wrote that they are not stops on a linear timeline. People move between them, return to one they seemed to have left, and some never show one or more of them at all. |

## 4. Accessibility

Automated checks passed: colour contrast meets WCAG 2.2 AA, nothing is carried by colour alone, and every part of the figure appears in the text version. Every control works from the keyboard, and the page respects reduced motion.

- [ ] Try the activity with the keyboard only: Tab, arrow keys, Enter and Space.
- [ ] Read the text version. It should stand on its own for someone who cannot use the activity.

### Text version

```
Put the five stages of grief in order
=====================================

What this shows: A prediction activity. The learner answers a question before the answer is shown, then sees the answer and the reasoning.
How it is arranged: Question first, then the learner's answer, then the reveal.

Contents:
  - Question: In what order do people move through these five stages of grief?
  - Items to put in order: Denial, Anger, Bargaining, Depression, Acceptance.
  - There is no correct order: There is no correct order.
  - Why: It was a trick question. Elisabeth Kübler-Ross described these five responses in 1969, from interviews with people who were dying. She did not claim that people pass through them in sequence, and in 2005 she wrote that they are not stops on a linear timeline. People move between them, return to one they seemed to have left, and some never show one or more of them at all.
  - Point 1: If you ranked them denial first and acceptance last, you hold the version that is usually taught, and the one families usually bring with them. Expect to meet it on placement.
  - Point 2: A client who is angry in week one and angry again in week six has not gone backwards.
  - Point 3: The five describe responses you may see. They are not a checklist of progress.
```

## Releasing it

1. Tick every box above.
2. In the spec, set each source's `status` to `verified`, and set `"status": "release"`.
3. Build again with `--release`. The build refuses anything still marked as a draft, and the draft banner disappears.

Reviewed by: ______________________  Date: ____________

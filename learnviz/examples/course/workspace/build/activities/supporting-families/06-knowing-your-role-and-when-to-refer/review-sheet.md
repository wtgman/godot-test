# Passing on a concern

> **Status: draft.** 1 source still to check.

## 1. Does it do what it is for?

**Intent.** Learners can pass on a family member's concern in the order their service expects.

**Activity.** Put it in order: the learner puts the steps in order, or times them, then checks against the model.

- [ ] Doing this activity would move a learner towards the intent.
- [ ] The language suits the learners who will see it.
- [ ] Nothing in it would surprise or upset a learner without warning.

## 2. Sources

Open each source and confirm it says what the activity says. Then change its status to `verified` in the spec.

| Check | Source | Where it came from | Status | Note |
| --- | --- | --- | --- | --- |
| [ ] | Course page: Knowing your role and when to refer | From the supplied course material | **To check** | The order of steps is from the page. The reasons were written for this activity. |

## 3. Answers

Confirm each answer, and that the reason given is the one you would give.

| Check | Prompt | Answer | Reason |
| --- | --- | --- | --- |
| [ ] | Listen without interrupting | Position 1 | You cannot pass on accurately what you did not hear in full. |
| [ ] | Acknowledge what they have said | Position 2 | It tells them they were heard before anything else happens. |
| [ ] | Tell them you will pass it on, and to whom | Position 3 | They should never be surprised that someone else knows. |
| [ ] | Tell your supervisor the same shift, in person | Position 4 | A note alone can sit unread. In person, the same shift, it gets acted on. |
| [ ] | Record it in the progress notes | Position 5 | The record comes after the conversation with your supervisor, as your service requires. |
| [ ] | Check back with the family that someone has followed up | Position 6 | Closing the loop is what the family remembers, and it catches the follow-ups that did not happen. |

## 4. Accessibility

Automated checks passed: colour contrast meets WCAG 2.2 AA, nothing is carried by colour alone, and every part of the figure appears in the text version. Every control works from the keyboard, and the page respects reduced motion.

- [ ] Try the activity with the keyboard only: Tab, arrow keys, Enter and Space.
- [ ] Read the text version. It should stand on its own for someone who cannot use the activity.

### Text version

```
Passing on a concern
====================

What this shows: An ordering activity: put 6 steps in the right order, then check.
How it is arranged: A family member tells you something that worries you. Put these steps in the order you would take them.

Contents:
  - Step 1: Listen without interrupting. You cannot pass on accurately what you did not hear in full.
  - Step 2: Acknowledge what they have said. It tells them they were heard before anything else happens.
  - Step 3: Tell them you will pass it on, and to whom. They should never be surprised that someone else knows.
  - Step 4: Tell your supervisor the same shift, in person. A note alone can sit unread. In person, the same shift, it gets acted on.
  - Step 5: Record it in the progress notes. The record comes after the conversation with your supervisor, as your service requires.
  - Step 6: Check back with the family that someone has followed up. Closing the loop is what the family remembers, and it catches the follow-ups that did not happen.
```

## Releasing it

1. Tick every box above.
2. In the spec, set each source's `status` to `verified`, and set `"status": "release"`.
3. Build again with `--release`. The build refuses anything still marked as a draft, and the draft banner disappears.

Reviewed by: ______________________  Date: ____________

# Handling a complaint

> **Status: draft.** 1 source still to check.

## 1. Does it do what it is for?

**Intent.** Learners can carry out the steps of handling a customer complaint in an order that resolves it rather than escalating it.

**Activity.** Put it in order: the learner puts the steps in order, or times them, then checks against the model.

- [ ] Doing this activity would move a learner towards the intent.
- [ ] The language suits the learners who will see it.
- [ ] Nothing in it would surprise or upset a learner without warning.

## 2. Sources

Open each source and confirm it says what the activity says. Then change its status to `verified` in the spec.

| Check | Source | Where it came from | Status | Note |
| --- | --- | --- | --- | --- |
| [ ] | Steps written for this activity | Written for this activity. Check it for realism, not accuracy. | **To check** | Check against your workplace's complaints procedure. |

### Written for this activity

These parts were written, not quoted. Ask someone who does this work whether they ring true.

- [ ] Steps written for this activity

## 3. Answers

Confirm each answer, and that the reason given is the one you would give.

| Check | Prompt | Answer | Reason |
| --- | --- | --- | --- |
| [ ] | Listen without interrupting | Position 1 | People need to be heard before they can hear you. Jumping in with a fix usually makes it take longer. |
| [ ] | Acknowledge it and apologise for the experience | Position 2 | Apologising for how it felt is not admitting fault. It puts you on their side of the problem. |
| [ ] | Ask what would put it right | Position 3 | The fix you assume they want is often not the one they do. |
| [ ] | Agree what you will do, and by when | Position 4 | A specific action and a time is what turns an apology into a plan. |
| [ ] | Follow up afterwards | Position 5 | Checking back is what customers remember, and it catches the fixes that did not work. |

## 4. Accessibility

Automated checks passed: colour contrast meets WCAG 2.2 AA, nothing is carried by colour alone, and every part of the figure appears in the text version. Every control works from the keyboard, and the page respects reduced motion.

- [ ] Try the activity with the keyboard only: Tab, arrow keys, Enter and Space.
- [ ] Read the text version. It should stand on its own for someone who cannot use the activity.

### Text version

```
Handling a complaint
====================

What this shows: An ordering activity: put 5 steps in the right order, then check.
How it is arranged: In what order should you handle a customer complaint?

Contents:
  - Step 1: Listen without interrupting. People need to be heard before they can hear you. Jumping in with a fix usually makes it take longer.
  - Step 2: Acknowledge it and apologise for the experience. Apologising for how it felt is not admitting fault. It puts you on their side of the problem.
  - Step 3: Ask what would put it right. The fix you assume they want is often not the one they do.
  - Step 4: Agree what you will do, and by when. A specific action and a time is what turns an apology into a plan.
  - Step 5: Follow up afterwards. Checking back is what customers remember, and it catches the fixes that did not work.
```

## Releasing it

1. Tick every box above.
2. In the spec, set each source's `status` to `verified`, and set `"status": "release"`.
3. Build again with `--release`. The build refuses anything still marked as a draft, and the draft banner disappears.

Reviewed by: ______________________  Date: ____________

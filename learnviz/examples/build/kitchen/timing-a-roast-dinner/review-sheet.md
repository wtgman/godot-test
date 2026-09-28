# Timing a roast dinner

> **Status: draft.** 1 source still to check.

## 1. Does it do what it is for?

**Intent.** Learners can work backwards from a serving time to decide when each part of a multi-part meal must start.

**Activity.** Put it in order: the learner puts the steps in order, or times them, then checks against the model.

- [ ] Doing this activity would move a learner towards the intent.
- [ ] The language suits the learners who will see it.
- [ ] Nothing in it would surprise or upset a learner without warning.

## 2. Sources

Open each source and confirm it says what the activity says. Then change its status to `verified` in the spec.

| Check | Source | Where it came from | Status | Note |
| --- | --- | --- | --- | --- |
| [ ] | Cooking times written for this activity | Written for this activity. Check it for realism, not accuracy. | **To check** | Check the times against your kitchen's recipes and equipment. |

### Written for this activity

These parts were written, not quoted. Ask someone who does this work whether they ring true.

- [ ] Cooking times written for this activity

## 3. Answers

Confirm each answer, and that the reason given is the one you would give.

| Check | Prompt | Answer | Reason |
| --- | --- | --- | --- |
| [ ] | Lamb into the oven | 0 minutes from the start | A 1.5 kg leg needs about 90 minutes, then 15 minutes resting. That rest is why it goes in first. |
| [ ] | Parboil the potatoes | 45 minutes from the start | About twelve minutes in boiling water, then a few minutes to steam dry before they hit the fat. |
| [ ] | Potatoes into the oven | 60 minutes from the start | About 45 minutes to crisp. They share the oven with the lamb for its last half hour. |
| [ ] | Lamb out to rest | 90 minutes from the start | Resting lets the juices settle back through the meat. Carve straight away and they run onto the board. |
| [ ] | Make the gravy | 92 minutes from the start | Made in the roasting tin from the pan juices, so it cannot start until the lamb comes out. |
| [ ] | Steam the beans | 95 minutes from the start | Green vegetables go on last. They lose colour and bite within minutes of being cooked. |

## 4. Accessibility

Automated checks passed: colour contrast meets WCAG 2.2 AA, nothing is carried by colour alone, and every part of the figure appears in the text version. Every control works from the keyboard, and the page respects reduced motion.

- [ ] Try the activity with the keyboard only: Tab, arrow keys, Enter and Space.
- [ ] Read the text version. It should stand on its own for someone who cannot use the activity.

### Text version

```
Timing a roast dinner
=====================

What this shows: A timing activity: say when each of 6 steps should happen, in minutes from the start, then check against the model.
How it is arranged: Dinner is served 105 minutes after you start. At what minute should each task begin?

Contents:
  - Lamb into the oven: 0 minutes from the start. A 1.5 kg leg needs about 90 minutes, then 15 minutes resting. That rest is why it goes in first.
  - Parboil the potatoes: 45 minutes from the start. About twelve minutes in boiling water, then a few minutes to steam dry before they hit the fat.
  - Potatoes into the oven: 60 minutes from the start. About 45 minutes to crisp. They share the oven with the lamb for its last half hour.
  - Lamb out to rest: 90 minutes from the start. Resting lets the juices settle back through the meat. Carve straight away and they run onto the board.
  - Make the gravy: 92 minutes from the start. Made in the roasting tin from the pan juices, so it cannot start until the lamb comes out.
  - Steam the beans: 95 minutes from the start. Green vegetables go on last. They lose colour and bite within minutes of being cooked.
```

## Releasing it

1. Tick every box above.
2. In the spec, set each source's `status` to `verified`, and set `"status": "release"`.
3. Build again with `--release`. The build refuses anything still marked as a draft, and the draft banner disappears.

Reviewed by: ______________________  Date: ____________

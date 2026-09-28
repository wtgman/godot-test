# Building a twelve week schedule

> **Status: draft.** 1 source still to check.

## 1. Does it do what it is for?

**Intent.** Learners can read a schedule for parallel work and identify which tasks sit on the critical path.

**Activity.** Step by step: the learner advances through a diagram that builds one piece at a time.

- [ ] Doing this activity would move a learner towards the intent.
- [ ] The language suits the learners who will see it.
- [ ] Nothing in it would surprise or upset a learner without warning.

## 2. Sources

Open each source and confirm it says what the activity says. Then change its status to `verified` in the spec.

| Check | Source | Where it came from | Status | Note |
| --- | --- | --- | --- | --- |
| [ ] | Schedule written for this activity | Written for this activity. Check it for realism, not accuracy. | **To check** |  |

### Written for this activity

These parts were written, not quoted. Ask someone who does this work whether they ring true.

- [ ] Schedule written for this activity

## 3. Accessibility

Automated checks passed: colour contrast meets WCAG 2.2 AA, nothing is carried by colour alone, and every part of the figure appears in the text version. Every control works from the keyboard, and the page respects reduced motion.

- [ ] Try the activity with the keyboard only: Tab, arrow keys, Enter and Space.
- [ ] Read the text version. It should stand on its own for someone who cannot use the activity.

### Text version

```
Building a twelve week schedule
===============================

What this shows: A step-by-step walkthrough of a diagram, in 9 steps.
How it is arranged: The parts appear in this order: Council permit, Soil testing, Recruit volunteers, Volunteer induction, Clear the ground, Build raised beds, Install irrigation, Lay paths, Planting day.

Contents:
  - Before the first step: The deadlines are already on the chart: site work cannot start before week 6, and handover is at week 12. Watch what has to fit between them.
  - Step 1: The council permit takes six weeks, and nothing on site can start without it. This is the critical path. Everything else is arranged around it.
  - Step 2: Soil testing runs inside the permit window. It does not hold anything up, so it has slack.
  - Step 3: Volunteer recruitment also runs in parallel, finishing exactly as the permit arrives.
  - Step 4: Induction cannot start until recruitment closes, and must finish before anyone is on site.
  - Step 5: Site clearing starts the day the permit lands. Any delay to the permit pushes this, and everything after it.
  - Step 6: The raised beds follow the clearing.
  - Step 7: Irrigation overlaps the bed build on purpose: the plumber is only available in week 9.
  - Step 8: Paths go down while the beds are finished.
  - Step 9: Planting day lands in week 11, one week before handover. Ask the room: which single task, if it slipped by a week, would push the handover?
```

## Releasing it

1. Tick every box above.
2. In the spec, set each source's `status` to `verified`, and set `"status": "release"`.
3. Build again with `--release`. The build refuses anything still marked as a draft, and the draft banner disappears.

Reviewed by: ______________________  Date: ____________

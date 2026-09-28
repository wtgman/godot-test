# Why the outer planets move so slowly

> **Status: draft.** 1 source still to check.

## 1. Does it do what it is for?

**Intent.** Learners can state Kepler's third law in their own words and predict how an orbital period changes with distance and stellar mass.

**Activity.** Explore the model: the learner changes the inputs to a model and meets challenges.

- [ ] Doing this activity would move a learner towards the intent.
- [ ] The language suits the learners who will see it.
- [ ] Nothing in it would surprise or upset a learner without warning.

## 2. Sources

Open each source and confirm it says what the activity says. Then change its status to `verified` in the spec.

| Check | Source | Where it came from | Status | Note |
| --- | --- | --- | --- | --- |
| [ ] | NASA planetary fact sheet, orbital distances in astronomical units (https://nssdc.gsfc.nasa.gov/planetary/factsheet/) | General knowledge in the field | **To check** |  |

## 3. Answers

Confirm each answer, and that the reason given is the one you would give.

| Check | Prompt | Answer | Reason |
| --- | --- | --- | --- |
| [ ] | Make Earth's year last two years. | period_Earth within 0.05 of 2 | A quarter of the Sun's mass. Halving the pull does not halve the speed: the period goes as one over the square root of the mass, so a quarter of the mass doubles the year. |
| [ ] | Now get Jupiter round the star in under seven years. | period_Jupiter at most 7 | It takes nearly three Suns. Jupiter is so far out that even tripling the star's mass only brings its year down from about 12 years to about 7. |

## 4. Accessibility

Automated checks passed: colour contrast meets WCAG 2.2 AA, nothing is carried by colour alone, and every part of the figure appears in the text version. Every control works from the keyboard, and the page respects reduced motion.

- [ ] Try the activity with the keyboard only: Tab, arrow keys, Enter and Space.
- [ ] Read the text version. It should stand on its own for someone who cannot use the activity.

### Text version

```
Why the outer planets move so slowly
====================================

What this shows: An interactive model with 1 slider and 2 challenges.
How it is arranged: Inputs first, results beside or below them, then the challenges in order.

Contents:
  - Input: Mass of the star: from 0.20 solar masses to 3.00 solar masses, starting at 1.00 solar masses.
  - The relationship: Kepler's third law: orbital period in years is the square root of distance in astronomical units cubed, divided by the star's mass in solar masses.
  - When Mass of the star is 0.20 solar masses: Mercury, orbital period 0.54 years, Venus, orbital period 1.37 years, Earth, orbital period 2.24 years, Mars, orbital period 4.19 years, Jupiter, orbital period 26.51 years.
  - When Mass of the star is 0.90 solar masses: Mercury, orbital period 0.26 years, Venus, orbital period 0.64 years, Earth, orbital period 1.05 years, Mars, orbital period 1.98 years, Jupiter, orbital period 12.50 years.
  - When Mass of the star is 1.60 solar masses: Mercury, orbital period 0.19 years, Venus, orbital period 0.48 years, Earth, orbital period 0.79 years, Mars, orbital period 1.48 years, Jupiter, orbital period 9.37 years.
  - When Mass of the star is 2.30 solar masses: Mercury, orbital period 0.16 years, Venus, orbital period 0.40 years, Earth, orbital period 0.66 years, Mars, orbital period 1.24 years, Jupiter, orbital period 7.82 years.
  - When Mass of the star is 3.00 solar masses: Mercury, orbital period 0.14 years, Venus, orbital period 0.35 years, Earth, orbital period 0.58 years, Mars, orbital period 1.08 years, Jupiter, orbital period 6.85 years.
  - Challenge 1: Make Earth's year last two years. A quarter of the Sun's mass. Halving the pull does not halve the speed: the period goes as one over the square root of the mass, so a quarter of the mass doubles the year.
  - Challenge 2: Now get Jupiter round the star in under seven years. It takes nearly three Suns. Jupiter is so far out that even tripling the star's mass only brings its year down from about 12 years to about 7.
```

## Releasing it

1. Tick every box above.
2. In the spec, set each source's `status` to `verified`, and set `"status": "release"`.
3. Build again with `--release`. The build refuses anything still marked as a draft, and the draft banner disappears.

Reviewed by: ______________________  Date: ____________

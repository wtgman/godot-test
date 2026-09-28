# Pricing a dish from its food cost

> **Status: draft.** 1 source still to check.

## 1. Does it do what it is for?

**Intent.** Learners can calculate a menu price from a portion cost and a target food cost percentage, and explain how a change in cost affects price.

**Activity.** Explore the model: the learner changes the inputs to a model and meets challenges.

- [ ] Doing this activity would move a learner towards the intent.
- [ ] The language suits the learners who will see it.
- [ ] Nothing in it would surprise or upset a learner without warning.

## 2. Sources

Open each source and confirm it says what the activity says. Then change its status to `verified` in the spec.

| Check | Source | Where it came from | Status | Note |
| --- | --- | --- | --- | --- |
| [ ] | Food cost percentage, standard hospitality costing: cost divided by sale price excluding GST | General knowledge in the field | **To check** | Check the convention and the GST treatment against your unit's costing guide. |

## 3. Answers

Confirm each answer, and that the reason given is the one you would give.

| Check | Prompt | Answer | Reason |
| --- | --- | --- | --- |
| [ ] | Your supplier puts the portion cost up to $11. Keep food cost at 30 per cent. What does the menu price before GST need to be? | price within 0.2 of 36.67 | About $36.67. A $2 rise in cost needs a price rise of about $6.67 to hold the same percentage, because the price has to cover the cost more than three times over. |
| [ ] | A competitor sells the same dish for $32 before GST. At a portion cost of $11, roughly what food cost percentage would you be running if you matched them? | price within 0.6 of 32 | About 34 per cent. Matching the competitor's price costs you around four points of margin on every plate. |
| [ ] | Find a portion cost and a target that give a price before GST of exactly $40. What does the customer pay? | price_gst within 0.05 of 44 | $44. GST goes on top of the price you set, so work the price out first and then add 10 per cent. |

## 4. Accessibility

Automated checks passed: colour contrast meets WCAG 2.2 AA, nothing is carried by colour alone, and every part of the figure appears in the text version. Every control works from the keyboard, and the page respects reduced motion.

- [ ] Try the activity with the keyboard only: Tab, arrow keys, Enter and Space.
- [ ] Read the text version. It should stand on its own for someone who cannot use the activity.

### Text version

```
Pricing a dish from its food cost
=================================

What this shows: An interactive model with 2 sliders and 3 challenges.
How it is arranged: Inputs first, results beside or below them, then the challenges in order.

Contents:
  - Input: Portion cost: from $2.00 to $20.00, starting at $9.00.
  - Input: Target food cost: from 20% to 45%, starting at 30%.
  - Output: Menu price before GST: Portion cost divided by the target food cost percentage.
  - Output: Price the customer pays: The menu price with 10 per cent GST added.
  - Output: Gross profit per plate: What is left of the price before GST once the ingredients are paid for.
  - When Target food cost is 20%: Menu price before GST $45.00, Price the customer pays $49.50, Gross profit per plate $36.00.
  - When Target food cost is 26%: Menu price before GST $34.62, Price the customer pays $38.08, Gross profit per plate $25.62.
  - When Target food cost is 33%: Menu price before GST $27.27, Price the customer pays $30.00, Gross profit per plate $18.27.
  - When Target food cost is 39%: Menu price before GST $23.08, Price the customer pays $25.38, Gross profit per plate $14.08.
  - When Target food cost is 45%: Menu price before GST $20.00, Price the customer pays $22.00, Gross profit per plate $11.00.
  - Challenge 1: Your supplier puts the portion cost up to $11. Keep food cost at 30 per cent. What does the menu price before GST need to be? About $36.67. A $2 rise in cost needs a price rise of about $6.67 to hold the same percentage, because the price has to cover the cost more than three times over.
  - Challenge 2: A competitor sells the same dish for $32 before GST. At a portion cost of $11, roughly what food cost percentage would you be running if you matched them? About 34 per cent. Matching the competitor's price costs you around four points of margin on every plate.
  - Challenge 3: Find a portion cost and a target that give a price before GST of exactly $40. What does the customer pay? $44. GST goes on top of the price you set, so work the price out first and then add 10 per cent.
```

## Releasing it

1. Tick every box above.
2. In the spec, set each source's `status` to `verified`, and set `"status": "release"`.
3. Build again with `--release`. The build refuses anything still marked as a draft, and the draft banner disappears.

Reviewed by: ______________________  Date: ____________

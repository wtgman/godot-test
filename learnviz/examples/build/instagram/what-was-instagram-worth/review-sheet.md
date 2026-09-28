# What was Instagram worth?

> **Status: draft.** 8 sources still to check.

## 1. Does it do what it is for?

**Intent.** Learners can place an acquisition price in context, and explain why an announced price is not the same as the value paid or the value gained.

**Activity.** Estimate, then compare: the learner guesses hidden values on a chart before they are revealed.

- [ ] Doing this activity would move a learner towards the intent.
- [ ] The language suits the learners who will see it.
- [ ] Nothing in it would surprise or upset a learner without warning.

## 2. Sources

Open each source and confirm it says what the activity says. Then change its status to `verified` in the spec.

| Check | Source | Where it came from | Status | Note |
| --- | --- | --- | --- | --- |
| [ ] | Facebook newsroom, Facebook to acquire Instagram (2012) (https://about.fb.com/news/2012/04/facebook-to-acquire-instagram/) | Found by research. Check it against the original. | **To check** |  |
| [ ] | Forbes, Facebook officially closes Instagram deal (2012) (https://www.forbes.com/sites/tomiogeron/2012/09/06/facebook-officially-closes-instagram-deal/) | Found by research. Check it against the original. | **To check** | Source for the US$715 million closing value. |
| [ ] | Google release on YouTube, via SEC (2006) (https://www.sec.gov/Archives/edgar/data/1288776/000119312506206884/dex991.htm) | Found by research. Check it against the original. | **To check** |  |
| [ ] | CNN Money, Yahoo buys Tumblr (2013) (https://money.cnn.com/2013/05/20/technology/yahoo-buys-tumblr/index.html) | Found by research. Check it against the original. | **To check** |  |
| [ ] | Facebook release on WhatsApp, via SEC (2014) (https://www.sec.gov/Archives/edgar/data/0001326801/000132680114000010/exhibit991_pressrelease219.htm) | Found by research. Check it against the original. | **To check** |  |
| [ ] | Time, WhatsApp deal value at close (2014) (https://time.com/3477028/facebook-whatsapp-19-billion-dollar-deal/) | Found by research. Check it against the original. | **To check** | Source for the roughly US$22 billion closing value. Medium confidence. |
| [ ] | LinkedIn 8-K on the Microsoft deal, via SEC (2016) (https://www.sec.gov/Archives/edgar/data/0001271024/000110465916126712/a16-13234_1ex99d1.htm) | Found by research. Check it against the original. | **To check** |  |
| [ ] | Axios, Tumblr sold to Automattic (2019) (https://www.axios.com/2019/08/13/tumblr-verizon-sale-automattic-wordpress) | Found by research. Check it against the original. | **To check** | The US$3 million figure is reported from unnamed sources, never officially disclosed. |

## 3. Answers

Confirm each answer, and that the reason given is the one you would give.

| Check | Prompt | Answer | Reason |
| --- | --- | --- | --- |
| [ ] | Instagram | US$1bn billion US dollars, announced | Facebook, 2012 |
| [ ] | WhatsApp | US$19bn billion US dollars, announced | Facebook, 2014 |

## 4. Accessibility

Automated checks passed: colour contrast meets WCAG 2.2 AA, nothing is carried by colour alone, and every part of the figure appears in the text version. Every control works from the keyboard, and the page respects reduced motion.

- [ ] Try the activity with the keyboard only: Tab, arrow keys, Enter and Space.
- [ ] Read the text version. It should stand on its own for someone who cannot use the activity.

### Text version

```
What was Instagram worth?
=========================

What this shows: An estimation chart with 5 bars, 2 of them hidden until the learner has guessed.
How it is arranged: How much did Facebook announce it would pay for Instagram in 2012, and for WhatsApp in 2014? Values are in billion US dollars, announced.

Contents:
  - YouTube: US$1.65bn billion US dollars, announced. Google, 2006.
  - Instagram: US$1bn billion US dollars, announced (hidden until the reveal). Facebook, 2012.
  - Tumblr: US$1.1bn billion US dollars, announced. Yahoo, 2013.
  - WhatsApp: US$19bn billion US dollars, announced (hidden until the reveal). Facebook, 2014.
  - LinkedIn: US$26.2bn billion US dollars, announced. Microsoft, 2016.
```

## Releasing it

1. Tick every box above.
2. In the spec, set each source's `status` to `verified`, and set `"status": "release"`.
3. Build again with `--release`. The build refuses anything still marked as a draft, and the draft banner disappears.

Reviewed by: ______________________  Date: ____________

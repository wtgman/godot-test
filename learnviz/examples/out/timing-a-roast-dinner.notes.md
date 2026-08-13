# Timing a roast dinner
**Learning intent.** Learners can work backwards from a serving time to decide when each component of a multi-part meal must start.
Everything has to arrive at the table hot, at the same moment. Work out when each thing goes on.

## Files
- `timing-a-roast-dinner.html`. The interactive itself. One self-contained file, no external requests.
- `timing-a-roast-dinner.canvas.html`. Paste-ready Canvas block, with the iframe and the text version.
- `timing-a-roast-dinner.txt`. Plain text version, for a handout or a transcript.
## Getting it into Canvas
This is an interactive page, so it needs somewhere to live before it can be embedded.

**It will not run from Canvas Files.** Canvas previews uploaded HTML inside a sandboxed iframe that usually withholds the `allow-scripts` permission, so the page loads and then does nothing. This is not a bug you can work around from inside the file.

Pick one of these instead, in order of preference:

1. **An institutional web host.** Anywhere that serves the file as a normal web page. Then paste the `.canvas.html` block and put the address into the iframe `src`. This is the route that gives you the full interactive.
2. **Rebuild it as an H5P activity** through the H5P tool already configured in Canvas. You lose the custom model, you gain gradebook integration.
3. **Ship a video instead.** Build again with `--video` to get a recording of the model running, then upload that to Canvas Studio. The learner cannot change the parameters, but nothing is sandboxed and it plays everywhere, including the mobile apps. Run `learnviz doctor` first: this needs a full ffmpeg, and the cut-down one bundled with the Playwright browsers cannot do it.

The file is entirely self-contained. It loads no fonts, no libraries and no data from anywhere, so it works behind a strict Content Security Policy and offline.
## Accessibility
- **Short alt text** (goes in `alt`): Timing a roast dinner. An interactive scheduling exercise. The learner is asked when each of 6 items should happen, in minutes from start, then.
- **Full alt text** (goes in `data-ally-user-updated-alt`, which is what Ally reports against): An interactive scheduling exercise. The learner is asked when each of 6 items should happen, in minutes from start, then checks their answers against the model timing. A table with one row per item, followed by a time axis. Dinner is served 105 minutes after you start. Enter the minute at which each task should begin. Put the lamb in the oven: model timing 0 minutes from start. A 1.5 kg leg needs 90 minutes at 180C, then 15 minutes resting. That resting time is the reason it goes in first. Parboil the potatoes: model timing 45 minutes from start. Twelve minutes in boiling water, then they need to steam dry before they hit the fat. Start them too early and they collapse. Move potatoes to the oven: model timing 60 minutes from start. Forty five minutes to go crisp. They share the oven with the lamb for its last half hour. Take the lamb out to rest: model timing 90 minutes from start. Resting lets the juices redistribute. Carve straight away and they run out onto the board. Make the gravy: model timing 92 minutes from start. Built in the roasting tin while the meat rests, using the pan juices. It cannot be made before the lamb comes out. Steam the beans: model timing 95 minutes from start. Eight minutes. Green vegetables are the last thing on, because they lose colour and bite within minutes of being cooked.
### Image description, five-part house structure
**Main subject/content**: Timing a roast dinner. An interactive scheduling exercise. The learner is asked when each of 6 items should happen, in minutes from start, then checks their answers against the model timing.
- Put the lamb in the oven: model timing 0 minutes from start. A 1.5 kg leg needs 90 minutes at 180C, then 15 minutes resting. That resting time is the reason it goes in first.
- Parboil the potatoes: model timing 45 minutes from start. Twelve minutes in boiling water, then they need to steam dry before they hit the fat. Start them too early and they collapse.
- Move potatoes to the oven: model timing 60 minutes from start. Forty five minutes to go crisp. They share the oven with the lamb for its last half hour.
- Take the lamb out to rest: model timing 90 minutes from start. Resting lets the juices redistribute. Carve straight away and they run out onto the board.
- Make the gravy: model timing 92 minutes from start. Built in the roasting tin while the meat rests, using the pan juices. It cannot be made before the lamb comes out.
- Steam the beans: model timing 95 minutes from start. Eight minutes. Green vegetables are the last thing on, because they lose colour and bite within minutes of being cooked.
**Important visual details**: Answers are typed into number fields. After checking, each row shows a tick or a cross, the model timing, and the reason for it. A chart plots the learner's answers as hollow circles and the model timings as filled diamonds.
**Relevant structure such as columns, layers, or groupings**: A table with one row per item, followed by a time axis. Dinner is served 105 minutes after you start. Enter the minute at which each task should begin.
**Colours/layout**: Drawn in the RMIT palette on a white background, with navy #000054 text. Accent colours in use: navy, teal, magenta, ochre, blue, rust. No information is carried by colour alone. Every coloured element also carries a number, a label or a texture, so nothing is lost in greyscale or by a learner with colour vision deficiency.
**Visible text**:
- Dinner is served 105 minutes after you start. Enter the minute at which each task should begin.
- minutes from start
- Put the lamb in the oven
- Parboil the potatoes
- Move potatoes to the oven
- Take the lamb out to rest
- Make the gravy
- Steam the beans
### Automated checks
- All checks passed. Colour contrast meets WCAG 2.2 AA, no information is carried by colour alone, and every element in the graphic appears in the text equivalent.
## Text equivalent
```
Timing a roast dinner
=====================

What this shows: An interactive scheduling exercise. The learner is asked when each of 6 items should happen, in minutes from start, then checks their answers against the model timing.
How it is arranged: A table with one row per item, followed by a time axis. Dinner is served 105 minutes after you start. Enter the minute at which each task should begin.

Contents:
  - Put the lamb in the oven: model timing 0 minutes from start. A 1.5 kg leg needs 90 minutes at 180C, then 15 minutes resting. That resting time is the reason it goes in first.
  - Parboil the potatoes: model timing 45 minutes from start. Twelve minutes in boiling water, then they need to steam dry before they hit the fat. Start them too early and they collapse.
  - Move potatoes to the oven: model timing 60 minutes from start. Forty five minutes to go crisp. They share the oven with the lamb for its last half hour.
  - Take the lamb out to rest: model timing 90 minutes from start. Resting lets the juices redistribute. Carve straight away and they run out onto the board.
  - Make the gravy: model timing 92 minutes from start. Built in the roasting tin while the meat rests, using the pan juices. It cannot be made before the lamb comes out.
  - Steam the beans: model timing 95 minutes from start. Eight minutes. Green vegetables are the last thing on, because they lose colour and bite within minutes of being cooked.

Source: Kitchen operations, timing a multi-component service.
```

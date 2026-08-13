# Why the outer planets move so slowly
**Learning intent.** Learners can state Kepler's third law in their own words and predict how an orbital period changes when distance or stellar mass changes.
Drag the star's mass and watch which orbit changes most. The period of every planet follows the same law.

## Files
- `why-the-outer-planets-move-so-slowly.html`. The interactive itself. One self-contained file, no external requests.
- `why-the-outer-planets-move-so-slowly.canvas.html`. Paste-ready Canvas block, with the iframe and the text version.
- `why-the-outer-planets-move-so-slowly.txt`. Plain text version, for a handout or a transcript.
## Getting it into Canvas
This is an interactive page, so it needs somewhere to live before it can be embedded.

**It will not run from Canvas Files.** Canvas previews uploaded HTML inside a sandboxed iframe that usually withholds the `allow-scripts` permission, so the page loads and then does nothing. This is not a bug you can work around from inside the file.

Pick one of these instead, in order of preference:

1. **An institutional web host.** Anywhere that serves the file as a normal web page. Then paste the `.canvas.html` block and put the address into the iframe `src`. This is the route that gives you the full interactive.
2. **Rebuild it as an H5P activity** through the H5P tool already configured in Canvas. You lose the custom model, you gain gradebook integration.
3. **Ship a video instead.** Build again with `--video` to get a recording of the model running, then upload that to Canvas Studio. The learner cannot change the parameters, but nothing is sandboxed and it plays everywhere, including the mobile apps. Run `learnviz doctor` first: this needs a full ffmpeg, and the cut-down one bundled with the Playwright browsers cannot do it.

The file is entirely self-contained. It loads no fonts, no libraries and no data from anywhere, so it works behind a strict Content Security Policy and offline.
## Accessibility
- **Short alt text** (goes in `alt`): Why the outer planets move so slowly. An interactive model of 5 bodies orbiting a central star, with sliders that change the model and a table of.
- **Full alt text** (goes in `data-ally-user-updated-alt`, which is what Ally reports against): An interactive model of 5 bodies orbiting a central star, with sliders that change the model and a table of results underneath. Controls sit above the picture, the picture in the middle, the results table below. Mass of the star, adjustable from 0.2 to 3 solar masses, starting at 1. Mercury: orbits at 0.39 astronomical units. At the starting star mass of 1 solar masses its orbital period is 0.24 years. Venus: orbits at 0.72 astronomical units. At the starting star mass of 1 solar masses its orbital period is 0.61 years. Earth: orbits at 1 astronomical units. At the starting star mass of 1 solar masses its orbital period is 1 years. Mars: orbits at 1.52 astronomical units. At the starting star mass of 1 solar masses its orbital period is 1.87 years. Jupiter: orbits at 5.2 astronomical units. At the starting star mass of 1 solar masses its orbital period is 11.86 years. The relationship being shown: Orbital period follows Kepler's third law: period equals the square root of distance cubed divided by the star's mass. Doubling the distance from the star multiplies the period by about 2.83. Increasing the star's mass shortens every period.
### Image description, five-part house structure
**Main subject/content**: Why the outer planets move so slowly. An interactive model of 5 bodies orbiting a central star, with sliders that change the model and a table of results underneath.
- Mercury: orbits at 0.39 astronomical units. At the starting star mass of 1 solar masses its orbital period is 0.24 years.
- Venus: orbits at 0.72 astronomical units. At the starting star mass of 1 solar masses its orbital period is 0.61 years.
- Earth: orbits at 1 astronomical units. At the starting star mass of 1 solar masses its orbital period is 1 years.
- Mars: orbits at 1.52 astronomical units. At the starting star mass of 1 solar masses its orbital period is 1.87 years.
- Jupiter: orbits at 5.2 astronomical units. At the starting star mass of 1 solar masses its orbital period is 11.86 years.
- The relationship being shown: Orbital period follows Kepler's third law: period equals the square root of distance cubed divided by the star's mass. Doubling the distance from the star multiplies the period by about 2.83. Increasing the star's mass shortens every period.
**Important visual details**: The star is a yellow circle at the centre, drawn larger as its mass increases. Each orbit is a dashed circle. Each planet is a coloured dot labelled with its name. A table lists the orbital period of each body at the current star mass. Orbit spacing uses a square-root scale rather than a linear one, so that the inner planets remain visible alongside the outer ones. The spacing on screen is therefore not proportional to real distance, and the diagram says so. The distances in the table are the real ones.
**Relevant structure such as columns, layers, or groupings**: Controls sit above the picture, the picture in the middle, the results table below. Mass of the star, adjustable from 0.2 to 3 solar masses, starting at 1.
**Colours/layout**: Drawn in the RMIT palette on a white background, with navy #000054 text. Accent colours in use: navy, teal, magenta, ochre, blue, rust. No information is carried by colour alone. Every coloured element also carries a number, a label or a texture, so nothing is lost in greyscale or by a learner with colour vision deficiency.
**Visible text**:
- Star
- Mercury
- Venus
- Earth
- Mars
- Jupiter
- Mass of the star
- Planet
- Distance (AU)
- Orbital period (years)
### Automated checks
- All checks passed. Colour contrast meets WCAG 2.2 AA, no information is carried by colour alone, and every element in the graphic appears in the text equivalent.
## Text equivalent
```
Why the outer planets move so slowly
====================================

What this shows: An interactive model of 5 bodies orbiting a central star, with sliders that change the model and a table of results underneath.
How it is arranged: Controls sit above the picture, the picture in the middle, the results table below. Mass of the star, adjustable from 0.2 to 3 solar masses, starting at 1.

Contents:
  - Mercury: orbits at 0.39 astronomical units. At the starting star mass of 1 solar masses its orbital period is 0.24 years.
  - Venus: orbits at 0.72 astronomical units. At the starting star mass of 1 solar masses its orbital period is 0.61 years.
  - Earth: orbits at 1 astronomical units. At the starting star mass of 1 solar masses its orbital period is 1 years.
  - Mars: orbits at 1.52 astronomical units. At the starting star mass of 1 solar masses its orbital period is 1.87 years.
  - Jupiter: orbits at 5.2 astronomical units. At the starting star mass of 1 solar masses its orbital period is 11.86 years.
  - The relationship being shown: Orbital period follows Kepler's third law: period equals the square root of distance cubed divided by the star's mass. Doubling the distance from the star multiplies the period by about 2.83. Increasing the star's mass shortens every period.

Source: Orbital distances in astronomical units, NASA planetary fact sheet.
```

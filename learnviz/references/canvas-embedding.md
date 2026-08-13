# Getting things into Canvas LMS

Read this before promising anyone an interactive. Most of the effort wasted on
Canvas embedding is spent rediscovering the two constraints at the top of this
file.

---

## The two constraints

### 1. The Rich Content Editor sanitises what you paste

Canvas runs pasted HTML through a sanitiser (the `canvas_sanitize` gem, built on
Ruby's Sanitize) when the page is saved. It is hard-coded, not an administrator
setting, so nobody at your institution can turn it off for you.

**Stripped on save:**

- `<script>` in any form
- every inline event handler: `onclick`, `onload`, `onerror` and the rest
- `javascript:` URLs
- most `<style>` blocks

**Kept:**

- `<iframe>` with an `http` or `https` `src`
- `<details>` and `<summary>`, which is how the image description accordions work without a line of script
- inline `style` attributes on most elements
- `<img>`, tables, lists, headings, `data-` attributes

The practical consequence: **you cannot put behaviour on a Canvas page
directly.** Anything interactive has to live inside an iframe, on a host that
serves it as a real web page.

### 2. An HTML file uploaded to Course Files will not run its JavaScript

This is the one that catches people, because uploading the file appears to work.

Canvas serves user-uploaded HTML through a preview wrapper inside a sandboxed
iframe. That sandbox commonly omits `allow-scripts`. The file loads, the markup
renders, and the console says:

```
Blocked script execution in '<URL>' because the document's frame is sandboxed
and the 'allow-scripts' permission is not set.
```

Related symptoms from the same cause: linked CSS and JS failing with MIME type
errors, and `<iframe src="/courses/1/files/2/download?wrap=1">` rendering a
dead page.

The behaviour varies by Canvas release and by institutional configuration, which
is worse than it simply not working, because it means it can work on the
instructional designer's test course and fail for students.

**Treat Course Files as a place for images, video and documents. Not for
running code.**

---

## The ladder

Work down it. Stop at the first rung that carries the learning.

### Rung 1: A static image

Always works. Accessible. Cached. Prints. Survives every Canvas upgrade. This is
the default and it is what the Emble component library already expects.

1. Upload the `.png` to the course's Files area.
2. Paste the contents of `<name>.canvas.html` into the Canvas HTML editor.
3. Delete the highlighted placeholder line and use **Insert, then Image, then Course Images**. Canvas fills in the file URL and the API endpoint.
4. Check `alt` and `data-ally-user-updated-alt` survived. Canvas sometimes clears them on insert, and both are already written for you in the block.

**Do not paste the `.svg` into the editor.** Canvas strips inline SVG on save.
Upload the PNG. Keep the SVG as the editable original.

### Rung 2: Video

For anything that must move but need not respond: an orbit, a build sequence, a
process running.

Upload to **Canvas Studio** rather than Course Files. Studio transcodes on
upload, so the file plays on every browser and in the mobile apps, and it gives
you captions.

Build a recording of an interactive with `--video`. Run `learnviz doctor` first:
this needs a full ffmpeg, and the cut-down build that ships beside the Playwright
browsers cannot read the rendered frames.

A video still needs its text equivalent on the page. Moving pictures are not
self-describing.

### Rung 3: H5P

The only rung that puts a mark in the gradebook.

Your Canvas already has the H5P tool configured, and the embed is an LTI iframe
of the form:

```
https://rmit.instructure.com/courses/[COURSE ID]/external_tools/retrieve?display=in_rce&resource_link_lookup_uuid=[UUID]
```

**Never write that UUID yourself.** Canvas issues it when the activity is
created. A generated one is a broken embed that looks like a working one.

Choose the activity type from the eight-type taxonomy in
`cove-canvas-page/references/h5p-library.md` and run its answer key
verification. Do not default to Multiple Choice.

The limit is that you get H5P's activity types and nothing else. A custom model
with sliders is not one of them.

### Rung 4: A self-contained page in an iframe

Full freedom, and the only rung that needs somewhere to put a file.

The interactives this toolkit builds are single HTML files that load nothing
from anywhere: no CDN, no font, no data fetch. That matters because a strict
institutional Content Security Policy will block external requests, and because
a course asset that stops working when a CDN moves is not an asset.

Hosting options, best first:

1. **An institutional web server.** RMIT already serves teaching material this way, for example the Learning Lab. Ask where course-adjacent static files belong. Same-institution hosting keeps it inside the privacy and retention arrangements that already cover the course.
2. **A departmental static host or GitHub Pages.** Fine for open material. Check with the course owner first: it puts course content on a third party, outside institutional retention.
3. **An existing LTI tool** that serves arbitrary pages, if your institution runs one.

Then paste `<name>.canvas.html` and put the address into the iframe `src`.

Every iframe needs a `title`. It is what a screen reader announces on landing in
the frame, and Ally flags its absence. The generated block has one.

The interactives post their height to the parent window
(`{ type: 'lv:height', height }`) so a listener can resize the frame. Canvas does
not listen, so the block also sets a sensible `min-height`. Nothing breaks when
nobody is listening.

---

## Choosing a rung

| Question | If yes |
|---|---|
| Does the learner need to change something and see what happens? | Rung 3 or 4 |
| Does it need to be marked? | Rung 3 |
| Does it just need to move? | Rung 2 |
| Anything else | Rung 1 |

When Rung 4 is right but no host is available, build both: the interactive for
whenever hosting is sorted, and a static image plus a retrieval check that works
today. Do not leave a page with a placeholder that never gets filled in.

---

## The other tools people ask about

| Tool | What it gives you | The catch |
|---|---|---|
| **Flourish** | Excellent animated charts and story-driven scrollytelling, embeds as an iframe | Hosted on flourish.studio. Free tier makes visualisations public. Course content leaves the institution, and the embed dies if the account lapses |
| **Datawrapper** | Very good accessible static and interactive charts, strong defaults, iframe embed | Hosted. Same retention question. Excellent for public-facing work |
| **Chart.js** | Free, self-hostable, good for quantitative charts | It is a JavaScript library, so it cannot run on a Canvas page or from Course Files. Only usable inside a Rung 4 page, where this toolkit already draws charts without the dependency |
| **Plotly** | Very capable, scientific charting, 3D | Same JavaScript constraint, plus a large bundle. Worth it only for genuinely scientific plotting |
| **H5P** | Interactive, accessible, marks flow to the gradebook | Fixed set of activity types |

The rule for all of the hosted ones: they are a good answer for a public page
and a question worth asking for course content, because the content leaves the
institution and the embed depends on an account staying alive. If you use one,
still write the text equivalent, because an iframe of a chart is not accessible
by itself.

This toolkit draws its own charts rather than pulling in Chart.js or Plotly for
one reason: the output has to work with no network and no script, which no
charting library can do.

---

## Verifying an embed actually worked

After pasting into Canvas:

1. **Save the page, then reload it.** Sanitising happens on save. What you see before reloading is not what students get.
2. **View it as a student**, not as a teacher. Use Student View.
3. **Check the alt text survived.** Open the HTML editor again and confirm `alt` and `data-ally-user-updated-alt` are still populated.
4. **Open the image description accordion.** It should expand without script.
5. **Open it on a phone.** Canvas is read on phones more than instructional designers expect. Check nothing is cut off and no text is under 12px.
6. **Run Ally** if your institution has it, and clear whatever it flags.

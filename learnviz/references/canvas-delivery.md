# Getting activities into Canvas LMS

Read this before promising anyone an interactive. Most of the effort wasted on
Canvas embedding is spent rediscovering the two constraints at the top of this
file. The routes after them are what the build produces for each learning
object, and every one of them is in the activity's folder.

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
directly.** Anything interactive has to run inside something Canvas launches:
the SCORM player, an LTI tool such as H5P, or an iframe of a page on a real web
host. What survives on the page itself is HTML, inline styles and
`<details>`, which is exactly what `canvas-page.html` is built from.

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

## The routes

Work down the list. Stop at the first one that fits the course and the
institution. Most courses use two: one for students, and presenter view for
class.

### 1. SCORM, through the Canvas SCORM tool

**File:** `<slug>.scorm.zip`

The full activity, running inside Canvas, reporting to the gradebook. This is
the best route when the institution has the SCORM tool switched on. It is an
LTI app that a Canvas administrator enables, so check before promising it.

1. Open **SCORM** in the course navigation. If it is not there, the tool is not
   enabled for the course. Ask the Canvas administrators, or use route 2.
2. Upload the zip.
3. Choose whether to import it as a graded assignment. Graded, it becomes an
   assignment and its score flows to the gradebook.
4. Open it in Student View and complete it once. Check the gradebook.

What Canvas receives, through SCORM 1.2:

- `lesson_status` becomes `incomplete` when the activity opens, then
  `completed`, or `passed` or `failed` when the spec has a `passMark`. It never
  steps backwards when a learner tries again.
- For scored patterns (sort, order, scenario, explore with challenges), a score
  from 0 to 100. The best attempt is kept. Showing a model answer never sends a
  score.
- Unscored patterns (predict, estimate, step-through, cards) send completion
  only.

The package is one SCO: `imsmanifest.xml` and the same `index.html` as the
standalone page, which finds the LMS by looking up its parent frames and
simply runs without one. `passMark` is written into the manifest as
`adlcp:masteryscore`.

University guides for the Canvas SCORM tool, for the steps as each
institution sees them:
[UW-Madison](https://kb.wisc.edu/luwmad/65984),
[University of Melbourne](https://lms.unimelb.edu.au/staff/guides/canvas/editing-and-managing-content/scorm).

Check it in the Canvas Student app before relying on it for learners who study
on their phones.

### 2. A Canvas page

**File:** `canvas-page.html`

Works everywhere, needs nothing enabled, survives the editor, and works in the
mobile app. The price is interactivity: the activity becomes "answer first, then
open the box". Each pattern is rewritten for this rather than stripped down:
a predict asks for a written answer before the reveal accordion, a sort lists
the examples with the answers inside `<details>`, a scenario becomes its
first decision, with each option's consequence behind its own accordion, and an
explore model becomes a worked table with its challenges.

1. Open `canvas-page.html` in a text editor and copy everything.
2. In Canvas, edit the page, switch to the HTML editor, and paste.
3. Delete the highlighted `#fdf223` teacher note once you have read it.
4. Save, reload, and check it as a student.

It is built from Emble components (the title with icon, grey instruction
block, accordion and diagram block), so it matches the rest of an Emble course.

### 3. An embedded web page

**Files:** `index.html` and `canvas-embed.html`

The full activity in an iframe, when the institution can host a web page. No
gradebook, because nothing is launched through Canvas.

Hosting options, best first:

1. **An institutional web server.** RMIT already serves teaching material this
   way, for example the Learning Lab. Ask where course-adjacent static files
   belong. Same-institution hosting keeps it inside the privacy and retention
   arrangements that already cover the course.
2. **A departmental static host or GitHub Pages.** Fine for open material.
   Check with the course owner first: it puts course content on a third party,
   outside institutional retention.

Then paste `canvas-embed.html` and replace the highlighted placeholder with the
page's address. The block gives the iframe a `title` (what a screen reader
announces on entering it) and puts the text version beneath it.

**Never upload `index.html` to Course Files for this.** See constraint 2. It
will load and do nothing.

The page posts its content height to the parent window as
`{ type: 'lv:height', height }`, so a host that listens can size the frame
exactly. Canvas does not listen, so the block also sets a sensible minimum
height.

### 4. In class, from the teacher's computer

**File:** `index.html`, with `#present` on the address

No Canvas at all. Open the file in a browser, add `#present` or use the
Presenter view link at the foot of the page. Text is larger, the page fills the
screen, and the keyboard drives it: arrows to step, R to reveal, Esc to leave.
It needs no network and no login, so it works on a lectern computer with the
file on a USB stick.

### 5. A video, through Canvas Studio

**File:** `animation.mp4`, from `build --video`, for activities that move

For the orbit model, the build can record the animation as video. Upload it to
**Canvas Studio** rather than Course Files: Studio transcodes it, adds
captions, and plays it everywhere including the mobile apps. The learner cannot
change anything, so pair it with a question about what they notice, and keep
the text version on the page.

`build --video` needs a full ffmpeg. The cut-down one beside the Playwright
browsers cannot read the frames. Run `learnviz doctor`. Set `LEARNVIZ_FFMPEG`
to a full ffmpeg, or `npm install ffmpeg-static` in `tools`.

### 6. The figure on its own

**Files:** `figure.png`, `figure.svg`, `figure.canvas.html`

When a static image is all that is needed, or as the fallback that always
works.

1. Upload `figure.png` to the course's Files area.
2. Paste `figure.canvas.html` into the HTML editor.
3. Delete the highlighted placeholder line and use **Insert, then Image, then
   Course Images**. Canvas fills in the file URL and the API endpoint.
4. Check `alt` and `data-ally-user-updated-alt` survived. Both are already
   written in the block.

**Do not paste the SVG into the editor.** Canvas strips inline SVG on save.

### And H5P

H5P, where Canvas has it configured, is the right choice when one of its
standard activity types does the job, because it is already in the course and
reports to the gradebook. Its embed is an LTI iframe of the form:

```
https://rmit.instructure.com/courses/[COURSE ID]/external_tools/retrieve?display=in_rce&resource_link_lookup_uuid=[UUID]
```

**Never write that UUID yourself.** Canvas issues it when the activity is
created. A generated one is a broken embed that looks like a working one. For
choosing an H5P type, use `cove-canvas-page/references/h5p-library.md`. The
patterns here exist for what H5P does not do: a model with sliders, a timing
chart that redraws as you type, a scenario with coaching, a sort with a nudge
before the answer.

---

## Choosing a route

| Question | Route |
|---|---|
| Should it count toward a grade, or be tracked? | 1, SCORM |
| Is the SCORM tool unavailable, or must it work in the mobile app? | 2, Canvas page |
| Is there a web host, and no need for tracking? | 3, embedded page |
| Is it for the front of the room? | 4, presenter view, alongside any other |
| Does it just need to move? | 5, video |
| Is a picture enough? | 6, the figure |

When the best route is not available yet, ship route 2 now and keep the others
for when it is. Do not leave a page with a placeholder that never gets filled
in.

---

## The other tools people ask about

| Tool | What it gives you | The catch |
|---|---|---|
| **Flourish** | Excellent animated charts and story-driven scrollytelling, embeds as an iframe | Hosted on flourish.studio. Free tier makes visualisations public. Course content leaves the institution, and the embed dies if the account lapses |
| **Datawrapper** | Very good accessible static and interactive charts, strong defaults, iframe embed | Hosted. Same retention question. Excellent for public-facing work |
| **Chart.js** | Free, self-hostable, good for quantitative charts | It is a JavaScript library, so it cannot run on a Canvas page or from Course Files. Only usable inside a hosted page or a SCORM package, where this toolkit already draws charts without the dependency |
| **Plotly** | Very capable, scientific charting, 3D | Same JavaScript constraint, plus a large bundle. Worth it only for genuinely scientific plotting |
| **H5P** | Interactive, accessible, marks flow to the gradebook | Fixed set of activity types |

The rule for all of the hosted ones: they are a good answer for a public page
and a question worth asking for course content, because the content leaves the
institution and the embed depends on an account staying alive. If you use one,
still write the text equivalent, because an iframe of a chart is not accessible
by itself.

This toolkit draws its own charts rather than pulling in Chart.js or Plotly for
one reason: the figures have to work with no network and no script, as an image
on a Canvas page, which no charting library can do. The activities load nothing
from anywhere either, so they work offline and behind a strict Content Security
Policy.

---

## Verifying an embed actually worked

After pasting into Canvas:

1. **Save the page, then reload it.** Sanitising happens on save. What you see before reloading is not what students get.
2. **View it as a student**, not as a teacher. Use Student View.
3. **Check the alt text survived.** Open the HTML editor again and confirm `alt` and `data-ally-user-updated-alt` are still populated.
4. **Open the image description accordion.** It should expand without script.
5. **Open it on a phone.** Canvas is read on phones more than instructional designers expect. Check nothing is cut off and no text is under 12px.
6. **Run Ally** if your institution has it, and clear whatever it flags.
7. **For SCORM, complete it in Student View and open the gradebook.** The
   status and score should be there. Then try again with a worse answer and
   check the score did not drop.

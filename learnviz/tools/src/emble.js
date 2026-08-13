/**
 * Canvas embed emitters.
 *
 * Canvas will not run your JavaScript. The Rich Content Editor sanitises the
 * HTML a teacher pastes in and strips `<script>` and every `on*` handler, and
 * HTML files uploaded to Course Files are previewed inside a sandboxed iframe
 * that frequently has no `allow-scripts` permission. So there is a ladder, and
 * the toolkit emits markup for whichever rung the visual actually needs.
 *
 *   Rung 1  Static image (PNG or SVG) uploaded to Course Files.
 *           Always works. Accessible. This is the default and it is what the
 *           RMIT Emble component library already expects.
 *   Rung 2  Video or animation, uploaded to Canvas Studio or Course Files.
 *           Always works. Use for anything that must move but need not respond.
 *   Rung 3  Interactive, as an H5P activity through the existing LTI tool.
 *           Works, and grades flow back. Limited to the H5P activity types.
 *   Rung 4  Interactive, as a self-contained HTML page on a host that serves it
 *           as a real web page, embedded with an `<iframe>`. Full freedom, needs
 *           somewhere to put the file.
 *
 * Everything below emits markup for a specific rung. Nothing here invents a
 * URL, a file id or a course id: where one is needed it emits the house
 * placeholder highlight so a teacher can see exactly what is still to be filled
 * in.
 */

import { esc } from './svg.js';

/** RMIT house colours for placeholders and accents. Not interchangeable. */
const PLACEHOLDER = '#fdf223';

const CANVAS_FILE_URL = '[CANVAS FILE URL]';
const API_ENDPOINT = '[API ENDPOINT]';

/** A span in the teacher's highlight colour, marking something still to do. */
function placeholder(instruction) {
  return `<p><span style="background-color: ${PLACEHOLDER};">${esc(instruction)}</span></p>`;
}

/**
 * Rung 1. The Emble "Diagram with image description" block, component C20.
 *
 * The `<details>` accordion holds the five-part image description. Canvas
 * renders `<details>`/`<summary>` natively, so this needs no script and the
 * description is available to every learner, not only to screen reader users.
 */
export function diagramBlock({ fileUrl, apiEndpoint, a11y, width, height }) {
  const src = fileUrl || CANVAS_FILE_URL;
  const api = apiEndpoint || API_ENDPOINT;

  const imgTag = `<p><img style="display: block; margin-left: auto; margin-right: auto;" src="${esc(src)}" alt="${esc(a11y.shortAlt)}"${width ? ` width="${esc(width)}"` : ''}${height ? ` height="${esc(height)}"` : ''} data-ally-user-updated-alt="${esc(a11y.fullAlt)}" data-api-endpoint="${esc(api)}" data-api-returntype="File" /></p>`;

  const imageOrPlaceholder = fileUrl
    ? imgTag
    : placeholder('Upload the generated image to Course Files, then insert it here so Canvas fills in the file URL. The alt text and the image description below are already written, keep them.');

  const parts = a11y.fivePart.map((part) => {
    const supporting = part.supporting.length
      ? `<ul>${part.supporting.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
      : '';
    const value = part.value ? `: ${esc(part.value)}` : ':';
    return `<li><p><strong>${esc(part.label)}</strong>${value}</p>${supporting}</li>`;
  }).join('');

  return `<div class="customise emble emble-cblock emble-width-control fullwidth-on white emble-cblock-boxshadow" data-context-menu="customise delete" data-customise="color-block-shadow color-block-theme cblock-fullwidth dsc-cblock-border-colour dsc-cblock-border-style" data-emble-version="2.0">
    ${imageOrPlaceholder}
    <details>
        <summary style="cursor: pointer; font-size: 14px; color: #000054; font-family: Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 12px;">Image Description</summary>
        <div style="padding: 12px;">
            <div>
                <ul>${parts}</ul>
            </div>
        </div>
    </details>
</div>
<p class="narrow-p">&nbsp;</p>`;
}

/**
 * Rung 4. An iframe pointing at a self-contained interactive page.
 *
 * `title` is required on every iframe: it is what a screen reader announces
 * when the user lands on the frame, and Ally flags its absence.
 *
 * The interactive is always accompanied by its text equivalent in a `<details>`
 * block, so a learner who cannot use the interaction still gets the content.
 */
export function interactiveBlock({ url, title, height = 620, a11y, fallbackNote }) {
  const src = url || '[PUBLISHED URL OF THE INTERACTIVE]';
  const frame = url
    ? `<p><iframe style="width: 100%; min-height: ${Number(height)}px; border: 1px solid #d5d5dd; border-radius: 6px;" title="${esc(title)}" src="${esc(src)}" height="${Number(height)}" loading="lazy" allowfullscreen="allowfullscreen"></iframe></p>`
    : placeholder('Publish the interactive HTML file to a web host that serves it as a normal web page, then paste its address into the iframe below. Canvas Course Files will not run the JavaScript, see the hosting notes in the build file.');

  const detailBlock = `<details>
    <summary style="cursor: pointer; font-size: 14px; color: #000054; font-family: Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 12px;">Text version of this activity</summary>
    <div style="padding: 12px;">${a11y.textEquivalent.split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}</div>
</details>`;

  return `<div class="customise emble emble-cblock emble-width-control fullwidth-on white emble-cblock-boxshadow" data-context-menu="customise delete" data-customise="color-block-shadow color-block-theme cblock-fullwidth dsc-cblock-border-colour dsc-cblock-border-style" data-emble-version="2.0">
    ${frame}
    ${fallbackNote ? `<p>${esc(fallbackNote)}</p>` : ''}
    ${detailBlock}
</div>
<p class="narrow-p">&nbsp;</p>`;
}

/**
 * Rung 2. A video or animation held in Course Files or Canvas Studio.
 * Emitted as a placeholder by default, because fabricating a Studio media id
 * produces a broken embed and a teacher cannot tell it apart from a real one.
 */
export function animationBlock({ url, title, a11y, poster }) {
  if (!url) {
    return `${placeholder(`Upload ${title} to Canvas Studio, then place the cursor here and use Insert, then Studio Media. Delete this line afterwards.`)}
${diagramBlock({ a11y, fileUrl: poster })}`;
  }
  return `<p><iframe class="lti-embed" style="width: 100%; aspect-ratio: 16 / 9; display: inline-block;" title="${esc(title)}" src="${esc(url)}" loading="lazy" allowfullscreen="allowfullscreen" allow="autoplay *; encrypted-media *; fullscreen *"></iframe></p>`;
}

/**
 * A plain, LMS-neutral embed for anywhere that is not Canvas.
 * Useful when the same visual has to go into a website, Moodle or a slide deck.
 */
export function genericBlock({ fileUrl, a11y }) {
  return `<figure>
  <img src="${esc(fileUrl || '[IMAGE URL]')}" alt="${esc(a11y.shortAlt)}" style="max-width: 100%; height: auto;">
  <figcaption>
    <details>
      <summary>Image description</summary>
      ${a11y.fivePart.map((p) => `<p><strong>${esc(p.label)}</strong>${p.value ? `: ${esc(p.value)}` : ''}</p>${p.supporting.length ? `<ul>${p.supporting.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}`).join('')}
    </details>
  </figcaption>
</figure>`;
}

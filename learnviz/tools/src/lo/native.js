/**
 * The Canvas-native rendition: an activity with no script at all.
 *
 * Canvas strips `<script>` from pages, but it keeps `<details>` and `<summary>`,
 * which is exactly what the RMIT Emble accordion (C12) is. A summary that asks
 * a question and a body that answers it is a working predict-then-check, with
 * no hosting, no upload and no configuration. So every learning object ships a
 * version made only of Emble components, which works in any course on the day
 * it is built.
 *
 * The markup below is copied from the verified Emble component library, not
 * reconstructed from memory, because Emble's editor controls depend on the
 * exact class names and data attributes.
 */

import { esc } from '../svg.js';

const ICON_DATA = 'icon-circle-arrow-down icon-image icon-courses icon-attach-media icon-video icon-edit icon-document icon-pdf icon-audio icon-arrow-end icon-assignment icon-calendar-month icon-chat icon-group icon-flag';

/** Emble spacer, used after every block. */
export const spacer = '<p class="narrow-p">&nbsp;</p>';

/** Emble C24/C25 style title with a small square yellow icon. */
export function titleWithIcon(title, iconClass = 'icon-edit') {
  return `<div class="emble customise title-with-icon" data-customise="icon icon-colour-options" data-context-menu="customise delete">
    <div class="emble-icon small wrap yellow square emble-prevent-insert emble-prevent-delete-recursive emble-content-editable-false" data-icon="${ICON_DATA}" data-emble-version="2.0"><i class="${iconClass}">&nbsp;</i></div>
    <div class="title-with-icon-title">
        <h3>${esc(title)}</h3>
    </div>
</div>
${spacer}`;
}

/** Emble C9 grey callout block. `inner` is trusted HTML built by the caller. */
export function greyBlock(inner) {
  return `<div class="customise emble emble-cblock emble-width-control fullwidth-on grey" data-context-menu="customise delete" data-customise="color-block-shadow color-block-theme cblock-fullwidth dsc-cblock-border-colour dsc-cblock-border-style" data-emble-version="2.0">
    ${inner}
</div>
${spacer}`;
}

/**
 * Emble C12 accordion item. `inner` is trusted HTML built by the caller.
 * Items sit directly against each other; the caller adds one spacer after
 * the last.
 */
export function accordion(heading, inner) {
  return `<details>
    <summary style="cursor: pointer; font-size: 1.4rem; color: #000054; font-family: Helvetica, sans-serif; background-color: #f2f2f2; padding: 10px; margin-bottom: 5px;" aria-expanded="false" aria-label="Toggle details for ${esc(heading)}">${esc(heading)}</summary>
    ${inner}
    <p>&nbsp;</p>
</details>`;
}

/** A paragraph, escaped. */
export const para = (text) => `<p>${esc(text)}</p>`;

/** A bold lead-in paragraph, the house pattern for labelled points. */
export const leadIn = (label, text) => `<p><strong>${esc(label)}</strong> ${esc(text)}</p>`;

/** An unordered list of plain strings. */
export const list = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

/** An ordered list of plain strings. */
export const olist = (items) => `<ol>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`;

/**
 * The standard wrapper every native rendition uses: a titled activity header,
 * the instructions in a grey block, the pattern's own content, and a pointer to
 * the interactive version for teachers who can host it or upload it as SCORM.
 */
/** The note left for the teacher on a pasted page. A course build replaces it with one naming the file. */
export const TEACHER_NOTE = 'For the teacher: a fuller interactive version of this activity is in the build folder, as a SCORM package for the Canvas SCORM tool and as a single web page. Delete this line if you are using only this version.';

export function nativeActivity({ title, iconClass, instructions, content, interactiveNote = true }) {
  const note = interactiveNote
    ? `<p><span style="background-color: #fdf223;">${TEACHER_NOTE}</span></p>
${spacer}`
    : '';
  return [
    titleWithIcon(title, iconClass),
    greyBlock(instructions),
    content,
    note,
  ].join('\n');
}

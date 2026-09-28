/**
 * SCORM 1.2 packaging.
 *
 * This is the route that makes an interactive work in Canvas without anyone
 * hosting anything. Canvas's SCORM tool accepts a zip, runs it as a graded or
 * ungraded assignment, and records the score in the gradebook. It already runs
 * packages from Storyline and Captivate, which are full JavaScript
 * applications, so a single self-contained HTML file runs the same way.
 *
 * SCORM 1.2 rather than 2004 because it is the version every LMS and every
 * SCORM player supports without argument, and the only data this needs to
 * send is a score and a status.
 *
 * The package is two files: the activity and the manifest. The runtime side,
 * finding the LMS API and reporting to it, lives in the page itself (see
 * runtime/client.js), so the same file also works outside an LMS.
 */

import { createHash } from 'node:crypto';
import { zip } from './zip.js';

function xml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** A stable identifier derived from the title, so rebuilds do not churn. */
export function packageId(title) {
  return `LV-${createHash('sha256').update(String(title)).digest('hex').slice(0, 12).toUpperCase()}`;
}

/**
 * The imsmanifest.xml for a single-SCO package.
 *
 * `masteryScore` is on a 0 to 100 scale, as SCORM 1.2 requires. When it is set,
 * the LMS may use it to decide passed or failed; the page also decides this
 * itself and reports the status, which is what Canvas actually reads.
 */
export function manifest({ title, masteryScore }) {
  const id = packageId(title);
  const mastery = Number.isFinite(masteryScore)
    ? `\n        <adlcp:masteryscore>${Math.round(masteryScore)}</adlcp:masteryscore>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${id}-ORG">
    <organization identifier="${id}-ORG">
      <title>${xml(title)}</title>
      <item identifier="${id}-ITEM" identifierref="${id}-RES" isvisible="true">
        <title>${xml(title)}</title>${mastery}
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${id}-RES" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
`;
}

/** Build the package: the activity as index.html, plus the manifest. */
export function scormPackage({ title, html, masteryScore }) {
  return zip([
    { name: 'imsmanifest.xml', data: manifest({ title, masteryScore }) },
    { name: 'index.html', data: html },
  ]);
}

// Writes sample-course.imscc: a small Canvas course export in the Common
// Cartridge 1.1 layout Canvas uses, for trying and testing the course workflow.
//
// The course is invented for these examples. It is not RMIT course material.
//
//   node make-sample-export.mjs

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { zip } from '../../tools/src/delivery/zip.js';
import { canvasId } from '../../tools/src/course/imscc.js';
import { crc32 } from '../../tools/src/png.js';

const COURSE = 'Supporting People Through Grief and Loss';

/* A tiny PNG, so the export carries a real image file. */
function png(w, h, rgb) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(w).fill(rgb).flat())]);
  const raw = Buffer.concat(Array(h).fill(row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const grey = (inner) => `<div class="customise emble emble-cblock emble-width-control fullwidth-on grey" data-emble-version="2.0">${inner}</div>`;

const PAGES = {
  'welcome-to-the-unit': {
    title: 'Welcome to the unit',
    body: `<h2>Welcome</h2>
<p>Welcome to Supporting People Through Grief and Loss. Over the next eight weeks you will learn to recognise how people respond to loss, talk with grieving families on placement, and know when to pass a concern on.</p>
<h3>How this unit runs</h3>
<ul><li>One module every two weeks, each with readings, a short activity and a discussion.</li><li>A weekly drop-in session on Tuesdays at 5.30pm, recorded for anyone who cannot attend.</li><li>Your teacher answers questions in the Q and A discussion within two working days.</li></ul>
<h3>Before you start</h3>
<p>Some of this unit deals with death and loss. If a topic brings up something difficult for you, contact your teacher or the student counselling service. You will not be asked to share personal experiences.</p>`,
  },
  'assessment-overview': {
    title: 'Assessment overview',
    body: `<h2>How you are assessed</h2>
<p>There are three assessment tasks. You must complete all three to be deemed competent.</p>
<table border="1"><thead><tr><th>Task</th><th>What you do</th><th>When</th></tr></thead>
<tbody><tr><td>Task 1: Knowledge questions</td><td>Short written answers on grief responses and your role</td><td>Week 3</td></tr>
<tr><td>Task 2: Case study report</td><td>Plan the support for a family in a written case study</td><td>Week 6</td></tr>
<tr><td>Task 3: Placement observation</td><td>Your supervisor observes a conversation with a family member</td><td>Week 8</td></tr></tbody></table>
<p>Each task is marked satisfactory or not yet satisfactory. You can resubmit a task once.</p>`,
  },
  'what-is-grief': {
    title: 'What is grief?',
    body: `<h2>Grief is a response to loss</h2>
<p>Grief is the set of thoughts, feelings and behaviours that follow a loss. In aged care you will most often meet it in residents who are dying and in the families who visit them. It can begin before a death, when a diagnosis is given.</p>
<h2>The five stages</h2>
<p>In 1969 the psychiatrist Elisabeth K&uuml;bler-Ross described five responses she saw in people facing their own death: denial, anger, bargaining, depression and acceptance. They became known as the five stages of grief.</p>
${grey('<p><strong>Denial.</strong> Not accepting the information itself.</p><p><strong>Anger.</strong> Blame, often aimed at whoever is in the room.</p><p><strong>Bargaining.</strong> If I do this, then that. Or if only.</p><p><strong>Depression.</strong> Withdrawal and loss of meaning.</p><p><strong>Acceptance.</strong> Planning around what is real.</p>')}
<h2>Not a sequence</h2>
<p>The five are often taught as steps that everyone passes through in order. K&uuml;bler-Ross later said this was a misreading. People move between the responses, skip some, and show several at once. Treat them as a vocabulary for what someone might be feeling, not a map of where they should be.</p>
<p><img src="$IMS-CC-FILEBASE$/Uploaded%20Media/corridor-sketch.png" alt="A family member talking with a care worker in a corridor" width="320" height="200"></p>`,
  },
  'recognising-grief-responses': {
    title: 'Recognising grief responses',
    body: `<h2>What each response can sound like</h2>
<p>You will rarely hear someone name what they are feeling. You will hear it in what they say. These are the kinds of things family members say in aged care.</p>
<h3>Denial</h3><p>"The scan must have been someone else's. These things get mixed up all the time."</p>
<h3>Anger</h3><p>"Why did it take three months for anyone to send him for a scan?"</p>
<h3>Bargaining</h3><p>"If I get him walking every day and off the sugar, that will buy him more time, won't it?"</p>
<h3>Depression</h3><p>"I haven't been sleeping. I just sit in his room."</p>
<h3>Acceptance</h3><p>"I want to sit down with the kids this weekend and talk about what he would want."</p>
<h2>Why it matters</h2>
<p>Recognising the response helps you choose what to say. Arguing with denial closes a conversation. Taking anger personally escalates it. Bargaining sounds hopeful, which makes it easy to agree with something you cannot promise.</p>`,
  },
  'talking-with-grieving-families': {
    title: 'Talking with grieving families',
    body: `<h2>Keep the conversation open</h2>
<p>Your job is not to fix grief or to move someone along. It is to listen, stay within your role, and make sure the family knows who can help with what you cannot.</p>
<h3>Things that help</h3>
<ul><li>Naming the feeling: "It sounds like this has been a real shock."</li><li>Asking what they understand before explaining anything.</li><li>Saying what you will do, and doing it.</li></ul>
<h3>Things that shut a conversation down</h3>
<ul><li>"Everything happens for a reason."</li><li>"At least he had a long life."</li><li>"I know exactly how you feel."</li><li>Promising a medical outcome, such as a new test, that is not yours to promise.</li></ul>
<h2>When a family member asks you to do something outside your role</h2>
<p>Acknowledge the request, explain who can help, and pass it on the same day. Tell the family you have done so.</p>`,
  },
  'knowing-your-role': {
    title: 'Knowing your role and when to refer',
    body: `<h2>Your role on placement</h2>
<p>As a student on placement you support residents and families under supervision. You do not give medical information, and you do not provide counselling.</p>
<h2>Passing on a concern</h2>
<p>When a family member says something that worries you, follow these steps.</p>
<ol><li>Listen without interrupting.</li><li>Acknowledge what they have said.</li><li>Tell them you will pass it on, and to whom.</li><li>Tell your supervisor the same shift, in person.</li><li>Record it in the progress notes, as your service requires.</li><li>Check back with the family that someone has followed up.</li></ol>
<h3>Always refer straight away</h3>
<p>Any mention of self-harm, of not wanting to go on, or of a risk to someone else goes to your supervisor immediately, not at the end of the shift.</p>`,
  },
  'looking-after-yourself': {
    title: 'Looking after yourself',
    body: `<h2>Grief work affects workers too</h2>
<p>Spending time with dying residents and grieving families is meaningful work, and it takes something out of you. Noticing that is part of doing the job well.</p>
<h3>Signs to watch for in yourself</h3>
<ul><li>Dreading particular shifts or residents.</li><li>Thinking about work situations when you are trying to rest.</li><li>Feeling numb where you used to feel moved.</li></ul>
<h3>What helps</h3>
<ul><li>Debriefing with your supervisor after a death.</li><li>Keeping routines outside work.</li><li>Using the employee assistance program, which is free and confidential.</li></ul>`,
  },
};

const MODULES = [
  { title: 'Getting started', items: [['page', 'welcome-to-the-unit'], ['page', 'assessment-overview']] },
  { title: 'Understanding grief', items: [['heading', 'Read'], ['page', 'what-is-grief'], ['page', 'recognising-grief-responses'], ['heading', 'Discuss'], ['discussion', 'Share what you noticed']] },
  { title: 'Supporting families', items: [['page', 'talking-with-grieving-families'], ['page', 'knowing-your-role'], ['assignment', 'Task 2: Case study report']] },
  { title: 'Looking after yourself', items: [['page', 'looking-after-yourself']] },
];

const files = [];
const resources = [];
const pageRes = {};
for (const [slug, p] of Object.entries(PAGES)) {
  const id = canvasId(`page:${slug}`);
  pageRes[slug] = id;
  const path = `wiki_content/${slug}.html`;
  files.push({ name: path, data: `<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>${p.title}</title>
<meta name="identifier" content="${id}">
<meta name="editing_roles" content="teachers">
<meta name="workflow_state" content="active">
</head>
<body>
${p.body}
</body>
</html>
` });
  resources.push(`    <resource identifier="${id}" type="webcontent" href="${path}">\n      <file href="${path}"/>\n    </resource>`);
}

const imgPath = 'web_resources/Uploaded Media/corridor-sketch.png';
files.push({ name: imgPath, data: png(32, 20, [214, 214, 230]) });
resources.push(`    <resource identifier="${canvasId('file:corridor')}" type="webcontent" href="${imgPath}">\n      <file href="${imgPath}"/>\n    </resource>`);

const discId = canvasId('discussion:share');
files.push({ name: `${discId}.xml`, data: `<?xml version="1.0" encoding="UTF-8"?>
<topic xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imsdt_v1p1">
  <title>Share what you noticed</title>
  <text texttype="text/html">&lt;p&gt;Which of the five responses did you find hardest to recognise in the examples, and why?&lt;/p&gt;</text>
</topic>
` });
resources.push(`    <resource identifier="${discId}" type="imsdt_xmlv1p1">\n      <file href="${discId}.xml"/>\n    </resource>`);

const asgId = canvasId('assignment:case-study');
files.push({ name: `${asgId}/task-2-case-study-report.html`, data: `<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title>Assignment: Task 2: Case study report</title></head><body><p>Read the case study of the Nguyen family and plan the support you would offer over the first week.</p></body></html>\n` });
files.push({ name: `${asgId}/assignment_settings.xml`, data: `<?xml version="1.0" encoding="UTF-8"?>
<assignment identifier="${asgId}" xmlns="http://canvas.instructure.com/xsd/cccv1p0">
  <title>Task 2: Case study report</title>
  <workflow_state>published</workflow_state>
  <points_possible>0</points_possible>
  <grading_type>pass_fail</grading_type>
  <submission_types>online_upload</submission_types>
</assignment>
` });
resources.push(`    <resource identifier="${asgId}" type="associatedcontent/imscc_xmlv1p1/learning-application-resource" href="${asgId}/task-2-case-study-report.html">\n      <file href="${asgId}/task-2-case-study-report.html"/>\n      <file href="${asgId}/assignment_settings.xml"/>\n    </resource>`);

const typeFor = { page: 'WikiPage', heading: 'ContextModuleSubHeader', discussion: 'DiscussionTopic', assignment: 'Assignment' };
const refFor = (kind, key) => (kind === 'page' ? pageRes[key] : kind === 'discussion' ? discId : kind === 'assignment' ? asgId : null);
const titleFor = (kind, key) => (kind === 'page' ? PAGES[key].title : key);

const orgItems = [];
const metaModules = [];
MODULES.forEach((m, mi) => {
  const modId = canvasId(`module:${mi}`);
  const items = [];
  const metaItems = [];
  m.items.forEach(([kind, key], ii) => {
    const itemId = canvasId(`item:${mi}:${ii}`);
    const ref = refFor(kind, key);
    items.push(ref
      ? `          <item identifier="${itemId}" identifierref="${ref}">\n            <title>${titleFor(kind, key)}</title>\n          </item>`
      : `          <item identifier="${itemId}">\n            <title>${titleFor(kind, key)}</title>\n          </item>`);
    metaItems.push(`      <item identifier="${itemId}">
        <content_type>${typeFor[kind]}</content_type>
        <workflow_state>active</workflow_state>
        <title>${titleFor(kind, key)}</title>${ref ? `\n        <identifierref>${ref}</identifierref>` : ''}
        <position>${ii + 1}</position>
        <new_tab/>
        <indent>0</indent>
        <link_settings_json>null</link_settings_json>
      </item>`);
  });
  orgItems.push(`        <item identifier="${modId}">\n          <title>${m.title}</title>\n${items.join('\n')}\n        </item>`);
  metaModules.push(`  <module identifier="${modId}">
    <title>${m.title}</title>
    <workflow_state>active</workflow_state>
    <position>${mi + 1}</position>
    <require_sequential_progress>false</require_sequential_progress>
    <locked>false</locked>
    <items>
${metaItems.join('\n')}
    </items>
  </module>`);
});

const settingsId = canvasId('course-settings');
const courseId = canvasId('course');
files.push({ name: 'course_settings/canvas_export.txt', data: 'Canvas course export. This sample was generated for learnviz.\n' });
files.push({ name: 'course_settings/course_settings.xml', data: `<?xml version="1.0" encoding="UTF-8"?>
<course identifier="${courseId}" xmlns="http://canvas.instructure.com/xsd/cccv1p0">
  <title>${COURSE}</title>
  <course_code>CHCGRF-SAMPLE</course_code>
  <default_view>modules</default_view>
</course>
` });
files.push({ name: 'course_settings/module_meta.xml', data: `<?xml version="1.0" encoding="UTF-8"?>
<modules xmlns="http://canvas.instructure.com/xsd/cccv1p0">
${metaModules.join('\n')}
</modules>
` });
files.push({ name: 'course_settings/files_meta.xml', data: `<?xml version="1.0" encoding="UTF-8"?>
<fileMeta xmlns="http://canvas.instructure.com/xsd/cccv1p0"/>
` });
resources.unshift(`    <resource identifier="${settingsId}" type="associatedcontent/imscc_xmlv1p1/learning-application-resource" href="course_settings/canvas_export.txt">
      <file href="course_settings/course_settings.xml"/>
      <file href="course_settings/module_meta.xml"/>
      <file href="course_settings/files_meta.xml"/>
      <file href="course_settings/canvas_export.txt"/>
    </resource>`);

const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${canvasId('manifest')}" xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1" xmlns:lom="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource" xmlns:lomimscc="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/manifest" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/profile/cc/ccv1p1/ccv1p1_imscp_v1p2_v1p0.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource http://www.imsglobal.org/profile/cc/ccv1p1/LOM/ccv1p1_lomresource_v1p0.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/manifest http://www.imsglobal.org/profile/cc/ccv1p1/LOM/ccv1p1_lommanifest_v1p0.xsd">
  <metadata>
    <schema>IMS Common Cartridge</schema>
    <schemaversion>1.1.0</schemaversion>
    <lomimscc:lom>
      <lomimscc:general>
        <lomimscc:title>
          <lomimscc:string>${COURSE}</lomimscc:string>
        </lomimscc:title>
      </lomimscc:general>
    </lomimscc:lom>
  </metadata>
  <organizations>
    <organization identifier="org_1" structure="rooted-hierarchy">
      <item identifier="LearningModules">
${orgItems.join('\n')}
      </item>
    </organization>
  </organizations>
  <resources>
${resources.join('\n')}
  </resources>
</manifest>
`;

const out = new URL('./sample-course.imscc', import.meta.url);
writeFileSync(out, zip([{ name: 'imsmanifest.xml', data: manifest }, ...files]));
console.log(`Wrote ${out.pathname}`);

# Prompt packs

For when a visual is needed that this toolkit does not build, or when the work
has to be handed to someone else's tool.

These are templates to fill in and pass on. They exist because the hard part of
getting a usable visual out of a general purpose model is not the asking, it is
supplying the constraints that stop it producing something decorative,
inaccessible, or subtly wrong.

---

## Rule zero, for every pack

Paste the source content in. Do not summarise it first.

A model working from your summary of the content will invent the details your
summary dropped, and it will invent them plausibly. A model working from the
content will not need to.

And in every pack: **if the content does not support the visual, say so rather
than filling the gaps.** Say it in the prompt, because the default behaviour of
every model is to produce something.

---

## Pack 1: Get a spec back for this toolkit

The most useful one. Produces JSON that `learnviz build` can consume.

```
You are preparing a learning visual for a vocational course.

Here is the source content, verbatim:

---
[PASTE THE CONTENT]
---

First, decide what relationship in this content a learner actually has to
hold in their head. Then choose ONE of these types:

  timeline    when things happened, in order
  process     how something is done, first to last
  cycle       something that repeats, no start or end
  gantt       what runs at the same time as what
  comparison  how options differ across shared criteria
  hierarchy   how a whole breaks into parts
  chart       how much, and which way it is moving
  labelled    what the parts of a thing are called

If the content is a set of unrelated facts, or a single idea, reply with
"No visual: [reason]" and stop. Do not force a shape onto it.

Return ONLY a JSON object with these fields:

  type       one of the above
  title      up to 120 characters
  intent     one sentence starting "Learners can ...", describing what they
             will be able to DO. Not what the picture shows.
  subtitle   optional, one line saying what to look for
  source     optional, only if the content names a source. Never invent one

plus the fields for the type you chose. Ask me for the field list if you
do not have it.

Rules:
- Every fact must come from the content above. Invent nothing, especially
  no numbers, dates or citations.
- Fill in the explanatory fields (detail, note, because). They are where
  the teaching happens. A label alone is a caption; a label plus the reason
  is a lesson.
- Australian English. No em dashes, no en dashes, no semicolons. Use "to"
  for ranges.
- Return the JSON and nothing else. No commentary, no code fence.
```

---

## Pack 2: An illustration brief for a designer or an image tool

When a photograph or a drawn illustration is what is actually needed, which is
often. Produces a brief, not an image, because a generated picture of real
equipment is a liability in a course.

```
Write an illustration brief for a vocational course.

Source content:
---
[PASTE THE CONTENT]
---

Return these sections and nothing else:

SUBJECT
  Exactly what is depicted. One unstaged scene, one moment. If a real piece
  of equipment or a real procedure is involved, name it precisely.

WHY IT EARNS ITS PLACE
  What a learner understands from seeing it that they could not get from
  the surrounding text. If you cannot answer this, write "This page does
  not need an illustration" and stop.

COMPOSITION
  What is in frame, where, and what is deliberately excluded.

SHORT ALT TEXT
  One sentence, under 150 characters. Do not begin with "image of".

FULL ALT TEXT
  Everything a learner who cannot see it needs. Two to four sentences.

VISIBLE TEXT
  Every word that will appear in the image. If none, write "None".

CREDIT
  State that a credit line is required once the image is sourced.

Do not describe a generic scene such as "a team in a meeting" or "staff at
computers". Those show nothing and do not count. If the content has no real
physical subject, say so.
```

---

## Pack 3: Turn a visual into a retrieval check

A visual a learner looks at is worth much less than one they have to use.

```
Here is a learning visual, described in full:

---
[PASTE THE CONTENTS OF THE .txt TEXT EQUIVALENT]
---

Write three questions that CANNOT be answered without reading this visual.

A question fails if it can be answered from general knowledge, from the
surrounding page text, or by restating the title. Test each one: if a
learner who never saw the visual could answer it, replace it.

Favour questions that require:
  - reading two elements against each other ("what is already underway when X starts?")
  - noticing something the visual makes obvious and prose does not
  - applying the relationship to a case that is not shown

For each question give the answer and one sentence on what a wrong answer
tells the teacher about the learner's misunderstanding.

Australian English. No em dashes, no en dashes, no semicolons.
```

---

## Pack 4: Audit an existing visual

For visuals already in a course.

```
Audit this visual against the standards below. Be specific, and point at
the thing that fails rather than describing the standard.

[ATTACH OR DESCRIBE THE VISUAL, AND PASTE ITS CURRENT ALT TEXT]

Check:
1. Does anything rely on colour alone? Name each element.
2. Does the alt text carry the same information as the graphic?
3. Does a bar chart axis start at zero? If not, is the truncation flagged?
4. Is every word appearing in the graphic listed in the description?
5. Is any text below 12px at display size?
6. Does the visual show a relationship, or is it decorative?
7. Is there a retrieval question anywhere near it?

Return a table: Issue, Severity (blocks a learner / degrades / cosmetic),
and the specific fix. If something passes, say so in one line rather than
padding it out.
```

---

## Pack 5: Extract structure from a messy document

For when content arrives as a wall of prose and you cannot see the shape.

```
Here is course content:
---
[PASTE]
---

Do not write a visual yet. Answer these four questions only:

1. What relationships are in here? List each as "X relates to Y by Z".
   Examples: "steps relate to each other by order", "options relate to each
   other by cost and time", "events relate to each other by date".

2. Which single relationship is the one a learner most needs to hold in
   their head to do the work this content is preparing them for?

3. Is that relationship SEQUENTIAL (one after another), CONCURRENT (things
   overlap), COMPARATIVE (options against criteria), HIERARCHICAL (parts of
   a whole), QUANTITATIVE (amounts), or CYCLICAL (it repeats)?

4. Is this something the learner needs to KNOW, or something they need to
   be ABLE TO WORK OUT? Say which, and why.

Answer in under 200 words total. Do not propose a diagram.
```

Question 3 maps onto the visual types. Question 4 decides static versus
interactive: know means show it, be able to work out means make them predict it.

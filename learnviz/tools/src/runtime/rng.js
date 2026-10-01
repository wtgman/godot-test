/**
 * Seeded randomness, for shuffles that are the same on every build.
 *
 * Activities present items in a shuffled order, because the order they were
 * written in is usually the answer. But a build must be reproducible, so the
 * shuffle is seeded from the activity's title: the same spec always produces
 * the same file, and a reviewer sees the same order the students will.
 */

/** FNV-1a, 32 bit. Enough to spread short strings across seeds. */
export function hashString(s) {
  let h = 0x811c9dc5;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32. Small, fast, and good enough for shuffling a list of cards. */
export function seeded(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * How much of the right order a shuffle gives away: items already in their
 * place, plus neighbours still next to each other in the right order. A list
 * with the first item moved to the end scores high, though it is "shuffled".
 */
export function orderKept(idx) {
  let kept = 0;
  for (let i = 0; i < idx.length; i += 1) {
    if (idx[i] === i) kept += 1;
    if (i > 0 && idx[i] === idx[i - 1] + 1) kept += 1;
  }
  return kept;
}

function fisherYates(n, rand) {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/**
 * Fisher-Yates with a seeded generator. Returns a new array of indices.
 *
 * With `notIdentity`, for a list whose order is the answer, the result is
 * never the original order and gives away as little of it as it can: of a
 * run of shuffles from the same seed, the first that keeps the least of the
 * right order (see orderKept). Handing a learner the list in order, or one
 * move from it, would make the task meaningless. With fewer than two items
 * this is impossible and the identity is returned.
 */
export function shuffleIndices(n, seedText, { notIdentity = false } = {}) {
  const rand = seeded(hashString(seedText));
  let idx = fisherYates(n, rand);
  if (notIdentity && n > 1) {
    let best = idx.every((v, i) => v === i) ? null : idx;
    for (let tries = 0; tries < 64 && !(best && orderKept(best) === 0); tries += 1) {
      const next = fisherYates(n, rand);
      if (next.every((v, i) => v === i)) continue;
      if (!best || orderKept(next) < orderKept(best)) best = next;
    }
    // Rotate by one if every try came back in order: deterministic, and never
    // the identity for n > 1.
    idx = best || [...idx.slice(1), idx[0]];
  }
  return idx;
}

export function shuffle(list, seedText, opts) {
  return shuffleIndices(list.length, seedText, opts).map((i) => list[i]);
}

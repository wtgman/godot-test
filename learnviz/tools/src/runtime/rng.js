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
 * Fisher-Yates with a seeded generator. Returns a new array of indices.
 *
 * With `notIdentity`, the result is guaranteed not to be the original order,
 * which matters for an ordering activity: handing a learner the list already
 * in the right order would make the task meaningless. Where every item is
 * identical in position terms (fewer than two items) this is impossible and
 * the identity is returned.
 */
export function shuffleIndices(n, seedText, { notIdentity = false } = {}) {
  const rand = seeded(hashString(seedText));
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (notIdentity && n > 1 && idx.every((v, i) => v === i)) {
    // Rotate by one: deterministic, and never the identity for n > 1.
    idx.push(idx.shift());
  }
  return idx;
}

export function shuffle(list, seedText, opts) {
  return shuffleIndices(list.length, seedText, opts).map((i) => list[i]);
}

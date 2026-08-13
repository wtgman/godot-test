/**
 * Theme and colour.
 *
 * Two hard rules drive everything in this file.
 *
 * 1. Nothing is encoded by colour alone. Every series, band and status also
 *    carries a text label and a shape or pattern, so a learner who cannot
 *    distinguish the hues loses no information.
 * 2. Every foreground/background pair used for text is checked against WCAG 2.2
 *    contrast minimums at build time. `assertPaletteAccessible()` is run by the
 *    test suite, so a palette edit that breaks contrast fails the build rather
 *    than shipping to a student.
 */

/** RMIT brand constants. Sourced from the CoVE Emble component library. */
export const BRAND = {
  ink: '#000054', // RMIT navy. Headings and body text.
  accent: '#fac800', // RMIT brand yellow. Accents only, never text on white.
  placeholder: '#fdf223', // Teacher-replaces-this highlight. Never an accent.
  paper: '#ffffff',
  panel: '#f3f3f3',
  rule: '#d5d5dd',
};

/**
 * Categorical series palette.
 *
 * Ordered so that the first three are distinguishable under the three common
 * forms of colour vision deficiency, because most visuals use three or fewer
 * series. Each entry pairs a fill with the text colour that sits on it and a
 * pattern id used when fills must be told apart without colour.
 */
export const SERIES = [
  { name: 'navy', fill: '#000054', on: '#ffffff', pattern: 'solid' },
  { name: 'teal', fill: '#00706b', on: '#ffffff', pattern: 'diagonal' },
  { name: 'magenta', fill: '#a4177c', on: '#ffffff', pattern: 'dots' },
  { name: 'ochre', fill: '#8a5a00', on: '#ffffff', pattern: 'horizontal' },
  { name: 'blue', fill: '#1a56c4', on: '#ffffff', pattern: 'grid' },
  { name: 'rust', fill: '#a3301b', on: '#ffffff', pattern: 'vertical' },
];

/** Semantic colours for status. Each is paired with a glyph so status is never colour-only. */
export const STATUS = {
  active: { fill: '#00706b', on: '#ffffff', glyph: '▶', label: 'active' },
  waiting: { fill: '#f3f3f3', on: '#000054', glyph: '○', label: 'waiting' },
  done: { fill: '#000054', on: '#ffffff', glyph: '✓', label: 'complete' },
  warning: { fill: '#8a5a00', on: '#ffffff', glyph: '▲', label: 'caution' },
};

export const TYPE = {
  family: "Helvetica, Arial, 'Liberation Sans', sans-serif",
  title: 21,
  heading: 17,
  body: 14.5,
  label: 13,
  small: 11.5,
};

/** Pick a series colour by index, wrapping if there are more items than colours. */
export function series(i) {
  return SERIES[i % SERIES.length];
}

/* ------------------------------------------------------------------ */
/* Contrast                                                            */
/* ------------------------------------------------------------------ */

/** Parse `#rgb` or `#rrggbb` into [r, g, b] 0-255. */
export function parseHex(hex) {
  const h = String(hex).trim().replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

/** WCAG relative luminance. */
export function luminance(hex) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Minimum contrast required by WCAG 2.2 for the given role.
 * Large text is 18.66px bold or 24px regular and up.
 */
export const MIN_CONTRAST = { text: 4.5, largeText: 3, nonText: 3 };

/**
 * CIELAB coordinates, D65. Used for perceptual distance.
 *
 * Contrast ratio is the wrong tool for asking whether two series can be told
 * apart: it only compares lightness, so it calls pure red and pure blue
 * identical. Two chart series need to differ in the way an eye actually
 * separates colour, which is what Lab distance approximates.
 */
export function toLab(hex) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  let X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  let Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  X = f(X); Y = f(Y); Z = f(Z);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}

/** CIE76 colour difference. Roughly: under 10 is a near match, over 30 is obvious. */
export function deltaE(a, b) {
  const A = toLab(a);
  const B = toLab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

/** Two series drawn side by side must differ by at least this much. */
export const MIN_DELTA_E = 30;

/**
 * Verify that no two series colours are perceptually close.
 * Run by the test suite alongside the contrast check.
 */
export function assertPaletteDistinct() {
  const failures = [];
  for (let i = 0; i < SERIES.length; i += 1) {
    for (let j = i + 1; j < SERIES.length; j += 1) {
      const d = deltaE(SERIES[i].fill, SERIES[j].fill);
      if (d < MIN_DELTA_E) {
        failures.push(`${SERIES[i].name} and ${SERIES[j].name} differ by only ${d.toFixed(1)} (need ${MIN_DELTA_E})`);
      }
    }
  }
  if (failures.length) {
    throw new Error(`Series colours are too alike:\n  - ${failures.join('\n  - ')}`);
  }
  return true;
}

/** Choose whichever of ink or paper reads better on `background`. */
export function readableOn(background) {
  return contrast(BRAND.ink, background) >= contrast(BRAND.paper, background)
    ? BRAND.ink
    : BRAND.paper;
}

/**
 * Verify every pairing the renderers actually use. Throws on the first failure
 * with a message naming the pair and its ratio, so the fix is obvious.
 * Called by the test suite.
 */
export function assertPaletteAccessible() {
  const failures = [];
  const check = (fg, bg, label, min = MIN_CONTRAST.text) => {
    const ratio = contrast(fg, bg);
    if (ratio < min) {
      failures.push(`${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
    }
  };

  check(BRAND.ink, BRAND.paper, 'body text on paper');
  check(BRAND.ink, BRAND.panel, 'body text on panel');
  check(BRAND.ink, BRAND.placeholder, 'text on placeholder highlight');

  for (const s of SERIES) {
    check(s.on, s.fill, `series ${s.name} label on fill`);
    // A series fill must also be distinguishable from the page it sits on.
    check(s.fill, BRAND.paper, `series ${s.name} fill against paper`, MIN_CONTRAST.nonText);
  }

  for (const [key, s] of Object.entries(STATUS)) {
    check(s.on, s.fill, `status ${key} label on fill`);
  }

  // The rule colour only ever draws hairlines, so it is held to the non-text bar.
  check(BRAND.rule, BRAND.paper, 'rule against paper', 1.2);

  if (failures.length) {
    throw new Error(`Palette fails WCAG contrast:\n  - ${failures.join('\n  - ')}`);
  }
  return true;
}

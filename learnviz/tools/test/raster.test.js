/**
 * Regression tests for two bugs that both produced plausible-looking but wrong
 * output, which is the worst kind to ship into a course.
 *
 * 1. Headless Chromium paints roughly 95 CSS pixels less than the window height
 *    it is given, but still writes a PNG at the full window size. Asking for
 *    exactly the drawing height silently blanked everything below about 660
 *    pixels. Most visuals here are taller than that.
 * 2. `(longest + pad) - pad` does not always return `longest` in floating
 *    point, so the single longest label in a schedule failed its own width
 *    budget and had an ellipsis put through it.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { validate } from '../src/spec.js';
import { render } from '../src/renderers/index.js';
import { cropToHeight, dimensions } from '../src/png.js';
import { svgToPng, findChromium } from '../src/raster.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** A timeline deliberately taller than the Chromium paint cap. */
function tallSpec() {
  return validate({
    type: 'timeline',
    title: 'A deliberately long timeline',
    intent: 'Exercises the rasteriser past the height at which Chromium stops painting.',
    events: Array.from({ length: 10 }, (_, i) => ({
      date: `20${10 + i}`,
      label: `Event number ${i + 1}`,
      detail: 'A sentence of explanation, long enough to take up a line of its own.',
    })),
    source: 'A source line, which is the very last thing drawn on the image.',
  });
}

describe('rasterising', () => {
  test('a visual taller than the paint cap keeps its full height', async (t) => {
    if (!findChromium()) return t.skip('no Chromium available');

    const { svg, width, height } = render(tallSpec());
    assert.ok(height > 700, 'the fixture must exceed the paint cap or this proves nothing');

    const png = await svgToPng(svg, { width, height, scale: 2 });
    const dim = dimensions(png);

    assert.equal(dim.width, Math.ceil(width * 2));
    assert.equal(dim.height, Math.ceil(height * 2));
  });

  test('the bottom of a tall visual is actually painted, not left blank', async (t) => {
    if (!findChromium()) return t.skip('no Chromium available');

    const { svg, width, height } = render(tallSpec());
    const png = await svgToPng(svg, { width, height, scale: 2 });
    const dim = dimensions(png);

    // The source line sits in the last stretch of the drawing. If Chromium
    // stopped painting early, this band comes back pure white.
    const band = bottomBandDarkness(png, 0.10);
    assert.ok(band > 0, 'the bottom tenth of the image is blank, so content was lost');
  });
});

describe('png cropping', () => {
  test('produces a valid, shorter PNG', () => {
    const png = solidPng(40, 60);
    const cropped = cropToHeight(png, 25);
    const dim = dimensions(cropped);

    assert.ok(cropped.subarray(0, 8).equals(PNG_SIGNATURE));
    assert.equal(dim.height, 25);
    assert.equal(dim.width, 40);
    assert.equal(cropped.subarray(-8, -4).toString('ascii'), 'IEND');
  });

  test('cropping to the existing height returns the input untouched', () => {
    const png = solidPng(20, 20);
    assert.equal(cropToHeight(png, 20), png);
  });

  test('a taller request is clamped rather than inventing rows', () => {
    const png = solidPng(20, 20);
    assert.equal(dimensions(cropToHeight(png, 500)).height, 20);
  });

  test('the surviving rows still decode to the original pixels', () => {
    // Truncating the filtered stream is only valid because a PNG filter refers
    // to at most the row above it. This checks that assumption holds.
    const png = gradientPng(8, 12);
    const cropped = cropToHeight(png, 5);
    const original = decode(png);
    const short = decode(cropped);

    assert.equal(short.height, 5);
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 8 * 3; x += 1) {
        assert.equal(
          short.pixels[y * 8 * 3 + x],
          original.pixels[y * 8 * 3 + x],
          `pixel mismatch at row ${y}, byte ${x}`,
        );
      }
    }
  });

  test('rejects a file that is not a PNG', () => {
    assert.throws(() => cropToHeight(Buffer.from('not a png at all'), 5), /Not a PNG/);
  });
});

/* ------------------------------------------------------------------ */
/* Helpers. A tiny PNG encoder and decoder, so the tests do not depend  */
/* on the code they are testing to build their own fixtures.            */
/* ------------------------------------------------------------------ */

import { deflateSync, inflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

/** An RGB PNG built from a per-pixel callback, using varied row filters. */
function buildPng(width, height, pixel, filterFor = () => 0) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(stride);
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixel(x, y);
      row[x * 3] = r; row[x * 3 + 1] = g; row[x * 3 + 2] = b;
    }
    const filter = filterFor(y);
    const base = y * (stride + 1);
    raw[base] = filter;
    for (let i = 0; i < stride; i += 1) {
      const a = i >= 3 ? row[i - 3] : 0;
      const up = prev[i];
      let value = row[i];
      if (filter === 1) value = (row[i] - a) & 0xff;
      else if (filter === 2) value = (row[i] - up) & 0xff;
      raw[base + 1 + i] = value;
    }
    prev = row;
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const solidPng = (w, h) => buildPng(w, h, () => [200, 100, 50]);

/** Uses Sub and Up filters as well as None, so the crop is genuinely exercised. */
const gradientPng = (w, h) =>
  buildPng(w, h, (x, y) => [(x * 20) & 0xff, (y * 15) & 0xff, ((x + y) * 7) & 0xff], (y) => y % 3);

function decode(buf) {
  let i = 8;
  let idat = Buffer.alloc(0);
  let width = 0;
  let height = 0;
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(i + 8);
      height = buf.readUInt32BE(i + 12);
    } else if (type === 'IDAT') {
      idat = Buffer.concat([idat, buf.subarray(i + 8, i + 8 + len)]);
    }
    i += 12 + len;
  }

  const stride = width * 3;
  const raw = inflateSync(idat);
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x += 1) {
      const a = x >= 3 ? line[x - 3] : 0;
      const b = prev[x];
      if (filter === 1) line[x] = (line[x] + a) & 0xff;
      else if (filter === 2) line[x] = (line[x] + b) & 0xff;
      else if (filter === 3) line[x] = (line[x] + ((a + b) >> 1)) & 0xff;
    }
    line.copy(out, y * stride);
    prev = line;
  }

  return { width, height, pixels: out };
}

/** Fraction of pixels in the bottom `portion` of the image that are not white. */
function bottomBandDarkness(png, portion) {
  const { width, height, pixels } = decode(png);
  const from = Math.floor(height * (1 - portion));
  let dark = 0;
  for (let y = from; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 3] < 200) dark += 1;
    }
  }
  return dark;
}

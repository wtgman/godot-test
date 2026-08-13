/**
 * Minimal PNG surgery, with no dependencies.
 *
 * Why this exists: headless Chromium paints only about 95 CSS pixels less than
 * the window height it was given, but still writes a PNG at the full window
 * size. Ask for a window exactly as tall as the drawing and everything below
 * roughly 660 pixels comes out blank white, silently. Almost every visual this
 * toolkit produces is taller than that, so the failure would have shipped
 * truncated diagrams that still looked plausible.
 *
 * The fix is to ask for a window taller than the drawing, then crop the surplus
 * off the bottom. Cropping is cheap because of how PNG works: each row is
 * filtered independently and a filter only ever refers to the row above it, so
 * truncating the decompressed stream at a row boundary yields a valid, shorter
 * image. No unfiltering, no re-encoding of pixel data, no image library.
 */

import { inflateSync, deflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** CRC-32, as PNG specifies it. */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Split a PNG into its chunks. */
function readChunks(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('Not a PNG file.');
  }
  const chunks = [];
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += 12 + length;
  }
  return chunks;
}

function chunkBuffer(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crc]);
}

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** Width, height, bit depth and colour type of a PNG. */
export function dimensions(buf) {
  const ihdr = readChunks(buf).find((c) => c.type === 'IHDR');
  if (!ihdr) throw new Error('PNG has no IHDR chunk.');
  return {
    width: ihdr.data.readUInt32BE(0),
    height: ihdr.data.readUInt32BE(4),
    bitDepth: ihdr.data[8],
    colourType: ihdr.data[9],
  };
}

/**
 * Return a copy of `buf` keeping only the top `newHeight` rows.
 *
 * Returns the input unchanged when it is already the right height or shorter.
 * Throws on interlaced images, which cannot be truncated this way; Chromium
 * never produces them, and failing loudly beats writing a scrambled file.
 */
export function cropToHeight(buf, newHeight) {
  const chunks = readChunks(buf);
  const ihdr = chunks.find((c) => c.type === 'IHDR');
  if (!ihdr) throw new Error('PNG has no IHDR chunk.');

  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const bitDepth = ihdr.data[8];
  const colourType = ihdr.data[9];
  const interlace = ihdr.data[12];

  const target = Math.max(1, Math.min(Math.round(newHeight), height));
  if (target === height) return buf;
  if (interlace !== 0) throw new Error('Cannot crop an interlaced PNG.');

  const channels = CHANNELS[colourType];
  if (!channels) throw new Error(`Unsupported PNG colour type ${colourType}.`);

  // Bytes per row, plus the one leading byte that names the row's filter.
  const bitsPerPixel = channels * bitDepth;
  const rowBytes = Math.ceil((width * bitsPerPixel) / 8);
  const stride = rowBytes + 1;

  const raw = inflateSync(Buffer.concat(
    chunks.filter((c) => c.type === 'IDAT').map((c) => c.data),
  ));

  // A row's filter only ever references the row above, so cutting at a row
  // boundary leaves every remaining row decodable exactly as before.
  const kept = raw.subarray(0, target * stride);

  const newIhdr = Buffer.from(ihdr.data);
  newIhdr.writeUInt32BE(target, 4);

  const out = [SIGNATURE, chunkBuffer('IHDR', newIhdr)];
  for (const chunk of chunks) {
    // Drop the old pixel data and anything that describes the old size.
    if (chunk.type === 'IHDR' || chunk.type === 'IDAT' || chunk.type === 'IEND') continue;
    out.push(chunkBuffer(chunk.type, chunk.data));
  }
  out.push(chunkBuffer('IDAT', deflateSync(kept, { level: 9 })));
  out.push(chunkBuffer('IEND', Buffer.alloc(0)));

  return Buffer.concat(out);
}

/**
 * A minimal, deterministic zip writer.
 *
 * SCORM packages are zip files. Rather than pull in a dependency for one
 * format, this writes the handful of structures the format needs: a local
 * header per file, the compressed bytes, a central directory, and the end
 * record. Compression is raw deflate from Node's built-in zlib.
 *
 * Every timestamp is fixed at 1 January 1980, the earliest date the format can
 * express, so the same inputs always produce byte-identical output. A package
 * that changes every time it is rebuilt cannot be diffed or reviewed.
 */

import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { crc32 } from '../png.js';

const DOS_TIME = 0; // 00:00:00
const DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01

/**
 * @param {{ name: string, data: Buffer | string }[]} entries
 * @param {{ store?: boolean }} [options] store: never compress. Canvas course
 *   imports are known to fail silently on rebuilt packages that are deflated.
 * @returns {Buffer}
 */
export function zip(entries, { store = false } = {}) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.name)) throw new Error(`Duplicate zip entry: ${entry.name}`);
    if (entry.name.startsWith('/') || entry.name.includes('..')) {
      throw new Error(`Unsafe zip entry name: ${entry.name}`);
    }
    seen.add(entry.name);

    const name = Buffer.from(entry.name, 'utf8');
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const deflated = store ? null : deflateRawSync(raw, { level: 9 });
    // Store instead of deflate when compression does not help, which is the
    // rule every unzip tool expects to cope with.
    const stored = store || deflated.length >= raw.length;
    const body = stored ? raw : deflated;
    const method = stored ? 0 : 8;
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // flags: UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + body.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, directory, end]);
}

/**
 * Read a zip into { name, data } entries, in the order of its central
 * directory. Handles stored and deflated entries, which covers what Canvas and
 * every common tool writes. Refuses Zip64 and encryption with a clear message
 * rather than returning garbage.
 */
export function unzip(buf) {
  const sig = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const eocd = buf.lastIndexOf(sig);
  if (eocd < 0) throw new Error('This is not a zip file. A Canvas export ends in .imscc and is a zip.');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (count === 0xffff || p === 0xffffffff) throw new Error('This zip uses Zip64, for archives over 4 GB. Export the course without its largest files, or unzip it first.');
  const out = [];
  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('The zip directory is damaged.');
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extra = buf.readUInt16LE(p + 30);
    const comment = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString(flags & 0x0800 ? 'utf8' : 'latin1', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extra + comment;
    if (flags & 0x1) throw new Error(`${name} is encrypted.`);
    if (name.endsWith('/')) continue;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const body = buf.subarray(start, start + size);
    let data;
    if (method === 0) data = Buffer.from(body);
    else if (method === 8) data = inflateRawSync(body);
    else throw new Error(`${name} uses compression method ${method}, which is not supported.`);
    out.push({ name, data });
  }
  return out;
}

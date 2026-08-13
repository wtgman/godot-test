/**
 * Rasterising and encoding.
 *
 * Canvas needs a PNG for the reliable embed path, and a video for anything that
 * moves. Both use tools already on the machine: a Chromium binary, and ffmpeg.
 *
 * Every function here degrades honestly and early. If Chromium is missing,
 * `svgToPng` says so and the caller still gets its SVG. If ffmpeg cannot
 * actually ingest frames, `videoFormat` reports that before a single frame is
 * rendered, rather than failing at the encode step ninety screenshots later.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

import { cropToHeight, dimensions } from './png.js';

// `require` is not defined in an ES module, and ffmpeg capability detection
// needs a synchronous child process call.
const require_ = createRequire(import.meta.url);

/** Locate a Chromium binary, preferring the Playwright-managed one. */
export function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const candidates = [
    join(root, 'chromium/chrome-linux/chrome'),
    join(root, 'chromium', 'chrome-linux', 'headless_shell'),
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ];

  // Playwright installs into versioned directories, so glob those too.
  if (existsSync(root)) {
    try {
      for (const entry of readdirSync(root)) {
        if (entry.startsWith('chromium')) {
          candidates.push(join(root, entry, 'chrome-linux', 'chrome'));
          candidates.push(join(root, entry, 'chrome-linux', 'headless_shell'));
        }
      }
    } catch {
      // Fall through to the fixed candidates.
    }
  }

  return candidates.find((p) => existsSync(p)) || null;
}

/** Locate ffmpeg. Playwright ships one; the system one is used if present. */
export function findFfmpeg() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const candidates = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
  if (existsSync(root)) {
    try {
      for (const entry of readdirSync(root)) {
        if (entry.startsWith('ffmpeg')) {
          candidates.unshift(join(root, entry, 'ffmpeg-linux'));
          candidates.unshift(join(root, entry, 'ffmpeg'));
        }
      }
    } catch {
      // Fall through.
    }
  }
  return candidates.find((p) => existsSync(p)) || null;
}

function run(cmd, args, { timeout = 90_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${cmd} timed out after ${timeout}ms`));
    }, timeout);
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stderr);
      else reject(new Error(`${cmd} exited ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

const CHROME_FLAGS = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--disable-lcd-text',
  '--force-color-profile=srgb',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=2500',
];

/**
 * Render an SVG string to a PNG buffer.
 *
 * The SVG goes into a minimal HTML shell sized to exactly the drawing, because
 * screenshotting an SVG file directly leaves Chromium to guess the viewport and
 * it guesses differently across versions.
 *
 * `scale` of 2 produces a file that stays sharp on a high-density screen, which
 * is what most students are reading Canvas on.
 */
export async function svgToPng(svg, { width, height, scale = 2 } = {}) {
  const chrome = findChromium();
  if (!chrome) {
    throw new Error('No Chromium found, so PNG cannot be produced. The SVG is still written and can be converted anywhere else.');
  }

  const dir = await mkdtemp(join(tmpdir(), 'learnviz-'));
  try {
    const html = `<!doctype html><meta charset="utf-8"><style>
      html,body{margin:0;padding:0;background:#fff}
      svg{display:block}
    </style>${svg}`;
    const htmlPath = join(dir, 'page.html');
    const pngPath = join(dir, 'out.png');
    await writeFile(htmlPath, html, 'utf8');

    // Headless Chromium paints roughly 95 CSS pixels less than the window
    // height it is given, but writes the PNG at the full window size. Ask for
    // exactly the drawing height and everything past about 660 pixels comes out
    // blank, with no error. So ask for generous headroom and crop it back.
    // See src/png.js for why cropping is cheap.
    const headroom = 160;
    await run(chrome, [
      ...CHROME_FLAGS,
      `--force-device-scale-factor=${scale}`,
      `--window-size=${Math.ceil(width)},${Math.ceil(height) + headroom}`,
      `--screenshot=${pngPath}`,
      `file://${htmlPath}`,
    ]);

    const shot = await readFile(pngPath);
    const cropped = cropToHeight(shot, Math.ceil(height * scale));

    // A blank strip at the bottom means the paint cap moved and the headroom is
    // no longer enough. Better to say so than to ship a truncated diagram.
    const actual = dimensions(cropped);
    if (actual.height < Math.ceil(height * scale)) {
      throw new Error(`Chromium returned ${actual.height} pixel rows but the drawing needs ${Math.ceil(height * scale)}. Increase the headroom in svgToPng.`);
    }

    return cropped;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Which video format the available ffmpeg can actually produce.
 *
 * The ffmpeg that ships alongside the Playwright browsers is a cut-down build
 * with only VP8 and WebM, no H.264 and no `-movflags`. A full system ffmpeg
 * gives MP4. Rather than assume, ask, and let the caller record which format
 * the teacher is actually getting.
 *
 * WebM is fine for the intended route: the file goes to Canvas Studio, which
 * transcodes on upload. It is only a problem if someone links the raw file and
 * a learner opens it in an older Safari.
 */
export function videoFormat(ffmpeg = findFfmpeg()) {
  if (!ffmpeg) return { ok: false, reason: 'No ffmpeg found on this machine.' };
  try {
    const { execFileSync } = require_('node:child_process');
    const ask = (flag) => execFileSync(ffmpeg, [flag], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15_000,
    });
    const encoders = ask('-encoders');
    const decoders = ask('-decoders');
    const demuxers = ask('-demuxers');

    // Being able to encode video is not enough. The frames go in as a numbered
    // sequence of PNG files, so ffmpeg also needs the image2 demuxer and a PNG
    // decoder. The cut-down build that ships beside the Playwright browsers has
    // the VP8 encoder but neither of those, and it fails only once every frame
    // has already been rendered. Check up front instead.
    const hasImage2 = /^\s*D\s+image2\s/m.test(demuxers);
    const hasPngDecoder = /^\s*V[.A-Z]*\s+png\s/m.test(decoders);
    if (!hasImage2 || !hasPngDecoder) {
      const missing = [
        hasImage2 ? null : 'the image2 demuxer',
        hasPngDecoder ? null : 'a PNG decoder',
      ].filter(Boolean).join(' and ');
      return {
        ok: false,
        reason: `The ffmpeg at ${ffmpeg} is a cut-down build missing ${missing}, so it cannot read the rendered frames. Install a full ffmpeg to enable video export. Everything else in the toolkit works without it.`,
      };
    }

    if (/\blibx264\b/.test(encoders)) {
      return {
        ok: true,
        extension: 'mp4',
        codec: 'H.264 in MP4',
        args: ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-crf', '20'],
        universal: true,
      };
    }
    if (/\blibvpx\b/.test(encoders)) {
      return {
        ok: true,
        extension: 'webm',
        codec: 'VP8 in WebM',
        args: ['-c:v', 'libvpx', '-pix_fmt', 'yuv420p', '-b:v', '1M', '-crf', '10'],
        universal: false,
      };
    }
  } catch (e) {
    return { ok: false, reason: `Could not ask ffmpeg what it supports: ${e.message}` };
  }
  return { ok: false, reason: 'ffmpeg has neither an H.264 nor a VP8 encoder.' };
}

/**
 * Capture an animation as a sequence of frames and encode it to video.
 *
 * The page must expose `window.lvSeek(t)`, where `t` runs 0 to 1 across the
 * whole animation, and must render synchronously when it is called. Driving the
 * clock rather than recording in real time means the output is deterministic:
 * the same page always yields the same frames, whatever the machine load.
 *
 * Video rather than an animated GIF because a two minute orbit at 30fps is a
 * couple of hundred kilobytes of video and tens of megabytes of GIF, and every
 * LMS plays video natively.
 *
 * Returns `{ buffer, extension, codec, universal }`.
 */
export async function pageToVideo(html, {
  width, height, frames = 120, fps = 30, scale = 1,
} = {}) {
  const chrome = findChromium();
  const ffmpeg = findFfmpeg();
  if (!chrome) throw new Error('No Chromium found, so the animation cannot be captured.');
  if (!ffmpeg) throw new Error('No ffmpeg found, so frames cannot be encoded to video.');

  const format = videoFormat(ffmpeg);
  if (!format.ok) throw new Error(format.reason);

  const dir = await mkdtemp(join(tmpdir(), 'learnviz-anim-'));
  try {
    // Each frame is its own page load at a fixed clock position. Slower than
    // driving one page, and completely reproducible.
    for (let i = 0; i < frames; i += 1) {
      const t = i / frames;
      const framed = html.replace(
        '</body>',
        `<script>document.addEventListener('DOMContentLoaded',function(){window.lvSeek&&window.lvSeek(${t});});</script></body>`,
      );
      const htmlPath = join(dir, `frame-${String(i).padStart(4, '0')}.html`);
      await writeFile(htmlPath, framed, 'utf8');
      await run(chrome, [
        ...CHROME_FLAGS,
        `--force-device-scale-factor=${scale}`,
        `--window-size=${Math.ceil(width)},${Math.ceil(height)}`,
        `--screenshot=${join(dir, `frame-${String(i).padStart(4, '0')}.png`)}`,
        `file://${htmlPath}`,
      ], { timeout: 30_000 });
    }

    const outPath = join(dir, `out.${format.extension}`);
    await run(ffmpeg, [
      '-y', '-loglevel', 'error',
      '-framerate', String(fps),
      '-i', join(dir, 'frame-%04d.png'),
      // Even dimensions and yuv420p are what make the file play everywhere
      // rather than showing a black box on some players.
      '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
      ...format.args,
      outPath,
    ], { timeout: 300_000 });

    return {
      buffer: await readFile(outPath),
      extension: format.extension,
      codec: format.codec,
      universal: format.universal,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Report which optional encoders are available, for the CLI to tell the user. */
export function capabilities() {
  const ffmpeg = findFfmpeg();
  return {
    chromium: findChromium(),
    ffmpeg,
    video: videoFormat(ffmpeg),
  };
}

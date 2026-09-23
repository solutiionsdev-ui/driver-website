/**
 * Builds the share image and the favicon set from the hero's own assets, so a
 * social preview looks like the page rather than a stock placeholder.
 *
 *   person-diffuse.webp + grido1-logo.webp  →  public/open-graph.png (1200×630)
 *                                              public/favicon-*.png, apple, android
 *
 * The portrait is composited at the design's framing — bottom-anchored, right
 * of centre — with the wordmark and driver name set on the left, matching the
 * hero's own layout closely enough that the preview and the page read as the
 * same design.
 *
 * Run:  node scripts/generate-open-graph.mjs
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const SCENE = path.join(PUBLIC, "assets/hero/scene");
const UI = path.join(PUBLIC, "assets/hero/ui");

const WIDTH = 1200;
const HEIGHT = 630;
const BACKGROUND = { r: 247, g: 250, b: 251, alpha: 1 };

/** Favicon sizes the starter's `public/` already references. */
const ICON_SIZES = [16, 32, 96, 180, 192];

const buildOpenGraph = async () => {
  // Scaled past the frame then cropped from the top, so the head sits high
  // and the suit runs off the bottom edge — the hero's own framing. A plain
  // fit-to-height would leave the source square's padding around the subject.
  const OVERSCAN = 1.2;
  const scaled = await sharp(path.join(SCENE, "person-diffuse.webp"))
    .resize({ height: Math.round(HEIGHT * OVERSCAN) })
    .toBuffer();
  const scaledMeta = await sharp(scaled).metadata();
  const portrait = await sharp(scaled)
    .extract({
      left: 0,
      top: Math.round(HEIGHT * (OVERSCAN - 1) * 0.55),
      width: scaledMeta.width ?? HEIGHT,
      height: HEIGHT,
    })
    .toBuffer();
  const portraitMeta = await sharp(portrait).metadata();

  const logo = await sharp(path.join(UI, "grido1-logo.webp"))
    .resize({ width: 240 })
    .toBuffer();

  // Oswald is not installed system-wide, so the name is drawn as SVG text with
  // a condensed-sans stack rather than assuming the webfont is available.
  const caption = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .name { font-family: 'Oswald','Haettenschweiler','Arial Narrow',sans-serif;
                font-weight: 700; font-size: 104px; fill: #000; letter-spacing: -1px; }
        .meta { font-family: 'Space Grotesk','Inter',sans-serif;
                font-weight: 500; font-size: 26px; fill: #02d2e3; letter-spacing: 2px; }
        .sub  { font-family: 'Space Grotesk','Inter',sans-serif;
                font-weight: 400; font-size: 26px; fill: rgba(0,0,0,0.55); letter-spacing: 1px; }
      </style>
      <text class="meta" x="64" y="292">DRIVER_012</text>
      <text class="name" x="60" y="392">KIMI</text>
      <text class="name" x="60" y="486">ANTONELLI</text>
      <!-- Kept short: the portrait's silhouette starts around x=560, and a
           longer line disappears behind his shoulder. -->
      <text class="sub"  x="64" y="546">MERCEDES-AMG F1 TEAM</text>
    </svg>
  `);

  await sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: BACKGROUND },
  })
    .composite([
      {
        input: portrait,
        top: 0,
        left: Math.round(WIDTH * 0.66 - (portraitMeta.width ?? 0) / 2),
      },
      { input: logo, top: 56, left: 60 },
      { input: caption, top: 0, left: 0 },
    ])
    .png()
    .toFile(path.join(PUBLIC, "open-graph.png"));
};

/**
 * Favicons are the wordmark's "1" mark on the page ground — at 16px a full
 * lockup is an unreadable smear, and the glyph is what people recognise in a
 * tab strip.
 */
const buildIcons = async () => {
  const mark = Buffer.from(`
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="96" fill="#0e0f14"/>
      <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
            font-family="'Oswald','Arial Narrow',sans-serif" font-weight="700"
            font-size="300" fill="#f7fafb">G1</text>
      <rect x="96" y="392" width="320" height="16" fill="#02d2e3"/>
    </svg>
  `);

  for (const size of ICON_SIZES) {
    await sharp(mark)
      .resize(size, size)
      .png()
      .toFile(path.join(PUBLIC, `favicon-${size}x${size}.png`));
  }
  await sharp(mark).resize(180, 180).png().toFile(path.join(PUBLIC, "apple-icon-180x180.png"));
  for (const size of [36, 48, 72, 96, 144, 192]) {
    await sharp(mark)
      .resize(size, size)
      .png()
      .toFile(path.join(PUBLIC, `android-icon-${size}x${size}.png`));
  }
  // `src/app/favicon.ico` is the App Router file convention — it is what Next
  // actually serves at /favicon.ico, and it wins over anything in `public/`.
  // Leaving the starter's there ships someone else's mark, so rewrite it.
  //
  // ICO has accepted an embedded PNG payload since Vista, which is far simpler
  // than emitting a BMP: a 6-byte header, one 16-byte directory entry, then the
  // PNG bytes verbatim. sharp cannot write .ico, so the container is built here.
  const iconPng = await sharp(mark).resize(48, 48).png().toBuffer();
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry.writeUInt8(48, 0); // width
  entry.writeUInt8(48, 1); // height
  entry.writeUInt8(0, 2); // palette size (0 = truecolour)
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(iconPng.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12); // payload offset
  await sharp(mark) // keep a PNG alongside for anything that prefers one
    .resize(48, 48)
    .png()
    .toFile(path.join(PUBLIC, "favicon.png"));
  await writeFile(
    path.join(ROOT, "src/app/favicon.ico"),
    Buffer.concat([header, entry, iconPng]),
  );
};

await buildOpenGraph();
await buildIcons();
process.stdout.write("wrote open-graph.png + favicon set\n");

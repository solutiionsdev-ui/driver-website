/**
 * Derives the hero head-plane texture set from a single cut-out portrait.
 *
 *   person.png  →  person-diffuse.webp   colour, composited on the page bg
 *                  person-alpha.webp     the cut-out mask
 *                  person-depth.webp     synthesised relief (drives parallax)
 *                  person-normal.webp    tangent-space normals from the depth
 *
 * The source is a plain RGBA cut-out — it carries no depth and no normals, so
 * both are *synthesised* here rather than shipped by an authoring tool:
 *
 *   depth  = silhouette inflation (a distance-transform approximated by a
 *            stack of blurs, so the body bulges toward the camera and falls
 *            off at the outline) + a face-centred bump + a shoulders-back
 *            ramp + a low-weight relief term lifted from skin-tone luminance
 *            (brow / nose / cheeks). Everything is heavily smoothed: the
 *            shader offsets UVs by ~1% of the plane, so band-free gradients
 *            matter far more than fine detail.
 *
 *   normal = Sobel gradient of that depth, encoded XYZ→RGB. Used for the
 *            subtle pointer-driven relight, not for a full lighting model.
 *
 * Run:  node scripts/generate-person-maps.mjs [source.png]
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public/assets/hero/scene");
const SOURCE = path.resolve(ROOT, process.argv[2] ?? "person.png");

/** Page background — semi-transparent hair edges are matted against it. */
const PAGE_BG = { r: 247, g: 250, b: 251 };

/** Colour/alpha ship at 2048; depth and normals are smooth, so 512 is plenty. */
const COLOR_SIZE = 2048;
const FIELD_SIZE = 512;

// --- small float-field helpers ------------------------------------------

/** Gaussian-blur a single-channel float field by round-tripping through sharp. */
const blurField = async (field, size, sigma) => {
  const bytes = Buffer.alloc(size * size);
  for (let i = 0; i < field.length; i++) {
    bytes[i] = Math.max(0, Math.min(255, Math.round(field[i] * 255)));
  }
  // sharp hands back interleaved RGB even for a 1-channel raw input, so read
  // through the reported stride rather than assuming one byte per pixel.
  const { data, info } = await sharp(bytes, {
    raw: { width: size, height: size, channels: 1 },
  })
    .blur(sigma)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const stride = info.channels;
  const out = new Float32Array(field.length);
  for (let i = 0; i < out.length; i++) out[i] = data[i * stride] / 255;
  return out;
};

const normalise = (field, mask) => {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < field.length; i++) {
    if (mask[i] < 0.5) continue;
    if (field[i] < min) min = field[i];
    if (field[i] > max) max = field[i];
  }
  const span = max - min || 1;
  const out = new Float32Array(field.length);
  for (let i = 0; i < field.length; i++) out[i] = (field[i] - min) / span;
  return out;
};

const writeGray = (field, size, file) => {
  const bytes = Buffer.alloc(size * size);
  for (let i = 0; i < field.length; i++) {
    bytes[i] = Math.max(0, Math.min(255, Math.round(field[i] * 255)));
  }
  return sharp(bytes, { raw: { width: size, height: size, channels: 1 } })
    .webp({ quality: 92 })
    .toFile(path.join(OUT_DIR, file));
};

// --- 1. colour + alpha ---------------------------------------------------

const buildColorAndAlpha = async () => {
  await sharp(SOURCE)
    .resize(COLOR_SIZE, COLOR_SIZE, { fit: "cover" })
    .flatten({ background: PAGE_BG })
    .webp({ quality: 90 })
    .toFile(path.join(OUT_DIR, "person-diffuse.webp"));

  await sharp(SOURCE)
    .resize(COLOR_SIZE, COLOR_SIZE, { fit: "cover" })
    .extractChannel("alpha")
    .webp({ quality: 92 })
    .toFile(path.join(OUT_DIR, "person-alpha.webp"));
};

// --- 2. depth ------------------------------------------------------------

const buildDepth = async () => {
  const size = FIELD_SIZE;
  const { data } = await sharp(SOURCE)
    .resize(size, size, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const count = size * size;
  const mask = new Float32Array(count);
  const luma = new Float32Array(count);
  const skin = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    mask[i] = data[i * 4 + 3] / 255;
    luma[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Loose skin test: warm, mid-bright, red-dominant. Only weights the
    // relief term, so false positives cost a barely visible nudge.
    const warm = r - b;
    skin[i] =
      mask[i] > 0.5 && r > 0.28 && warm > 0.06 && r > g && g > b * 0.85
        ? Math.min(1, warm * 4)
        : 0;
  }

  // Silhouette inflation — averaging progressively wider blurs of the mask
  // approximates a normalised distance transform without a real EDT pass.
  const radii = [4, 9, 18, 34, 60, 95];
  const blurs = await Promise.all(radii.map((r) => blurField(mask, size, r)));
  const dome = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let sum = 0;
    for (const b of blurs) sum += b[i];
    dome[i] = Math.pow(sum / blurs.length, 0.85);
  }

  // Face-centred bump. The centroid of the skin mask lands on the face, so
  // the bump follows the portrait instead of a hardcoded coordinate.
  let sx = 0;
  let sy = 0;
  let sw = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const w = skin[y * size + x];
      sx += x * w;
      sy += y * w;
      sw += w;
    }
  }
  const faceX = sw > 0 ? sx / sw : size * 0.5;
  const faceY = sw > 0 ? sy / sw : size * 0.42;
  const bumpR = size * 0.3;

  // Skin luminance, band-passed: (blurred skin luma) − (heavily blurred)
  // keeps brow/nose/cheek relief and drops the overall exposure ramp.
  const skinLuma = new Float32Array(count);
  for (let i = 0; i < count; i++) skinLuma[i] = luma[i] * skin[i];
  const [reliefNear, reliefFar, skinNear, skinFar] = await Promise.all([
    blurField(skinLuma, size, 5),
    blurField(skinLuma, size, 26),
    blurField(skin, size, 5),
    blurField(skin, size, 26),
  ]);

  const raw = new Float32Array(count);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (mask[i] < 0.01) {
        raw[i] = 0;
        continue;
      }

      const dx = (x - faceX) / bumpR;
      const dy = (y - faceY) / (bumpR * 1.25);
      const bump = Math.exp(-(dx * dx + dy * dy));

      // Shoulders sit behind the head: a soft ramp below the face line.
      const below = Math.max(0, (y - faceY) / (size - faceY || 1));
      const shoulders = -Math.pow(below, 1.4) * 0.28;

      const near = skinNear[i] > 0.02 ? reliefNear[i] / skinNear[i] : 0;
      const far = skinFar[i] > 0.02 ? reliefFar[i] / skinFar[i] : 0;
      const relief = (near - far) * (skinNear[i] > 0.05 ? 1 : 0);

      raw[i] = 0.62 * dome[i] + 0.34 * bump + shoulders + 0.9 * relief;
    }
  }

  // Smooth once more so the parallax offset field has no visible steps, then
  // renormalise inside the silhouette and fade back to 0 outside it.
  const smoothed = await blurField(normalise(raw, mask), size, 3);
  const depth = normalise(smoothed, mask);
  for (let i = 0; i < count; i++) {
    depth[i] = Math.max(0, Math.min(1, depth[i])) * mask[i];
  }

  await writeGray(depth, size, "person-depth.webp");
  return { depth, size };
};

// --- 3. normals ----------------------------------------------------------

const buildNormal = async ({ depth, size }) => {
  // Blur before differentiating — Sobel on a raw depth field turns webp
  // quantisation into visible facets.
  const field = await blurField(depth, size, 2);
  const at = (x, y) =>
    field[
      Math.min(size - 1, Math.max(0, y)) * size +
        Math.min(size - 1, Math.max(0, x))
    ];

  const sobelX = new Float32Array(size * size);
  const sobelY = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      sobelX[i] =
        at(x + 1, y - 1) +
        2 * at(x + 1, y) +
        at(x + 1, y + 1) -
        (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      sobelY[i] =
        at(x - 1, y + 1) +
        2 * at(x, y + 1) +
        at(x + 1, y + 1) -
        (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    }
  }

  // A smooth depth field has tiny gradients, so a fixed multiplier either
  // flattens the map or blows out the silhouette. Scale so the 99th-percentile
  // slope lands at a ~35° tilt and the rest stays proportional.
  const magnitudes = Float32Array.from(sobelX, (gx, i) =>
    Math.hypot(gx, sobelY[i]),
  ).sort();
  const p99 = magnitudes[Math.floor(magnitudes.length * 0.99)] || 1;
  const strength = 0.7 / p99;

  const rgb = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Texture rows run top-down, tangent-space +Y runs up: negate gy.
      const nx = -sobelX[y * size + x] * strength;
      const ny = sobelY[y * size + x] * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 3;
      rgb[i] = Math.round((nx / len) * 0.5 * 255 + 127.5);
      rgb[i + 1] = Math.round((ny / len) * 0.5 * 255 + 127.5);
      rgb[i + 2] = Math.round((1 / len) * 0.5 * 255 + 127.5);
    }
  }

  await sharp(rgb, { raw: { width: size, height: size, channels: 3 } })
    .webp({ quality: 95 })
    .toFile(path.join(OUT_DIR, "person-normal.webp"));
};

const run = async () => {
  await buildColorAndAlpha();
  const depth = await buildDepth();
  await buildNormal(depth);
  process.stdout.write(`wrote person-{diffuse,alpha,depth,normal}.webp\n`);
};

await run();

/**
 * Repaints the helmet's base-colour atlas from the yellow Monster livery to
 * the black carbon scheme the Figma hero shows.
 *
 *   helmet-gold-basecolor.webp  →  helmet-carbon-basecolor.webp
 *
 * WHY A RECOLOUR AND NOT THE SUPPLIED PHOTO
 * `helmet.png` is a 397×265 front-on product shot. A base-colour map has to
 * be painted in the *model's UV layout* — the flattened shells of
 * helmet.glb — and a single front view carries no information about the
 * sides, back or top, nor any way to know where in the atlas the pixels it
 * does carry belong. So the photo cannot be converted; it can only be
 * matched. This maps the atlas through the photo's palette instead:
 *
 *   anything chromatic → carbon graphite, shaded by the source's brightness,
 *                        so the swirl survives as a weave rather than a livery
 *   greys / whites     → a dim graphite ramp, which sinks the sponsor decals
 *                        to embossing instead of branding
 *
 * Nothing is mapped to an accent colour on purpose. Hue-mapping the Monster
 * green kept the claw marks legible, and webp chroma ringing along every
 * yellow/black edge landed in the same hue band and outlined the whole
 * pattern. A single luminance ramp has neither problem, and the design's only
 * helmet colour beyond black is the visor sheen, which the glass material
 * already produces.
 *
 * Normals, roughness and metalness are untouched — they describe surface,
 * not livery, and stay correct under any paint.
 *
 * Run:  node scripts/recolor-helmet.mjs
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCENE = path.join(ROOT, "public/assets/hero/scene");

/**
 * Sampled from helmet.png — its dominant buckets are 0x18, 0x00 and 0x30.
 *
 * All four are the same value: the shell base colour is deliberately **flat**.
 *
 * The shell is a metal, so its base colour tints the environment reflection
 * rather than being lit directly — a 2× difference in base colour is a 2×
 * difference in reflected brightness. "Android", "FAI" and the Monster
 * wordmarks survived every narrow ramp that was tried, and the entrance now
 * shows the helmet at full opacity where no mask hides them. Only a genuinely
 * uniform map removes the branding.
 *
 * Nothing is lost: the normal and roughness maps carry every scratch, panel
 * line and weave, and this script never touches them. The ramp constants are
 * kept distinct so re-introducing a livery is a one-line change rather than a
 * rewrite.
 */
const SHELL_DARK = [0x5f, 0x62, 0x6a];
const SHELL_LIGHT = [0x5f, 0x62, 0x6a];
const DECAL_DARK = [0x5f, 0x62, 0x6a];
const DECAL_LIGHT = [0x5f, 0x62, 0x6a];

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/**
 * The visor is a second atlas, and it carries the loudest branding of the
 * lot: "McLaren", "Tezos" and "android" sit on the brow strip in full colour.
 * Flattening the shell left those untouched and fully legible, which the
 * entrance makes obvious now that the helmet is shown whole.
 *
 * The atlas is three tones — a mid-grey ground, black frame shapes, and the
 * logos. Saturation alone cannot separate them, because the white logo text
 * is as achromatic as the grey ground; luminance is what splits them. So
 * anything bright *or* coloured is pushed to the frame's black, and the grey
 * ground and existing black are left alone. The visor keeps its shape and
 * loses its sponsors.
 */
const neutraliseGlass = async () => {
  const { data, info } = await sharp(path.join(SCENE, "glass-basecolor.webp"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    const isLogo = luma > 0.65 || sat > 0.15;
    const value = isLogo ? 0 : Math.round(max * 255);
    out[i * 3] = value;
    out[i * 3 + 1] = value;
    out[i * 3 + 2] = value;
  }

  await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .webp({ quality: 90 })
    .toFile(path.join(SCENE, "glass-neutral-basecolor.webp"));
};

/**
 * Silhouette of the supplied helmet photo, white on transparent, for the
 * loader to use as a CSS mask.
 *
 * Derived rather than drawn: `helmet.png` is already a clean cut-out, so its
 * alpha *is* the shape. Hand-authoring an SVG helmet would be inventing a
 * different helmet, and tracing needs a tool that is not in this toolchain.
 * A mask also lets the fill be a plain element, so the loader's rise can be a
 * spring like everything else rather than an SVG-specific animation.
 */
const buildLoaderMask = async () => {
  // Trim first. The photo carries transparent margin, and `mask-size: contain`
  // fits the *file* — padding included — so an untrimmed mask renders the
  // helmet at a fraction of its box with no way to correct it in CSS.
  const source = path.join(ROOT, "helmet.png");
  const trimmed = await sharp(source).trim().png().toBuffer();
  const { data, info } = await sharp(trimmed)
    .resize({ height: 512, fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // White everywhere the photo is opaque; the alpha channel carries the shape.
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const alpha = data[i * 4 + 3];
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = alpha;
  }

  await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(path.join(ROOT, "public/assets/hero/ui/helmet-mask.png"));
};

const run = async () => {
  const { data, info } = await sharp(
    path.join(SCENE, "helmet-gold-basecolor.webp"),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;

    // Achromatic pixels are the printed decals; everything with colour in it
    // is livery. Both collapse to a graphite ramp driven by brightness, so
    // the shell keeps its shading and loses its paint scheme.
    const rgb =
      sat < 0.18
        ? mix(DECAL_DARK, DECAL_LIGHT, max)
        : mix(SHELL_DARK, SHELL_LIGHT, max);

    out[i * 3] = Math.round(rgb[0]);
    out[i * 3 + 1] = Math.round(rgb[1]);
    out[i * 3 + 2] = Math.round(rgb[2]);
  }

  await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .webp({ quality: 90 })
    .toFile(path.join(SCENE, "helmet-carbon-basecolor.webp"));

  await neutraliseGlass();
  await buildLoaderMask();
  process.stdout.write(
    "wrote helmet-carbon-basecolor.webp, glass-neutral-basecolor.webp, helmet-mask.png\n",
  );
};

await run();

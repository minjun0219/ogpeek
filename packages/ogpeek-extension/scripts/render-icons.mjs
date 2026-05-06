#!/usr/bin/env node
// Re-renders the per-size PNGs under public/icons/ from the 1024×1024
// master. Run via `node scripts/render-icons.mjs` whenever the master
// changes. Output paths line up with the `icons` and `action.theme_icons`
// entries in every manifest under manifest/.
//
// The master is mostly transparent with the colored glyph in the
// middle; trim the surrounding alpha first, add ~8% safe-zone, then
// resize so the glyph reads cleanly at small sizes.
//
// Toolbar dark theme: the colored glyph has dark navy outlines that
// disappear against a dark Chrome theme. We also emit white-silhouette
// variants for the two toolbar sizes (16/32) — `action.theme_icons` in
// the manifest maps them to dark-mode toolbars. Larger sizes (48/128)
// are only used in places that have their own background (install
// dialog, chrome://extensions card), so they don't need the dark
// variant.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, "..");
const repo = resolve(pkg, "../..");
const source = resolve(repo, "assets/logo.png");
const lightSizes = [16, 32, 48, 128];
const darkSizes = [16, 32];

const trimmed = await sharp(source).trim({ threshold: 1 }).toBuffer();

async function renderResized(size) {
  const padding = Math.max(1, Math.round(size * 0.08));
  const inner = size - padding * 2;
  return await sharp(trimmed)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
}

async function writeLight(size) {
  const out = resolve(pkg, `public/icons/${size}.png`);
  const buf = await renderResized(size);
  await sharp(buf).png({ compressionLevel: 9 }).toFile(out);
  console.log(`rendered ${out}`);
}

async function writeDark(size) {
  const out = resolve(pkg, `public/icons/${size}-dark.png`);
  const buf = await renderResized(size);
  // Replace every opaque pixel with white, keeping the original alpha
  // so anti-aliased edges stay smooth. The result is a clean white
  // silhouette that reads well on a dark Chrome toolbar.
  const meta = await sharp(buf).metadata();
  const width = meta.width ?? size;
  const height = meta.height ?? size;
  const alpha = await sharp(buf).extractChannel("alpha").raw().toBuffer();
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < alpha.length; i++) {
    rgba[i * 4] = 255;
    rgba[i * 4 + 1] = 255;
    rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = alpha[i] ?? 0;
  }
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`rendered ${out}`);
}

await Promise.all([...lightSizes.map(writeLight), ...darkSizes.map(writeDark)]);

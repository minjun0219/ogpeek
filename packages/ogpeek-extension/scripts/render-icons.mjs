#!/usr/bin/env node
// Re-renders the per-size PNGs under public/icons/ from the 1024×1024
// master. Run via `node scripts/render-icons.mjs` whenever the master
// changes. Output paths line up with the `icons` and
// `action.default_icon` entries in every manifest under manifest/.
//
// The master ships with substantial whitespace around the glyph; if we
// just resize 1024 → 16 the glyph becomes invisible. We auto-trim the
// surrounding background first, then re-add a small uniform safe-zone
// (≈8% of the canvas) so the glyph doesn't touch the edges, then
// resize. This keeps the glyph readable at 16/32px while preserving
// breathing room at 48/128px.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const source = resolve(root, "public/icons/ogpeek-1024.png");
const sizes = [16, 32, 48, 128];

const trimmed = await sharp(source)
  .trim({ background: { r: 255, g: 255, b: 255, alpha: 1 }, threshold: 10 })
  .toBuffer();

await Promise.all(
  sizes.map(async (size) => {
    const out = resolve(root, `public/icons/${size}.png`);
    const padding = Math.max(1, Math.round(size * 0.08));
    const inner = size - padding * 2;
    await sharp(trimmed)
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
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`rendered ${out}`);
  }),
);

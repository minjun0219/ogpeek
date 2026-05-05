#!/usr/bin/env node
// Renders website brand assets from the repo's master logo
// (`assets/logo.png`). Run via `node scripts/render-brand-assets.mjs`
// when the master changes.
//
// Outputs Next.js's file-based metadata icons (`app/icon.png`,
// `app/apple-icon.png`, `app/opengraph-image.png`) so the framework
// auto-wires `<link rel="icon">`, `<link rel="apple-touch-icon">`, and
// `og:image` without manual metadata config. Also writes
// `public/logo.png` for use as a static <img> source.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, "..");
const repo = resolve(pkg, "..");
const source = resolve(repo, "assets/logo.png");

// Trim transparent / near-white whitespace once so every derived size
// fills its frame consistently.
const trimmed = await sharp(source)
  .trim({ background: { r: 255, g: 255, b: 255, alpha: 1 }, threshold: 10 })
  .toBuffer();

async function squarePadded(size, outPath) {
  const padding = Math.max(2, Math.round(size * 0.08));
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
    .toFile(outPath);
  console.log(`rendered ${outPath}`);
}

await squarePadded(256, resolve(pkg, "app/icon.png"));
await squarePadded(180, resolve(pkg, "app/apple-icon.png"));
await squarePadded(256, resolve(pkg, "public/logo.png"));

// Open Graph image: 1200×630 (Facebook-recommended 1.91:1) with the
// logo centered on a transparent background. Square logos still render
// well — most consumers (Twitter, KakaoTalk, Slack) accept either, but
// 1200×630 maximizes link-preview real estate.
const ogSize = { w: 1200, h: 630 };
const ogLogo = Math.round(ogSize.h * 0.7);
const logoBuf = await sharp(trimmed)
  .resize(ogLogo, ogLogo, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toBuffer();
await sharp({
  create: {
    width: ogSize.w,
    height: ogSize.h,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([
    {
      input: logoBuf,
      gravity: "center",
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(resolve(pkg, "app/opengraph-image.png"));
console.log(`rendered ${resolve(pkg, "app/opengraph-image.png")}`);

#!/usr/bin/env node
/**
 * Reads the version from packages/ogpeek/package.json (the reference
 * version of the fixed group) and stamps it in lockstep onto the version
 * files changesets does not touch:
 *
 * - the root package.json — the monorepo's "current release version" marker
 * - packages/ogpeek-extension/manifest/{chrome,firefox,safari}.json —
 *   the extension manifest versions store uploads require (the Chrome
 *   Web Store rejects any upload whose version has not increased)
 *
 * changesets only bumps workspace package.json files, so CI's
 * `pnpm changeset:version` runs this script right after `changeset
 * version` to bring both kinds of files in line. Targets are edited as
 * text, replacing only the top-level "version" line (minimal diff — a
 * full JSON re-serialization would expand the short arrays biome keeps
 * inline and fail `biome format`). The exact two-space indent anchor
 * matches only top-level keys under the repo's biome JSON style (nested
 * keys sit deeper), and a JSON.parse postcondition verifies the right
 * field changed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const sourcePkgPath = join(repoRoot, "packages", "ogpeek", "package.json");
const { version } = JSON.parse(readFileSync(sourcePkgPath, "utf8"));
if (!version) {
  throw new Error(`missing version in ${sourcePkgPath}`);
}

const targets = [
  join(repoRoot, "package.json"),
  ...["chrome", "firefox", "safari"].map((browser) =>
    join(
      repoRoot,
      "packages",
      "ogpeek-extension",
      "manifest",
      `${browser}.json`,
    ),
  ),
];

const versionRe = /^( {2}"version"[ \t]*:[ \t]*)"[^"]*"/m;

for (const target of targets) {
  const text = readFileSync(target, "utf8");
  if (typeof JSON.parse(text).version !== "string") {
    throw new Error(`no top-level version field in ${target}`);
  }
  if (!versionRe.test(text)) {
    throw new Error(`version line not found in ${target}`);
  }
  const next = text.replace(versionRe, `$1"${version}"`);
  if (JSON.parse(next).version !== version) {
    throw new Error(`failed to update top-level version in ${target}`);
  }
  const label = relative(repoRoot, target);
  if (next !== text) {
    writeFileSync(target, next);
    console.log(`${label} version → ${version}`);
  } else {
    console.log(`${label} version already ${version} (unchanged)`);
  }
}

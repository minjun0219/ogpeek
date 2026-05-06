#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const browser = process.argv[2] ?? "chrome";
const sourceDir = resolve(root, `dist/${browser}`);
const outFile = resolve(root, `dist/ogpeek-${browser}.zip`);

if (!existsSync(sourceDir)) {
  console.error(`build output missing: ${sourceDir}`);
  process.exit(1);
}

if (existsSync(outFile)) {
  rmSync(outFile);
}

// Use the system `zip` binary for stability across CI runners; node's own
// archive libraries would add a runtime dep we don't need.
execFileSync("zip", ["-r", "-q", outFile, "."], {
  cwd: sourceDir,
  stdio: "inherit",
});

console.log(`packaged ${outFile}`);

#!/usr/bin/env node
/**
 * When the changesets Version PR merges and the version on main goes up,
 * create the `v<version>` GitHub Release (+ tag) for that version. The
 * release notes are assembled from the matching version sections of the
 * fixed group's three package CHANGELOG.md files.
 * No npm publish happens here — tag + GitHub Release only. The npm/zip
 * publishes are performed by the follow-up jobs in release.yml, keyed on
 * this script's outputs.
 *
 * It runs from a release.yml step on every main push, so it must be
 * idempotent. The idempotency key is **the GitHub Release existing, not
 * the tag** — after a partial failure that left only the tag behind, the
 * next run can still recover and create the release.
 *
 * The tag is created by `gh release create` itself (at the `--target`
 * commit when missing) → no git user identity setup is needed. Assumes a
 * GitHub Actions runner (gh CLI + GH_TOKEN/GITHUB_TOKEN, contents:write).
 *
 * Writes release_created / tag_name to GITHUB_OUTPUT as conditions for
 * the follow-up publish jobs.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Extract the body of one version's section from CHANGELOG.md text.
 * changesets writes plain `## <version>` headings, while sections
 * inherited from release-please look like `## [<version>](<link>)` or
 * `## <version> (<date>)` — match all three forms. A section ends at the
 * next `## ` heading. */
function extractChangelogSection(changelog, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingRe = new RegExp(`^##\\s+\\[?${escaped}\\]?(?:\\s|\\(|$)`);
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((l) => headingRe.test(l.trim()));
  if (start === -1) {
    return "";
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i] ?? "")) {
      end = i;
      break;
    }
  }
  return lines
    .slice(start + 1, end)
    .join("\n")
    .trim();
}

function setOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

const RELEASED_PACKAGES = ["ogpeek", "ogpeek-react", "ogpeek-extension"];

const { version } = JSON.parse(
  readFileSync(join(repoRoot, "packages", "ogpeek", "package.json"), "utf8"),
);
if (!version) {
  throw new Error("missing version in packages/ogpeek/package.json");
}
const tag = `v${version}`;
setOutput("tag_name", tag);

// A GitHub Release already exists → fully done, skip (idempotent).
if (spawnSync("gh", ["release", "view", tag]).status === 0) {
  console.log(`${tag} GitHub Release already exists — skip (idempotent)`);
  setOutput("release_created", "false");
  process.exit(0);
}

const sections = [];
for (const dir of RELEASED_PACKAGES) {
  let changelog = "";
  try {
    changelog = readFileSync(
      join(repoRoot, "packages", dir, "CHANGELOG.md"),
      "utf8",
    );
  } catch {
    // A package with no changeset for this version may not have a
    // CHANGELOG.md at all yet — just skip it.
  }
  const section = extractChangelogSection(changelog, version);
  if (section) {
    sections.push(`## ${dir}\n\n${section}`);
  }
}
const notes = sections.join("\n\n") || tag;

const gitRev = spawnSync("git", ["rev-parse", "HEAD"]);
if (gitRev.status !== 0 || !gitRev.stdout) {
  throw new Error("git rev-parse HEAD failed");
}
const sha = gitRev.stdout.toString().trim();
const created = spawnSync(
  "gh",
  ["release", "create", tag, "--target", sha, "--title", tag, "--notes", notes],
  { stdio: ["ignore", "inherit", "inherit"] },
);
if (created.status !== 0) {
  throw new Error(`gh release create failed: ${tag}`);
}
setOutput("release_created", "true");
console.log(`released ${tag}`);

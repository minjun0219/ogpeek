#!/usr/bin/env node
/**
 * changesets Version PR 이 병합돼 main 의 버전이 오르면, 그 버전으로
 * `v<version>` GitHub Release(+태그)를 생성한다. 릴리스 노트는 fixed 그룹
 * 세 패키지의 CHANGELOG.md 에서 해당 버전 섹션을 모아 만든다.
 * npm publish 는 하지 않는다 — 태그 + GitHub Release 만. npm/zip 게시는
 * release.yml 의 후속 job 들이 이 스크립트의 output 을 보고 수행한다.
 *
 * release.yml 의 스텝에서 매 main push 마다 실행되므로 멱등이어야 한다.
 * 멱등 기준은 **태그가 아니라 GitHub Release 존재**다 — 태그만 남고
 * release 생성이 실패한 부분 실패에서도 다음 실행이 복구할 수 있다.
 *
 * 태그는 `gh release create` 가 직접 만든다(없으면 `--target` 커밋에 생성)
 * → git user identity 설정이 필요 없다. 전제: GitHub Actions 러너
 * (gh CLI + GH_TOKEN/GITHUB_TOKEN, contents:write).
 *
 * GITHUB_OUTPUT 에 release_created / tag_name 을 기록해 후속 publish job
 * 들의 조건으로 쓴다.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** CHANGELOG.md 텍스트에서 특정 버전 섹션의 본문만 추출한다. changesets
 * 형식(`## <version>` 헤딩 + 다음 `## ` 헤딩 전까지)을 가정한다. */
function extractChangelogSection(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `## ${version}`);
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
  throw new Error("packages/ogpeek/package.json 에 version 이 없다");
}
const tag = `v${version}`;
setOutput("tag_name", tag);

// 이미 GitHub Release 가 있으면 완전 완료 → skip (멱등)
if (spawnSync("gh", ["release", "view", tag]).status === 0) {
  console.log(`${tag} GitHub Release 이미 존재 — skip (멱등)`);
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
    // 해당 패키지에 이번 버전의 changeset 이 없으면 CHANGELOG 자체가 없을
    // 수 있다 — 그냥 건너뛴다.
  }
  const section = extractChangelogSection(changelog, version);
  if (section) {
    sections.push(`## ${dir}\n\n${section}`);
  }
}
const notes = sections.join("\n\n") || tag;

const sha = spawnSync("git", ["rev-parse", "HEAD"]).stdout.toString().trim();
const created = spawnSync(
  "gh",
  ["release", "create", tag, "--target", sha, "--title", tag, "--notes", notes],
  { stdio: ["ignore", "inherit", "inherit"] },
);
if (created.status !== 0) {
  throw new Error(`gh release create 실패: ${tag}`);
}
setOutput("release_created", "true");
console.log(`released ${tag}`);

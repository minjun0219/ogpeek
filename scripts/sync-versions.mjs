#!/usr/bin/env node
/**
 * packages/ogpeek/package.json 의 version(fixed 그룹의 기준 버전)을 읽어
 * changesets 가 건드리지 않는 나머지 버전 파일들에 lockstep 으로 반영한다:
 *
 * - 루트 package.json — 모노레포의 "현재 릴리스 버전" 표기
 * - packages/ogpeek-extension/manifest/{chrome,firefox,safari}.json —
 *   스토어 업로드가 요구하는 확장 manifest 버전 (Chrome Web Store 는 매
 *   업로드마다 버전 증가를 요구한다)
 *
 * changesets 는 워크스페이스 패키지의 package.json 만 범프하므로, CI 의
 * `pnpm changeset:version` 이 `changeset version` 직후 이 스크립트를 돌려
 * 두 종류의 파일을 맞춘다. 대상 파일은 텍스트로 읽어 최상위 "version"
 * 라인만 정규식으로 치환한다 (전체 재직렬화 없이 최소 diff). 줄 시작
 * 앵커(^…/m)로 최상위 라인만 잡아 다른 곳의 "version" 문구에 오매칭되지
 * 않는다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const sourcePkgPath = join(repoRoot, "packages", "ogpeek", "package.json");
const { version } = JSON.parse(readFileSync(sourcePkgPath, "utf8"));
if (!version) {
  throw new Error(`version 이 없다: ${sourcePkgPath}`);
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

const versionRe = /^([ \t]*"version"[ \t]*:[ \t]*)"[^"]*"/m;

for (const target of targets) {
  const text = readFileSync(target, "utf8");
  if (!versionRe.test(text)) {
    throw new Error(`version 필드를 찾지 못했다: ${target}`);
  }
  const next = text.replace(versionRe, `$1"${version}"`);
  const label = relative(repoRoot, target);
  if (next !== text) {
    writeFileSync(target, next);
    console.log(`${label} version → ${version}`);
  } else {
    console.log(`${label} version 이미 ${version} (변경 없음)`);
  }
}

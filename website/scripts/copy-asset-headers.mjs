// Copies website/_headers to the root of the OpenNext assets directory, the
// only place Workers Static Assets reads it. Runs after
// `opennextjs-cloudflare build`, which recreates .open-next/.
// website/_headers 를 OpenNext 자산 디렉터리 루트로 복사한다. Workers Static
// Assets 는 그 자리의 파일만 읽는다. .open-next/ 를 새로 만드는
// `opennextjs-cloudflare build` 다음에 실행한다.
import { copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WEBSITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

copyFileSync(
  resolve(WEBSITE_DIR, "_headers"),
  resolve(WEBSITE_DIR, ".open-next/assets/_headers"),
);

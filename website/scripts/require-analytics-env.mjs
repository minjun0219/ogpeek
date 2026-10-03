// Fails the Cloudflare build when the PostHog key is missing.
//
// NEXT_PUBLIC_* values are inlined by `next build`; a build that runs without
// the key emits a bundle where `process.env.NEXT_PUBLIC_POSTHOG_KEY` survives
// as a live lookup, resolves to undefined in the browser, and PostHogInit
// returns before init(). Nothing errors — analytics is simply never installed.
// That is exactly how ogpeek.dev shipped with zero events: Workers Builds
// builds from a fresh clone, and website/.env is gitignored.
//
// So the key lives in the production trigger's build variables in Workers
// Builds, and this guard stands in front of cf:build to make its absence loud.
// Only the production build (WORKERS_CI_BRANCH=main) is held to it: preview
// triggers, local builds and forks carry no key by design and pass silently.
// A deliberately analytics-free production build sets
// OGPEEK_ALLOW_NO_ANALYTICS=1.
// 그래서 키는 Workers Builds 프로덕션 트리거의 빌드 변수에 두고, 이 가드가
// cf:build 앞에서 키가 빠진 것을 드러낸다. 프로덕션 빌드(WORKERS_CI_BRANCH=main)만
// 검사한다. 프리뷰 트리거·로컬 빌드·포크는 원래 키가 없으니 조용히 통과한다.
// 분석 없이 프로덕션에 내보내려면 OGPEEK_ALLOW_NO_ANALYTICS=1 을 설정한다.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// @next/env is CJS — take the default export and destructure.
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

// The website directory, not process.cwd(): `next build` always resolves its
// env files against this package, so anchoring here keeps the guard's verdict
// and the build's verdict the same no matter where the script was invoked from.
const WEBSITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const OPT_OUT = "OGPEEK_ALLOW_NO_ANALYTICS";
const KEY = "NEXT_PUBLIC_POSTHOG_KEY";
const PRODUCTION_BRANCH = "main";

// Resolve exactly the way next build will: real env first, then
// .env.local / .env.<NODE_ENV> / .env from the website directory.
loadEnvConfig(WEBSITE_DIR, false, { info: () => {}, error: console.error });

if (process.env.WORKERS_CI_BRANCH !== PRODUCTION_BRANCH) {
  // Not a production build — no key expected, nothing to say.
  // 프로덕션 빌드가 아니다 — 키가 없는 게 정상이라 아무것도 출력하지 않는다.
} else if (process.env[OPT_OUT] === "1") {
  console.log(`[analytics] ${OPT_OUT}=1 — building without PostHog.`);
} else if (!process.env[KEY]) {
  console.error(
    [
      `[analytics] ${KEY} is not set — refusing to build.`,
      "",
      "  A keyless build looks healthy and silently collects nothing.",
      "  Set it in Workers Builds → Settings → Build → Variables and Secrets",
      "  on the production trigger (a Worker secret does NOT work — the value",
      "  is inlined at build time, not read at runtime).",
      `  Deliberately shipping without analytics: ${OPT_OUT}=1.`,
    ].join("\n"),
  );
  process.exit(1);
}

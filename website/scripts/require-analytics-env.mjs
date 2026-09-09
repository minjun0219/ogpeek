// Fails the Cloudflare build when the PostHog key is missing.
//
// NEXT_PUBLIC_* values are inlined by `next build`; a build that runs without
// the key emits a bundle where `process.env.NEXT_PUBLIC_POSTHOG_KEY` survives
// as a live lookup, resolves to undefined in the browser, and PostHogInit
// returns before init(). Nothing errors — analytics is simply never installed.
// That is exactly how ogpeek.dev shipped with zero events: Workers Builds
// builds from a fresh clone, and website/.env is gitignored.
//
// So the key lives in the Workers Builds environment variables, and this guard
// stands in front of cf:build to make its absence loud. Local dev / forks that
// deliberately want an analytics-free deployment set OGPEEK_ALLOW_NO_ANALYTICS=1.
// @next/env is CJS — take the default export and destructure.
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const OPT_OUT = "OGPEEK_ALLOW_NO_ANALYTICS";
const KEY = "NEXT_PUBLIC_POSTHOG_KEY";

// Resolve exactly the way next build will: real env first, then
// .env.local / .env.<NODE_ENV> / .env from the website directory.
loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

if (process.env[OPT_OUT] === "1") {
  console.log(`[analytics] ${OPT_OUT}=1 — building without PostHog.`);
} else if (!process.env[KEY]) {
  console.error(
    [
      `[analytics] ${KEY} is not set — refusing to build.`,
      "",
      "  A keyless build looks healthy and silently collects nothing.",
      "  Cloudflare deploys: set it in Workers Builds → Settings → Build →",
      "  Variables and Secrets (a Worker secret does NOT work — the value is",
      "  inlined at build time, not read at runtime).",
      "  Locally: put it in website/.env (see website/.env.example).",
      `  Deliberately shipping without analytics: ${OPT_OUT}=1.`,
    ].join("\n"),
  );
  process.exit(1);
}

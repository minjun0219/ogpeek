import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // PostHog settings keep the unprefixed names shared across every repo
  // (POSTHOG_KEY / POSTHOG_HOST) instead of NEXT_PUBLIC_*. Listing them here
  // makes `next build` inline them into the client bundle the same way.
  // PostHog 설정은 NEXT_PUBLIC_* 대신 모든 repo 가 함께 쓰는 접두사 없는 이름
  // (POSTHOG_KEY / POSTHOG_HOST)을 쓴다. 여기 적어 두면 `next build` 가 같은
  // 방식으로 클라이언트 번들에 인라인한다.
  env: {
    POSTHOG_KEY: process.env.POSTHOG_KEY,
    POSTHOG_HOST: process.env.POSTHOG_HOST,
  },
};

export default config;

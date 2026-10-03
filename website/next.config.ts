import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // PostHog settings keep the unprefixed names shared across every repo
  // (POSTHOG_KEY / POSTHOG_HOST) instead of NEXT_PUBLIC_*. Listing them here
  // makes `next build` inline them into the client bundle the same way.
  env: {
    POSTHOG_KEY: process.env.POSTHOG_KEY,
    POSTHOG_HOST: process.env.POSTHOG_HOST,
  },
};

export default config;

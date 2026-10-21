import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/site";

const config: NextConfig = {
  reactStrictMode: true,
  basePath: BASE_PATH,
  // Keeps `next dev` from writing an English AGENTS.md into website/ when it
  // detects a coding agent. The root AGENTS.md, which is Korean only, points
  // agents to the same bundled docs.
  // `next dev` 가 코딩 에이전트를 감지해도 website/ 에 영어 AGENTS.md 를 만들지 않게 한다.
  // 같은 번들 문서는 한국어로만 쓰는 루트 AGENTS.md 가 안내한다.
  agentRules: false,
};

export default config;

import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["ogpeek-core"],
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
};

export default config;

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// `import.meta.dirname` is only stable from Node 20.11+ (and the repo only
// guarantees Node 20), so derive __dirname explicitly to keep next.config
// evaluation portable across the whole 20.x range.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default config;

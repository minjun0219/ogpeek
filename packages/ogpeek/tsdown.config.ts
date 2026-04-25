import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/fetch.ts"],
  format: "esm",
  dts: true,
  sourcemap: true,
  target: "node20",
  clean: true,
  fixedExtension: false,
});

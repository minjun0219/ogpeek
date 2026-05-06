import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const here = dirname(fileURLToPath(import.meta.url));

type Browser = "chrome" | "firefox" | "safari";

function browserTarget(): Browser {
  const raw = (process.env.BROWSER ?? "chrome").toLowerCase();
  if (raw === "chrome" || raw === "firefox" || raw === "safari") {
    return raw;
  }
  throw new Error(
    `Unknown BROWSER=${raw}; expected chrome | firefox | safari.`,
  );
}

// Single Vite build emits both the popup (HTML + JS + CSS bundle) and the
// background worker (single-file JS). The post-build hook copies the
// browser-specific manifest to dist/<browser>/manifest.json plus any static
// assets, so the extension folder is ready for unpacked load with no extra
// scripts.
function packageExtensionPlugin(browser: Browser): Plugin {
  const outDir = resolve(here, `dist/${browser}`);
  return {
    name: "ogpeek-extension-package",
    apply: "build",
    closeBundle() {
      mkdirSync(outDir, { recursive: true });
      const manifestSrc = resolve(here, `manifest/${browser}.json`);
      copyFileSync(manifestSrc, resolve(outDir, "manifest.json"));
      // Only ship the size-named icons that manifests reference. The 1024
      // master and the render script live in public/icons/ for source
      // control; they don't need to be in the extension bundle.
      const iconsOut = resolve(outDir, "icons");
      mkdirSync(iconsOut, { recursive: true });
      for (const size of [16, 32, 48, 128]) {
        const src = resolve(here, `public/icons/${size}.png`);
        if (existsSync(src)) {
          copyFileSync(src, resolve(iconsOut, `${size}.png`));
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const browser = browserTarget();
  const outDir = resolve(here, `dist/${browser}`);
  return {
    plugins: [react(), packageExtensionPlugin(browser)],
    // Disable Vite's automatic public/ → dist root copy. The icon master
    // and the render script live under public/icons/ for source control,
    // but only the size-named PNGs should ship — the post-build plugin
    // handles that copy explicitly.
    publicDir: false,
    define: {
      // Inline the chosen browser so feature-detect callers can branch
      // without reading process.env at runtime.
      "import.meta.env.OGPEEK_BROWSER": JSON.stringify(browser),
    },
    build: {
      outDir,
      emptyOutDir: true,
      sourcemap: mode === "development" ? "inline" : false,
      target: "es2022",
      rollupOptions: {
        input: {
          popup: resolve(here, "popup.html"),
          app: resolve(here, "app.html"),
          background: resolve(here, "src/background/index.ts"),
        },
        output: {
          // Background must be a single fixed-name file because the manifest
          // references it by static path.
          entryFileNames: (chunk) =>
            chunk.name === "background"
              ? "background.js"
              : "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
          // Rollup is allowed to split shared modules (e.g. webextension-
          // polyfill) into a sibling chunk under assets/. MV3 service
          // workers registered as `type: "module"` accept static `import`
          // declarations, so the emitted background.js can pull its shared
          // chunk at register time without runtime dynamic-import.
        },
      },
    },
  };
});

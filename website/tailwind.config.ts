import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Inter covers Latin glyphs; the browser falls back to Noto Sans KR
        // for Hangul via unicode-range, so a single font-sans class works
        // for mixed-language UI.
        sans: [
          "var(--font-sans)",
          "var(--font-sans-kr)",
          "Inter",
          "Noto Sans KR",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

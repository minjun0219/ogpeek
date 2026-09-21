import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFull,
  buildIndex,
  CONFIG,
  rawUrl,
  readSources,
  repoRoot,
  stripLogo,
  writeAll,
} from "../../scripts/gen-llms.mjs";

describe("rawUrl", () => {
  it("builds a raw.githubusercontent URL from repo + branch + path", () => {
    expect(rawUrl(CONFIG, "packages/ogpeek/README.md")).toBe(
      "https://raw.githubusercontent.com/minjun0219/ogpeek/main/packages/ogpeek/README.md",
    );
  });
});

describe("stripLogo", () => {
  it("removes a leading centered-logo <p> block", () => {
    const md = '<p align="center">\n  <img src="x.png">\n</p>\n\n# ogpeek\n';
    expect(stripLogo(md)).toBe("# ogpeek\n");
  });

  it("leaves markdown without a logo block untouched", () => {
    const md = "# ogpeek\n\ntext\n";
    expect(stripLogo(md)).toBe(md);
  });
});

describe("buildIndex", () => {
  const out = buildIndex(CONFIG);

  it("starts with the ogpeek H1 and a blockquote summary", () => {
    expect(out.startsWith("# ogpeek\n")).toBe(true);
    expect(out).toContain("\n> ");
  });

  it("links all three sources as raw README URLs under a Docs section", () => {
    expect(out).toContain("## Docs");
    expect(out).toContain(
      "https://raw.githubusercontent.com/minjun0219/ogpeek/main/packages/ogpeek/README.md",
    );
    expect(out).toContain(
      "https://raw.githubusercontent.com/minjun0219/ogpeek/main/packages/ogpeek-react/README.md",
    );
    expect(out).toContain(
      "https://raw.githubusercontent.com/minjun0219/ogpeek/main/README.md",
    );
  });

  it("points at the inlined full docs under Optional", () => {
    expect(out).toContain("## Optional");
    expect(out).toContain("https://ogpeek.minjun.dev/llms-full.txt");
  });
});

describe("buildFull", () => {
  const sources = {
    root: '<p align="center"><img src="x"></p>\n\n# ogpeek\nroot-body\n',
    engine: "# ogpeek engine\nengine-body\n",
    react: "# @ogpeek/react\nreact-body\n",
  };
  const out = buildFull(sources, CONFIG);

  it("inlines every README body", () => {
    expect(out).toContain("root-body");
    expect(out).toContain("engine-body");
    expect(out).toContain("react-body");
  });

  it("strips the root logo block", () => {
    expect(out).not.toContain('align="center"');
  });

  it("separates sections with horizontal rules", () => {
    expect(out).toContain("\n---\n");
  });

  it("credits the repository as the source of truth", () => {
    expect(out).toContain("github.com/minjun0219/ogpeek");
  });
});

describe("readSources", () => {
  it("reads all three READMEs from the real repo root", () => {
    const s = readSources(repoRoot);
    expect(s.root.length).toBeGreaterThan(0);
    expect(s.engine.length).toBeGreaterThan(0);
    expect(s.react.length).toBeGreaterThan(0);
  });

  it("throws when a source README is missing", () => {
    expect(() => readSources("/no/such/repo")).toThrow();
  });
});

describe("generated output from real READMEs", () => {
  it("full inline carries engine + react content", () => {
    const s = readSources(repoRoot);
    const full = buildFull(s, CONFIG);
    expect(full).toContain("@ogpeek/react");
    expect(full).toContain("OG_TITLE_MISSING");
  });
});

describe("writeAll", () => {
  it("writes three files and the two maps are byte-identical", () => {
    const { paths } = writeAll(repoRoot);
    expect(paths).toHaveLength(3);
    for (const p of paths) {
      expect(existsSync(p)).toBe(true);
    }

    const webMap = readFileSync(join(repoRoot, "website/public/llms.txt"));
    const pkgMap = readFileSync(join(repoRoot, "packages/ogpeek/llms.txt"));
    expect(pkgMap.equals(webMap)).toBe(true);
  });
});

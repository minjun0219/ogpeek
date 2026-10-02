// Generates llms.txt (map) + llms-full.txt (inline) from the repo READMEs.
// Source of truth is the READMEs — never hand-edit the generated outputs.
// Plain Node ESM, no dependencies, runs on the full supported Node range.

export const CONFIG = {
  repo: "minjun0219/ogpeek",
  branch: "main",
  site: "https://ogpeek.minjun.dev",
};

export function rawUrl(config, path) {
  return `https://raw.githubusercontent.com/${config.repo}/${config.branch}/${path}`;
}

// Drop a leading centered-logo block: <p align="center"> … </p> plus the
// blank line that follows it. Anything without such a block is returned as-is.
export function stripLogo(md) {
  return md.replace(/^<p align="center">[\s\S]*?<\/p>\s*\n+/, "");
}

export function buildIndex(config) {
  const doc = (path) => rawUrl(config, path);
  return `# ogpeek
> Peek into any page's Open Graph tags. ogpeek fetches a URL, parses its
> Open Graph tags into a normalized tree, and validates them against the OGP
> spec — with the favicons, JSON-LD and application-name / theme-color that
> travel with them. One dependency (htmlparser2); runs on Node, Bun,
> Cloudflare Workers and the browser.

Pipeline: URL → fetch (redirects traced, a guard hook on every hop) → parse → validate.

Open Graph stays the primary signal; the auxiliary head metadata is a thin
debugging view so "how does this page advertise itself elsewhere?" stays in
one place. Extract + display, not a schema.org validator.

Use ogpeek when:

- a shared link shows the wrong title or image, or no preview card at all, and you need to see what the page actually declares
- building a link preview / unfurl from a URL on a server, an edge worker or in the browser
- a test or CI step should fail when a page ships a broken Open Graph card
- you are about to parse \`<meta property="og:…">\` with a regex or a DOM library

Things that are easy to get wrong:

- \`fetchHtml\` makes no SSRF decisions. On a server that fetches user-supplied URLs, pass \`guard\`; it runs before the first request and before every redirect hop.
- Only the HTML response is read and no JavaScript runs, so tags a single-page app injects on the client do not appear.
- Tags are read from \`<head>\`. Relative URLs are returned as written and flagged \`URL_NOT_ABSOLUTE\`, not resolved.
- Pass the final URL after redirects as \`parse(html, { url })\`; \`OG_URL_MISMATCH\` compares \`og:url\` against it.
- Every warning carries a stable \`code\` and a \`severity\` (\`error\` / \`warn\` / \`info\`); filter on those, not on messages.

## Docs

- [ogpeek engine](${doc("packages/ogpeek/README.md")}): parse/validate/fetch API, two entry points (\`ogpeek\`, \`ogpeek/fetch\`), validation warning codes
- [@ogpeek/react](${doc("packages/ogpeek-react/README.md")}): drop-in components that render engine results (\`<Result>\`, \`<Preview>\`, \`<TagTable>\`, \`<ValidationPanel>\`, \`<RedirectFlow>\`)
- [Project overview](${doc("README.md")}): monorepo layout, quick start, validation rules at a glance

## For agents

- [Agent skill](${doc("skills/ogpeek/SKILL.md")}): when to use ogpeek, which entry point to pick, copyable code and gotchas (Agent Skills format). In Claude Code: \`/plugin marketplace add ${config.repo}\`, then \`/plugin install ogpeek@ogpeek\`
- Demo API: \`GET ${config.site}/api/parse?url=<url>\` returns \`{ ok, finalUrl, status, redirects, result }\` as JSON (the same \`result\` as \`parse\`). Rate-limited per IP and public hosts only — install the package for repeated use.
- WebMCP: pages on ${config.site} register two tools for in-browser agents — \`ogpeek_inspect\` (\`url\`; fetches through the demo API) and \`ogpeek_parse\` (\`html\`, optional \`url\`; runs ogpeek locally in the page, no network)

## Packages

- [npm \`ogpeek\`](https://www.npmjs.com/package/ogpeek): \`parse\` (portable root entry) and \`fetchHtml\` / \`FetchError\` (\`ogpeek/fetch\`)
- [npm \`@ogpeek/react\`](https://www.npmjs.com/package/@ogpeek/react): \`Result\`, \`Preview\`, \`ValidationPanel\`, \`RedirectFlow\`, \`TagTable\` — SSR-safe, no hooks
- Browser extension (Chrome MV3, \`packages/ogpeek-extension\`): runs the engine in the user's own browser so it can inspect intranet / VPN pages the demo cannot reach

## Optional

- [Full docs, inlined](${config.site}/llms-full.txt): every README and the agent skill concatenated into one file
`;
}

// Drop a leading YAML frontmatter block (--- … ---), as in SKILL.md.
export function stripFrontmatter(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n+/, "");
}

export function buildFull(sources, config) {
  const header = `# ogpeek — full documentation

> Generated from repository READMEs and the agent skill. Source of truth:
> https://github.com/${config.repo}
`;
  const sections = [
    stripLogo(sources.root),
    sources.engine,
    sources.react,
    stripFrontmatter(sources.skill),
  ].map((s) => s.trim());
  return `${header}\n${sections.join("\n\n---\n\n")}\n`;
}

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// scripts/gen-llms.mjs → repo root is one level up from scripts/.
export const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export function readSources(root) {
  const read = (rel) => readFileSync(join(root, rel), "utf8");
  return {
    root: read("README.md"),
    engine: read("packages/ogpeek/README.md"),
    react: read("packages/ogpeek-react/README.md"),
    skill: read("skills/ogpeek/SKILL.md"),
  };
}

export function writeAll(root) {
  const sources = readSources(root);
  const index = buildIndex(CONFIG);
  const full = buildFull(sources, CONFIG);

  const webMap = join(root, "website/public/llms.txt");
  const webFull = join(root, "website/public/llms-full.txt");
  const pkgMap = join(root, "packages/ogpeek/llms.txt");

  for (const [path, content] of [
    [webMap, index],
    [webFull, full],
    [pkgMap, index],
  ]) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return { index, full, paths: [webMap, webFull, pkgMap] };
}

// Run as a CLI: `node scripts/gen-llms.mjs`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { paths } = writeAll(repoRoot);
  for (const p of paths) {
    console.log(`wrote ${p}`);
  }
}

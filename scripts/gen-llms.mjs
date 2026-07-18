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
> peek into any page's Open Graph tags — a dependency-light engine
> (parse · fetch · validate) plus drop-in React components.

ogpeek keeps Open Graph as the primary signal and exposes the thin auxiliary
head metadata that travels with it (favicons, JSON-LD, application-name /
theme-color, msapplication tiles) so "how does this page advertise itself
elsewhere?" debugging stays in one place. Extract + display, not a validator.

## Docs

- [ogpeek engine](${doc("packages/ogpeek/README.md")}): parse/validate/fetch API, two entry points (\`ogpeek\`, \`ogpeek/fetch\`), validation warning codes
- [@ogpeek/react](${doc("packages/ogpeek-react/README.md")}): drop-in components that render engine results (\`<Result>\`, \`<Preview>\`, \`<TagTable>\`, \`<ValidationPanel>\`, \`<RedirectFlow>\`)
- [Project overview](${doc("README.md")}): monorepo layout, quick start, validation rules at a glance

## Optional

- [Full docs, inlined](${config.site}/llms-full.txt): every README concatenated into one file
`;
}

export function buildFull(sources, config) {
  const header = `# ogpeek — full documentation

> Generated from repository READMEs. Source of truth:
> https://github.com/${config.repo}
`;
  const sections = [stripLogo(sources.root), sources.engine, sources.react].map(
    (s) => s.trim(),
  );
  return `${header}\n${sections.join("\n\n---\n\n")}\n`;
}

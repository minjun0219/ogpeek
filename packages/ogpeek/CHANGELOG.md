# Changelog

## 0.5.2

### Patch Changes

- [#46](https://github.com/minjun0219/ogpeek/pull/46) [`5ac4480`](https://github.com/minjun0219/ogpeek/commit/5ac4480d679467c33a78cd99df89bf6462b04a9b) Thanks [@minjun0219](https://github.com/minjun0219)! - Make ogpeek easier for coding agents to pick and use correctly: an Agent
  Skill (`skills/ogpeek/SKILL.md`) installable as a Claude Code plugin
  (`/plugin marketplace add minjun0219/ogpeek`), a bundled `llms.txt` that says
  when to use ogpeek and what is easy to get wrong, and sharper npm
  descriptions and keywords. The README now describes `parse()`'s `url` option
  accurately: it is compared against `og:url`, and relative URLs are flagged,
  not resolved.

## 0.5.1

### Patch Changes

- [#41](https://github.com/minjun0219/ogpeek/pull/41) [`b26cb46`](https://github.com/minjun0219/ogpeek/commit/b26cb46caf5eac0a3cac3d8bc574f1f2724becea) Thanks [@minjun0219](https://github.com/minjun0219)! - Point the canonical site at `ogpeek.minjun.dev`: package `homepage` fields and
  the bundled `llms.txt` links now use it, and `ogpeek.dev` 301-redirects there.

## [0.5.0](https://github.com/minjun0219/ogpeek/compare/0.4.0...v0.5.0) (2026-05-06)

### Features

- **website:** add Packages section and point npm homepages at demo site ([#25](https://github.com/minjun0219/ogpeek/issues/25)) ([9e305b6](https://github.com/minjun0219/ogpeek/commit/9e305b635bfd536a18e43cbf645003227d902391))

## [0.4.0](https://github.com/minjun0219/ogpeek/compare/v0.3.0...v0.4.0) (2026-04-28)

### Features

- surface auxiliary head metadata (icons, JSON-LD, app meta) ([#21](https://github.com/minjun0219/ogpeek/issues/21)) ([488f549](https://github.com/minjun0219/ogpeek/commit/488f549b328cfe219da96ce26ad5d534cfaa2475))

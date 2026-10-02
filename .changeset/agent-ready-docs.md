---
"ogpeek": patch
---

Make ogpeek easier for coding agents to pick and use correctly: an Agent
Skill (`skills/ogpeek/SKILL.md`) installable as a Claude Code plugin
(`/plugin marketplace add minjun0219/ogpeek`), a bundled `llms.txt` that says
when to use ogpeek and what is easy to get wrong, and sharper npm
descriptions and keywords. The README now describes `parse()`'s `url` option
accurately: it is compared against `og:url`, and relative URLs are flagged,
not resolved.

# Changesets

This directory is used by
[changesets](https://github.com/changesets/changesets). If you made a
change that needs a release, include a changeset file in the PR:

```sh
pnpm changeset
```

- `ogpeek` / `@ogpeek/react` / `ogpeek-extension` form a **fixed group**
  and always release together at the same version. Selecting any one of
  them bumps all three.
- `website` is not a release target (`ignore`).
- Versions and CHANGELOGs are written by CI's
  `chore(release): Version Packages` PR. Do not hand-edit
  `package.json#version` or the `manifest/*.json` versions —
  `scripts/sync-versions.mjs` keeps them in lockstep.

See `## Releases` in the root `AGENTS.md` for the full release flow.

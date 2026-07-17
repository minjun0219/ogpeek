# Changesets

이 디렉토리는 [changesets](https://github.com/changesets/changesets)가
사용한다. 릴리스가 필요한 변경을 만들었다면 PR에 changeset 파일을 함께
올린다:

```sh
pnpm changeset
```

- `ogpeek` / `@ogpeek/react` / `ogpeek-extension` 세 패키지는 **fixed
  그룹**으로 묶여 있어 항상 같은 버전으로 함께 릴리스된다. 어느 하나를
  선택해도 세 패키지가 같이 범프된다.
- `website`는 릴리스 대상이 아니다 (`ignore`).
- 버전/CHANGELOG 반영은 CI의 `chore(release): Version Packages` PR이
  수행한다. `package.json#version`이나 `manifest/*.json`의 버전을 손으로
  고치지 않는다 — `scripts/sync-versions.mjs`가 lockstep으로 맞춘다.

자세한 릴리스 플로우는 루트 `AGENTS.md`의 `## Releases` 참고.

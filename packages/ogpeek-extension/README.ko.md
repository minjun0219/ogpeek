# ogpeek-extension

> English: [README.md](./README.md)

ogpeek 엔진을 사용자 자신의 브라우저 안에서 실행하는 크로스 브라우저
MV3 확장입니다. 같은 소스가 Chrome / Firefox / Safari로 빌드되도록
설계되어 있고, v1은 **Chrome만** 빌드해서 배포합니다 — Firefox / Safari
매니페스트는 후속 작업용 골격만 두었습니다.

## 왜 확장인가

데모 사이트(`website/`)는 OG fetch를 Cloudflare Workers에서 수행하는데,
사내 VPN이나 사설 k8s ingress 뒤의 호스트에는 워커가 닿지 못합니다.
브라우저 확장의 백그라운드 서비스 워커는 `host_permissions`를 받으면
임의 URL로 `fetch()`를 보낼 수 있고, 그 요청은 **사용자의 머신**에서
브라우저(=OS) 네트워크 스택을 통해 직접 나갑니다 — 페이지 단의 CORS도
받지 않습니다. 사내 페이지를 검사하려면 정확히 이 동작이 필요합니다.

## 설치 (테스터, Chrome)

머지 전 테스트는 CI artifact로 받습니다.

1. 이 브랜치의 [Actions 탭](https://github.com/minjun0219/ogpeek/actions?query=branch%3Aclaude%2Fdesktop-app-alternatives-V2coN)
   에서 가장 최근 **성공**한 CI run 클릭.
2. 실행 페이지 하단 **Artifacts** 섹션의 `ogpeek-chrome-<sha>` 클릭 → zip
   다운로드.
3. zip을 임의 폴더에 **압축 해제**합니다. zip 자체를 로드하면 안 됩니다 —
   Chrome은 unpacked 폴더를 받습니다.
4. `chrome://extensions` 열기 → **개발자 모드** 토글 ON → **압축해제된
   확장 프로그램을 로드합니다** 클릭 → 3단계에서 압축 해제한 폴더(=`manifest.json`이
   바로 들어 있는 폴더) 선택.

사용법: 툴바의 ogpeek 액션 클릭 → URL 입력창은 현재 탭 주소로 자동
채워집니다 → **검사**. 다른 절대 `http(s)://` URL을 직접 붙여 넣어도 됩니다.

Artifact 보존 기간은 30일. 정식 prerelease/release는 PR 머지 후 같은 zip을
첨부해 별도로 만들 예정입니다. v1은 별도 아이콘을 넣지 않아 툴바에는
Chrome 기본 퍼즐 아이콘으로 보입니다.

### 트러블슈팅

- **"매니페스트 파일이 없거나 잘못되었습니다."** — 선택한 폴더 바로
  아래에 `manifest.json`이 있는지 확인하세요. 한 단계 더 깊은 폴더를
  고르면 이 에러가 납니다.
- **Popup이 비어 보이거나 결과가 안 나옴** — `chrome://extensions`에서
  ogpeek 카드의 **서비스 워커** 링크를 클릭해 background DevTools를 열고
  에러를 확인하세요. 사내 프록시 / 방화벽이 outbound 요청을 막고 있을 수
  있습니다.
- **사내망 호스트가 안 됨** — VPN 연결 상태를 먼저 확인하세요. 확장은 OS
  네트워크 스택을 통과하므로, OS 수준에서 해당 호스트에 도달할 수 있어야
  합니다.
- **`TIMEOUT` / `NETWORK` 에러 코드** — 응답이 8초 안에 오지 않거나
  네트워크 호출 자체가 실패한 경우입니다. 다른 URL은 되는데 특정 URL만
  실패한다면 보통 일시적 이슈입니다.

### 권한

`manifest/chrome.json`이 선언하는 권한:

- `activeTab` — popup을 열 때 현재 탭의 URL을 읽어 입력창을 자동
  채우는 용도로만 사용.
- `host_permissions: <all_urls>` — 백그라운드 서비스 워커가 임의
  호스트로 HTTP 요청을 보내기 위해 필요. 페이지 단 CORS를 우회해
  사내망까지 검사할 수 있게 해주는 핵심 권한입니다. **검사** 버튼을
  눌렀을 때만 요청이 발사되며, 백그라운드에서 자동으로 페이지를
  수집하지는 않습니다.

## 레이아웃

```
packages/ogpeek-extension/
├── manifest/
│   ├── chrome.json     # MV3, background.service_worker — v1 빌드 대상
│   ├── firefox.json    # MV3, background.scripts (FF SW 부분 지원) — 골격만
│   └── safari.json     # MV3 base; macOS Xcode 래퍼 필요 — 골격만
├── popup.html          # popup entry (Vite multi-page input)
├── src/
│   ├── popup/          # React UI (App, styles, entry)
│   ├── background/     # `fetchHtml`을 실행하는 서비스 워커
│   └── lib/            # `browser` 폴리필 재export, 메시지 타입
├── scripts/zip.mjs     # dist/<browser>/ → dist/ogpeek-<browser>.zip
└── vite.config.ts      # BROWSER=<target> vite build
```

## 크로스 브라우저 설계

- 모든 확장 API 호출은 `webextension-polyfill`(`browser.*`)을 거칩니다.
  `chrome.*` 직접 호출 금지 — 폴리필이 Chrome의 콜백 시그니처를 Firefox /
  Safari의 promise 기반 `browser` 네임스페이스로 정규화해 주므로 같은
  모듈이 세 브라우저에서 동일하게 동작합니다.
- 각 브라우저는 `manifest/` 아래에 자기 매니페스트를 가집니다. Vite
  빌드가 그중 하나를 `dist/<browser>/manifest.json`으로 복사합니다.
  Firefox는 `background.service_worker` 대신 `background.scripts`가
  필요하고, Safari는 Chrome과 매니페스트는 같지만 배포 시
  `xcrun safari-web-extension-converter`로 Xcode 앱 래퍼를 만들어야
  합니다 — 후속 작업.
- popup과 background 엔트리는 고정 파일명(`popup.html`, `background.js`)을
  사용하므로 매니페스트의 빌드 타임 재작성이 필요 없습니다.

## 빌드 (개발자)

빌드는 워크스페이스 라이브러리를 먼저 만듭니다.

```bash
pnpm libs:build                          # ogpeek + @ogpeek/react dist 보장
pnpm -F ogpeek-extension build           # build:chrome 별칭
pnpm -F ogpeek-extension package:chrome  # build + zip
```

산출물:

- `dist/chrome/` — unpacked 확장 (`chrome://extensions` → *압축해제된
  확장 프로그램 로드*에 바로 사용).
- `dist/ogpeek-chrome.zip` — 배포용 아카이브.

`build:firefox`, `build:safari`는 스크립트가 연결돼 있지만 v1 CI에서는
비활성입니다.

## 배포

웹 스토어 배포 안 함. zip을 GitHub Releases로 배포해 unpacked 로드하거나,
관리형 환경에서는 Chrome enterprise policy(`ExtensionInstallForcelist` +
사내 호스팅 update manifest)로 푸시할 수 있습니다. CRX 패키징 파이프라인은
v1에서 의도적으로 out-of-scope.

## 아이콘

현재 빌드는 별도 아이콘을 넣지 않아 Chrome이 기본 퍼즐 아이콘으로 표시
합니다. `public/icons/{16,32,48,128}.png`를 추가하고 각 매니페스트에서
참조하도록 만드는 건 v1.1 정리 항목.

## SSRF

엔진의 `guard` 훅은 여기서 의도적으로 비워 둡니다. `AGENTS.md` 원칙 3에
따라 SSRF 정책은 caller 책임이며, 확장은 단일 사용자의 로컬 컨텍스트에서
실행되므로 보호할 공유 인프라가 없습니다 — 보호 대상은 사용자 자기 머신
하나뿐. 만약 이 코드를 공유 배포 환경에 임베드하게 된다면
`fetchHtml({ guard })`로 가드를 주입하세요.

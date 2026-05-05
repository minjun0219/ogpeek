# ogpeek 크롬 확장 설치하기

> English: [INSTALL.md](./INSTALL.md) · 개발자 문서: [README.md](./README.md)

ogpeek 확장은 사용자 브라우저에서 직접 페이지의 OG 태그를 검사합니다 —
사내망 / VPN 너머 페이지처럼 공개 데모(Cloudflare Workers)가 닿지 못하는
호스트도 그대로 inspect 할 수 있습니다.

## 1. 빌드된 zip 받기

머지 전 테스트는 CI artifact로 받습니다.

1. PR의 [Actions 탭](https://github.com/minjun0219/ogpeek/actions?query=branch%3Aclaude%2Fdesktop-app-alternatives-V2coN)
   에서 가장 최근 **성공**한 CI run 클릭
2. 실행 페이지 하단 **Artifacts** 섹션의 `ogpeek-chrome-<sha>` 클릭 →
   zip 다운로드
3. 받은 zip을 임의의 폴더에 **압축 해제** (zip 자체를 로드하면 안 됩니다)

> Artifact 보존 기간은 30일. 정식 prerelease/release는 PR 머지 후 별도로
> 만들 예정.

## 2. Chrome에 unpacked로 설치

1. 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 토글 **ON**
3. 좌측 상단 **압축해제된 확장 프로그램을 로드합니다** 클릭
4. 1단계에서 **압축 해제한 폴더**(`manifest.json`이 바로 들어있는 폴더)를 선택

설치되면 브라우저 툴바에 ogpeek 항목이 추가됩니다(아이콘은 v1에서 별도
지정하지 않아 Chrome 기본 퍼즐 아이콘으로 보입니다). 자주 쓸 거라면
확장 메뉴(퍼즐 모양)에서 핀 버튼을 눌러 툴바에 고정해 두면 편합니다.

## 3. 사용법

1. 검사할 페이지에서 툴바의 ogpeek 아이콘 클릭
2. URL 입력창은 현재 탭의 주소로 자동 채워집니다 → **검사** 버튼
3. popup에 검증 결과 / 리디렉션 흐름 / 메타 태그 표 / 미리보기가 차례로
   표시됩니다

직접 다른 URL(`https://example.com` 같은 절대 URL)을 입력해도 됩니다.
http / https 외의 스킴은 거부합니다.

## 트러블슈팅

- **"매니페스트 파일이 없거나 잘못되었습니다."** — 압축 해제한 폴더의
  바로 아래에 `manifest.json`이 있는지 확인하세요. 한 단계 더 깊은 폴더를
  선택하면 이 에러가 납니다.
- **Popup이 비어 보이거나 검사 결과가 안 나옴** —
  `chrome://extensions` 에서 ogpeek 카드의 **서비스 워커** 링크를 클릭해
  background DevTools를 열고 에러를 확인. 사내 프록시/방화벽이 outbound
  요청을 막고 있을 수 있습니다.
- **사내망 호스트가 안 됨** — VPN 연결 상태를 먼저 확인하세요. 확장은
  운영체제의 네트워크 스택을 통과하므로, OS 수준에서 해당 호스트에
  도달할 수 있어야 합니다.
- **`TIMEOUT` / `NETWORK` 같은 에러 코드** — 응답이 8초 안에 오지
  않거나 네트워크 자체가 실패한 경우입니다. 다른 URL로 동일하게 재현되는
  경우가 아니면 보통 일시적 네트워크 이슈입니다.

## 제거

`chrome://extensions` 에서 ogpeek 카드의 **삭제** 버튼 클릭.

## 이 확장이 보내는 권한

매니페스트(`manifest/chrome.json`)가 요청하는 권한:

- `activeTab` — 툴바 클릭 시 현재 탭의 URL 자동 채움 용도
- `host_permissions: <all_urls>` — background 서비스 워커가 임의 호스트로
  HTTP 요청을 보내기 위해 필요. 페이지 단의 CORS를 우회해 사내망까지
  검사할 수 있게 하는 핵심 권한입니다. 사용자가 *검사* 버튼을 눌렀을 때만
  발동하며, 백그라운드에서 페이지를 자동 수집하지는 않습니다.

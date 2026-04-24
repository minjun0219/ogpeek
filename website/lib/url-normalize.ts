// 사용자 입력에 스킴이 빠져 있으면 https:// 를 붙여 엔진의 INVALID_URL /
// UNSUPPORTED_SCHEME 차단을 피한다. 이미 http(s):// 가 있으면 그대로 둔다.
// 잘못된 입력은 굳이 막지 않고 엔진이 INVALID_URL 로 보고하게 둔다 — 한 곳
// 에서만 검증한다.
export function normalizeUrlInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

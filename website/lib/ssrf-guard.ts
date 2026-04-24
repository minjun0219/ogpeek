import { isIP } from "node:net";
import { FetchError } from "ogpeek/fetch";

// ogpeek 엔진은 SSRF 정책을 판단하지 않는다 (fetchHtml FetchOptions.guard
// 주석 참고). 이 파일이 website 의 자체 가드 — 사용자가 입력한 임의 URL 을
// 서버에서 fetch 하기 직전에 호출된다. 구현 전략:
//   1) hostname 문자열 검사: localhost / *.localhost / 리터럴 사설 IP 차단.
//   2) strict DNS 리졸브: resolve4/6 으로 hostname 을 IP 로 풀고 사설/루프백/
//      링크로컬/CGNAT/멀티캐스트/메타데이터 대역을 차단.
//
// strict 단계는 Node 20+ 의 `node:dns/promises` 가 필요하며 API route 의
// `export const runtime = "nodejs"` 를 전제한다. Cloudflare Workers 등
// nodejs_compat 의 resolve4/6 이 미구현인 환경에서는 strict 단계가 throw
// 하는데, 그 경우 호출자(website)가 배포 모드에 맞춰 hostname-only 로 대체
// 하거나 배포 전략 자체를 재고해야 한다 — 엔진의 기본값을 뒤집는 게 아니라.
//
// DNS rebinding TOCTOU: resolve 는 요청 전에, fetch() 는 연결 시에 다시 해석
// 한다. 완전 방어는 검증한 IP 로 직접 connect 하고 Host/SNI 에 원 hostname 을
// 넣는 커스텀 undici Dispatcher 가 필요 — 현재 범위는 "공개 DNS 가 신뢰
// 가능한" 배포 환경을 전제한 얕은 방어까지다.

export const ssrfGuard = async (url: URL): Promise<void> => {
  assertSafeHostname(url.hostname);
  await assertResolvesToPublic(url.hostname);
};

function assertSafeHostname(hostname: string): void {
  if (!hostname) {
    throw new FetchError("BLOCKED_HOST", 400, "hostname is empty");
  }
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) {
    throw new FetchError("BLOCKED_PRIVATE_HOST", 400, `hostname "${hostname}" is a loopback name`);
  }
  const literalKind = isIP(hostname);
  if (literalKind !== 0 && isPrivateIp(hostname, literalKind)) {
    throw new FetchError("BLOCKED_PRIVATE_IP", 400, `ip ${hostname} is in a private range`);
  }
}

async function assertResolvesToPublic(hostname: string): Promise<void> {
  // 리터럴 IP는 assertSafeHostname 에서 이미 판정.
  if (isIP(hostname) !== 0) return;

  let resolve4: typeof import("node:dns/promises").resolve4;
  let resolve6: typeof import("node:dns/promises").resolve6;
  try {
    ({ resolve4, resolve6 } = await import("node:dns/promises"));
  } catch {
    throw new FetchError(
      "SSRF_UNSUPPORTED",
      500,
      "current runtime does not support node:dns/promises",
    );
  }

  const results = await Promise.allSettled([resolve4(hostname), resolve6(hostname)]);
  const addrs: Array<{ address: string; family: 4 | 6 }> = [];
  for (const [idx, r] of results.entries()) {
    if (r.status === "fulfilled") {
      for (const a of r.value) addrs.push({ address: a, family: idx === 0 ? 4 : 6 });
    }
  }
  // 둘 다 실패했으면 DNS 자체가 실패한 것 — 명시적으로 보고.
  if (addrs.length === 0) {
    throw new FetchError("DNS_FAILED", 400, `failed to resolve "${hostname}"`);
  }
  for (const { address, family } of addrs) {
    if (isPrivateIp(address, family)) {
      throw new FetchError(
        "BLOCKED_PRIVATE_IP",
        400,
        `hostname "${hostname}" resolves to private ip ${address}`,
      );
    }
  }
}

function isPrivateIp(ip: string, family: number): boolean {
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return false;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return true; // malformed → treat as unsafe
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + AWS/GCP metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fe8") || lower.startsWith("fe9")) return true;
  if (lower.startsWith("fea") || lower.startsWith("feb")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice("::ffff:".length);
    if (isIP(v4) === 4) return isPrivateIpv4(v4);
  }
  return false;
}

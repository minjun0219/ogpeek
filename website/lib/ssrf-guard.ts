import { isIP } from "node:net";
import { lookup, resolve4, resolve6 } from "node:dns/promises";
import { FetchError } from "ogpeek/fetch";

// ogpeek 엔진은 SSRF 정책을 판단하지 않는다 (fetchHtml FetchOptions.guard
// 주석 참고). 이 파일이 website 의 자체 가드 — 사용자가 입력한 임의 URL 을
// 서버에서 fetch 하기 직전에 호출된다. 구현 전략:
//   1) hostname 문자열 검사: localhost / *.localhost / 리터럴 사설 IP 차단.
//   2) strict DNS 리졸브: resolve4/6 으로 hostname 을 IP 로 풀고 사설/루프백/
//      링크로컬/CGNAT/멀티캐스트(v4/v6)/메타데이터 대역을 차단.
//
// strict 단계는 Node 20+ 의 `node:dns/promises` 가 필요하며 API route 의
// `export const runtime = "nodejs"` 를 전제한다. Cloudflare Workers 등
// nodejs_compat 의 resolve4/6 이 "Not implemented" 로 reject 하는 환경에서는
// `SSRF_UNSUPPORTED` 로 즉시 throw 한다 — 한 쪽이라도 미구현이면 공격자가
// IPv4-only/IPv6-only 경로로 숨어 우회할 수 있으므로 partial pass 는 허용하지
// 않는다.
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

  const results = await Promise.allSettled([resolve4(hostname), resolve6(hostname)]);

  // "Not implemented" 류 에러는 런타임 미지원이다 — ENODATA (해당 record
  // type 없음) 같은 정상적 DNS 결과와 섞어서 DNS_FAILED 로 내보내면 안 된다.
  // 한쪽이라도 미지원이면 가드가 무력화되는 것이므로 바로 500 으로 throw.
  for (const [idx, r] of results.entries()) {
    if (r.status !== "rejected") continue;
    const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
    if (/not implemented/i.test(msg)) {
      throw new FetchError(
        "SSRF_UNSUPPORTED",
        500,
        `dns.${idx === 0 ? "resolve4" : "resolve6"} is not implemented in this runtime: ${msg}`,
      );
    }
  }

  const addrs: Array<{ address: string; family: 4 | 6 }> = [];
  // resolve4/6 은 명목상 IP 만 돌려주지만, c-ares 가 응답에서 A/AAAA 를 찾지
  // 못하고 CNAME 체인만 받아온 환경에서는 CNAME target 문자열이 섞여 나오는
  // 사례가 관찰된다(예: "www.naver.com." → "www.naver.com.nheos.com."). isIP
  // 로 걸러내지 않으면 아래 isPrivateIp 의 "형식이 틀리면 사설" 규칙에 걸려
  // 공개 호스트에 BLOCKED_PRIVATE_IP 가 잘못 찍힌다.
  for (const [idx, r] of results.entries()) {
    if (r.status !== "fulfilled") continue;
    const expected: 4 | 6 = idx === 0 ? 4 : 6;
    for (const a of r.value) {
      if (isIP(a) === expected) addrs.push({ address: a, family: expected });
    }
  }

  // resolve4/6 이 IP 를 하나도 건지지 못했다면 (CNAME 미추적 등) OS 의
  // getaddrinfo 로 한 번 더 시도. 어떤 경로로 얻었든 아래 사설 대역 검사를
  // 통과해야 하므로 /etc/hosts 경유여도 SSRF 우회는 불가능.
  if (addrs.length === 0) {
    try {
      const looked = await lookup(hostname, { all: true, verbatim: true });
      for (const entry of looked) {
        if (entry.family === 4 || entry.family === 6) {
          addrs.push({ address: entry.address, family: entry.family });
        }
      }
    } catch {
      // 무시 — 아래 DNS_FAILED 로 떨어진다.
    }
  }

  // 둘 다 실패했고 미지원 케이스도 아니면 진짜 DNS 실패. 원인을 메시지에 남겨
  // 운영 디버깅을 돕는다.
  if (addrs.length === 0) {
    const reasons = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))
      .join("; ");
    throw new FetchError(
      "DNS_FAILED",
      400,
      `failed to resolve "${hostname}" to any ip${reasons ? `: ${reasons}` : ""}`,
    );
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
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 unique-local
  if (lower.startsWith("ff")) return true; // ff00::/8 multicast
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice("::ffff:".length);
    if (isIP(v4) === 4) return isPrivateIpv4(v4);
  }
  return false;
}

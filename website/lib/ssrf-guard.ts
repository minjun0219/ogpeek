import ipaddr from "ipaddr.js";
import { FetchError } from "ogpeek/fetch";

// ogpeek 엔진은 SSRF 정책을 판단하지 않는다 (fetchHtml FetchOptions.guard
// 주석 참고). 이 파일이 데모 사이트의 자체 가드 — 사용자가 입력한 임의 URL
// 을 서버에서 fetch 하기 직전에 호출된다.
//
// 구현 전략:
//   1) hostname 문자열 검사: localhost / *.localhost / 리터럴 사설 IP 차단.
//   2) DNS-over-HTTPS (cloudflare-dns.com) 로 A/AAAA 를 풀고, ipaddr.js 의
//      `range()` 가 "unicast" 가 아닌 모든 대역(private/loopback/linkLocal/
//      multicast/uniqueLocal/carrierGradeNat/6to4/teredo/ipv4Mapped/reserved/
//      unspecified/…) 을 일괄 차단.
//
// DoH 를 쓰는 이유: 데모 사이트는 Cloudflare Workers 한 곳에만 배포한다.
// Workers 런타임에는 `node:dns/promises` 의 `resolve4/6` 이 없고 raw TCP 도
// 열어주지 않는다. fetch() 한 발로 끝나는 DoH JSON API 가 Node 와 Workers
// 양쪽에서 동일하게 굴러가는 유일한 경로.
//
// DNS rebinding TOCTOU: DoH 로 검증한 IP 와 실제 fetch() 가 connect 시 다시
// 해석한 IP 사이의 창은 열려 있다. 완전 방어는 검증한 IP 로 직접 connect
// 하는 커스텀 dispatcher 가 필요한데 Workers 에서는 불가능하다 — 데모
// 수준에서는 "공개 DNS 가 신뢰 가능한" 환경을 전제한 얕은 방어까지로 둔다.

const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const DOH_TIMEOUT_MS = 3000;

type DohAnswer = { name: string; type: number; TTL: number; data: string };
type DohResponse = { Status: number; Answer?: DohAnswer[] };

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
  if (ipaddr.isValid(hostname) && isPrivateIp(hostname)) {
    throw new FetchError("BLOCKED_PRIVATE_IP", 400, `ip ${hostname} is in a private range`);
  }
}

async function dohResolve(hostname: string, type: "A" | "AAAA"): Promise<string[]> {
  const target = `${DOH_ENDPOINT}?name=${encodeURIComponent(hostname)}&type=${type}`;
  const res = await fetch(target, {
    headers: { accept: "application/dns-json" },
    signal: AbortSignal.timeout(DOH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`DoH ${type} HTTP ${res.status}`);
  }
  const data = (await res.json()) as DohResponse;
  // Status 0 = NOERROR, 3 = NXDOMAIN. NXDOMAIN 은 "이 record type 없음" 일
  // 수 있으므로 다른 type 결과로 보완할 수 있게 빈 배열로 반환한다. 그 외
  // 비정상 status (SERVFAIL 등) 는 진짜 DNS 실패로 취급해 throw.
  if (data.Status !== 0 && data.Status !== 3) {
    throw new Error(`DoH ${type} status ${data.Status}`);
  }
  const recordType = type === "A" ? 1 : 28;
  return (data.Answer ?? [])
    .filter((a) => a.type === recordType)
    .map((a) => a.data);
}

async function assertResolvesToPublic(hostname: string): Promise<void> {
  // 리터럴 IP는 assertSafeHostname 에서 이미 판정했다.
  if (ipaddr.isValid(hostname)) return;

  const [v4, v6] = await Promise.all([
    dohResolve(hostname, "A").catch((err: unknown) => err as Error),
    dohResolve(hostname, "AAAA").catch((err: unknown) => err as Error),
  ]);
  const v4Ok = Array.isArray(v4);
  const v6Ok = Array.isArray(v6);

  if (!v4Ok && !v6Ok) {
    const r4 = v4 instanceof Error ? v4.message : String(v4);
    const r6 = v6 instanceof Error ? v6.message : String(v6);
    throw new FetchError(
      "DNS_FAILED",
      400,
      `failed to resolve "${hostname}": ${r4}; ${r6}`,
    );
  }

  const addrs: string[] = [];
  if (v4Ok) addrs.push(...(v4 as string[]));
  if (v6Ok) addrs.push(...(v6 as string[]));

  if (addrs.length === 0) {
    throw new FetchError(
      "DNS_FAILED",
      400,
      `"${hostname}" 는 A/AAAA 레코드가 없습니다.`,
    );
  }

  for (const address of addrs) {
    if (isPrivateIp(address)) {
      throw new FetchError(
        "BLOCKED_PRIVATE_IP",
        400,
        `hostname "${hostname}" resolves to private ip ${address}`,
      );
    }
  }
}

// ipaddr.js 의 range() 가 "unicast" 를 돌려주는 경우만 공인 IP 로 통과시킨다.
// private/loopback/linkLocal/multicast/uniqueLocal/carrierGradeNat/reserved/
// unspecified/broadcast/benchmarking/6to4/teredo/ipv4Mapped/rfc6145/rfc6052/
// as112/orchid2 등은 모두 차단 대상. ipaddr.process() 는 IPv4-mapped IPv6
// (::ffff:a.b.c.d) 를 IPv4 로 언랩하므로 ::ffff:10.0.0.1 같은 터널링 우회도
// 내부 IPv4 기준으로 제대로 사설 판정된다.
function isPrivateIp(ip: string): boolean {
  let addr: ReturnType<typeof ipaddr.process>;
  try {
    addr = ipaddr.process(ip);
  } catch {
    return true; // 파싱 불가 → 안전하게 차단.
  }
  return addr.range() !== "unicast";
}

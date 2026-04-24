import { lookup as dnsLookup } from "node:dns/promises";
import type { LookupFunction } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import { FetchError } from "ogpeek/fetch";
import { isPrivateIp } from "./ssrf-guard";

// undici Agent 의 커스텀 connect.lookup. pre-flight ssrfGuard 가 통과시킨 뒤에도
// DNS rebinding TOCTOU 창은 남아 있다 — 짧은 TTL 레코드로 해석 결과가 hop 사이
// 에 뒤바뀔 수 있다. 소켓 연결 직전 한 번 더 풀고 공인 IP 만 골라 connect 한다.
// 전부 사설이면 FetchError 로 차단.
//
// lookup 시그니처는 node:dns lookup 과 동일: (hostname, opts, callback).
// undici v8 는 `opts.all === true` 로 호출하므로 array 응답을 돌려줘야 한다 —
// 단일 string 으로 답하면 connector 가 `Invalid IP address: undefined` 로 실패
// 한다. `verbatim: true` 로 OS 정렬 재정렬 회피 (pre-flight 와 동일 기준).
const safeLookup: LookupFunction = (hostname, opts, callback) => {
  dnsLookup(hostname, { all: true, verbatim: true })
    .then((results) => {
      const safe = results.filter((entry) => !isPrivateIp(entry.address));
      if (safe.length === 0) {
        callback(
          new FetchError(
            "BLOCKED_PRIVATE_IP",
            400,
            `connect-time: "${hostname}" 는 사설/예약 IP 로만 해석됩니다.`,
          ),
          "",
          0,
        );
        return;
      }
      if ((opts as { all?: boolean } | undefined)?.all) {
        // undici 는 array 시그니처일 때 family 인자를 무시하므로 0 으로 패스.
        callback(null, safe as unknown as string, 0);
      } else {
        callback(null, safe[0]!.address, safe[0]!.family);
      }
    })
    .catch((err: unknown) => {
      callback(err instanceof Error ? err : new Error(String(err)), "", 0);
    });
};

const agent = new Agent({ connect: { lookup: safeLookup } });

// undici 는 URL 의 hostname 을 TLS SNI 와 HTTP Host 헤더에 그대로 쓴다 —
// 커스텀 lookup 이 IP 를 돌려줘도 SNI/Host 는 원 hostname 이 유지되므로
// 가상호스팅/인증서 검증이 정상 작동한다.
export const safeFetch: typeof fetch = (url, init?) =>
  undiciFetch(
    url as Parameters<typeof undiciFetch>[0],
    { ...((init ?? {}) as Parameters<typeof undiciFetch>[1]), dispatcher: agent },
  ) as unknown as Promise<Response>;

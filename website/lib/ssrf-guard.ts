import ipaddr from "ipaddr.js";
import { FetchError } from "ogpeek/fetch";

// The ogpeek engine does not make SSRF policy decisions (see the comment on
// fetchHtml's FetchOptions.guard). This file is the demo site's own guard —
// it runs right before the server fetches a user-supplied URL.
//
// Strategy:
//   1) Hostname string check: block localhost / *.localhost / literal
//      private IPs.
//   2) DNS-over-HTTPS (cloudflare-dns.com) lookup of A/AAAA, then block
//      every range where ipaddr.js's `range()` returns anything other than
//      "unicast" (private / loopback / linkLocal / multicast / uniqueLocal /
//      carrierGradeNat / 6to4 / teredo / ipv4Mapped / reserved /
//      unspecified / ...).
//
// Why DoH: the demo is deployed only to Cloudflare Workers. The Workers
// runtime has no `node:dns/promises` `resolve4/6`, and it does not let you
// open raw TCP. A single-fetch() DoH JSON API is the only path that runs
// identically on Node and on Workers.
//
// DNS rebinding TOCTOU: a window remains open between the IP DoH validated
// and the IP fetch() resolves at connect time. Full defence would require
// a custom dispatcher that connects directly to the validated IP, which is
// impossible on Workers — at the demo level we stop at this shallow
// defence, with the assumption that public DNS is trustworthy.

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
  // Status 0 = NOERROR, 3 = NXDOMAIN. NXDOMAIN can simply mean "no record
  // of this type", so return an empty array and let the other type's result
  // fill in. Anything else (SERVFAIL etc.) is treated as a real DNS failure
  // and thrown.
  if (data.Status !== 0 && data.Status !== 3) {
    throw new Error(`DoH ${type} status ${data.Status}`);
  }
  const recordType = type === "A" ? 1 : 28;
  return (data.Answer ?? []).filter((a) => a.type === recordType).map((a) => a.data);
}

async function assertResolvesToPublic(hostname: string): Promise<void> {
  // Literal IPs were already adjudicated in assertSafeHostname.
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
    throw new FetchError("DNS_FAILED", 400, `failed to resolve "${hostname}": ${r4}; ${r6}`);
  }

  const addrs: string[] = [];
  if (v4Ok) addrs.push(...(v4 as string[]));
  if (v6Ok) addrs.push(...(v6 as string[]));

  if (addrs.length === 0) {
    throw new FetchError("DNS_FAILED", 400, `"${hostname}" has no A/AAAA records`);
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

// Only let an IP through as public when ipaddr.js's range() returns
// "unicast". Block everything else: private / loopback / linkLocal /
// multicast / uniqueLocal / carrierGradeNat / reserved / unspecified /
// broadcast / benchmarking / 6to4 / teredo / ipv4Mapped / rfc6145 /
// rfc6052 / as112 / orchid2, etc. ipaddr.process() unwraps IPv4-mapped
// IPv6 (::ffff:a.b.c.d) into the underlying IPv4, so tunnelled forms like
// ::ffff:10.0.0.1 are still classified as private against the inner IPv4.
function isPrivateIp(ip: string): boolean {
  let addr: ReturnType<typeof ipaddr.process>;
  try {
    addr = ipaddr.process(ip);
  } catch {
    return true; // Unparseable → fail closed.
  }
  return addr.range() !== "unicast";
}

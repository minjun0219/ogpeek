import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 최소 OpenNext 설정 — 기본 캐시·큐(인메모리)만 사용한다.
// ISR이나 D1 KV로 캐시를 옮길 일이 생기면 incrementalCache, queue, tagCache를
// 여기서 명시한다. 지금 ogpeek는 사용자 입력에 따라 SSR만 도는 도구라
// incremental cache를 별도 스토어에 둘 이유가 없다.
export default defineCloudflareConfig();

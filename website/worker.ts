// Custom worker entry around the OpenNext build output. It folds former
// hosts into the canonical URL before Next sees the request — see
// lib/legacy-redirect.ts for why this cannot live in Next middleware.
// OpenNext 빌드 결과를 감싸는 워커 엔트리다. Next 가 요청을 보기 전에 옛 호스트를
// 정본 URL 로 보낸다. Next middleware 에 둘 수 없는 이유는 lib/legacy-redirect.ts 에 있다.
// `.open-next/worker.js` exists only after `opennextjs-cloudflare build`, so
// tsconfig excludes this file; wrangler bundles it after that build.
// `.open-next/worker.js` 는 빌드 뒤에만 생기므로 tsconfig 에서 이 파일을 뺐고,
// wrangler 가 그 빌드 다음에 번들한다.
import { default as handler } from "./.open-next/worker.js";
import { legacyRedirect } from "./lib/legacy-redirect";

export {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";

export default {
  fetch(request: Request, env: unknown, ctx: unknown) {
    return legacyRedirect(request) ?? handler.fetch(request, env, ctx);
  },
};

// Custom worker entry around the OpenNext build output. On a former host it
// moves the request under the base path before Next sees it — see
// lib/legacy-host.ts for why this cannot live in Next middleware.
// OpenNext 빌드 결과를 감싸는 워커 엔트리다. 옛 호스트로 온 요청은 Next 가 보기 전에
// base 경로 아래로 옮긴다. Next middleware 에 둘 수 없는 이유는 lib/legacy-host.ts 에 있다.
// `.open-next/worker.js` exists only after `opennextjs-cloudflare build`, so
// tsconfig excludes this file; wrangler bundles it after that build.
// `.open-next/worker.js` 는 빌드 뒤에만 생기므로 tsconfig 에서 이 파일을 뺐고,
// wrangler 가 그 빌드 다음에 번들한다.
import { default as handler } from "./.open-next/worker.js";
import { legacyRewrite } from "./lib/legacy-host";

export {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";

type Env = { ASSETS: { fetch(request: Request): Promise<Response> } };

export default {
  async fetch(request: Request, env: Env, ctx: unknown) {
    const rewritten = legacyRewrite(request);
    if (rewritten) {
      // Static files are served by the assets layer before this worker runs,
      // matched on the original path. A rewritten "/llms.txt" never got that
      // lookup, so ask the binding for "/ogpeek/llms.txt" ourselves.
      // 정적 파일은 이 워커보다 먼저 에셋 레이어가 원래 경로로 찾는다. 재작성한
      // "/llms.txt" 는 그 조회를 거치지 않았으므로 "/ogpeek/llms.txt" 를 직접 묻는다.
      const asset = await env.ASSETS.fetch(rewritten);
      if (asset.status !== 404) {
        return asset;
      }
    }
    return handler.fetch(rewritten ?? request, env, ctx);
  },
};

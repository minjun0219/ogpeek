// Custom worker entry around the OpenNext build output. It handles what Next
// cannot see with `basePath` set: requests on former hosts (no base in the
// path) and the app root's trailing slash. It also answers the landing page
// in Markdown: at the copy address, and at the page URL by Accept.
// OpenNext 빌드 결과를 감싸는 워커 엔트리다. `basePath` 를 켠 Next 가 보지 못하는
// 것 — 경로에 base 가 없는 옛 호스트 요청과 앱 루트의 끝 슬래시 — 를 맡는다. 랜딩
// 페이지의 마크다운도 여기서 응답한다. 사본 주소에서, 그리고 Accept 에 따라 페이지 주소에서다.
// `.open-next/worker.js` exists only after `opennextjs-cloudflare build`, so
// tsconfig excludes this file; wrangler bundles it after that build.
// `.open-next/worker.js` 는 빌드 뒤에만 생기므로 tsconfig 에서 이 파일을 뺐고,
// wrangler 가 그 빌드 다음에 번들한다.
import { default as handler } from "./.open-next/worker.js";
import { serveLandingMarkdown } from "./lib/landing-markdown";
import { legacyRedirect } from "./lib/legacy-redirect";
import { rootSlash } from "./lib/root-slash";

export {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";

export default {
  fetch(request: Request, env: unknown, ctx: unknown) {
    // Former hosts 301 to minjun.kim/ogpeek/ (lib/legacy-redirect.ts); the
    // app root ends in a slash (lib/root-slash.ts).
    // 옛 호스트는 minjun.kim/ogpeek/ 로 301 하고(lib/legacy-redirect.ts), 앱 루트는
    // 끝 슬래시다(lib/root-slash.ts).
    const legacy = legacyRedirect(request);
    if (legacy) {
      return legacy;
    }
    const root = rootSlash(request);
    if (root instanceof Response) {
      return root;
    }
    // The landing page in Markdown, at the copy address or by Accept
    // (lib/landing-markdown.ts); everything else goes to Next.
    // 사본 주소에서, 또는 Accept 에 따라 페이지 주소에서 랜딩 페이지를 마크다운으로
    // 응답하고(lib/landing-markdown.ts), 나머지는 Next 로 넘긴다.
    return serveLandingMarkdown(request, () =>
      handler.fetch(root ?? request, env, ctx),
    );
  },
};

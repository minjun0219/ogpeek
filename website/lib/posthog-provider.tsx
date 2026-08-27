"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { type ReactNode, useEffect, useState } from "react";
import type { Lang } from "./i18n";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/**
 * PostHog 초기화 래퍼.
 *
 * - 키가 없으면(로컬 개발·포크 빌드) 아무것도 하지 않고 children 만 통과시킨다.
 *   NEXT_PUBLIC_* 는 빌드 타임에 인라인되므로, 키 없이 빌드된 번들에는
 *   PostHog 가 아예 붙지 않는다.
 * - `defaults: "2025-05-24"` 가 App Router 의 history 기반 SPA 네비게이션을
 *   자동으로 $pageview / $pageleave 로 잡아주므로 수동 캡처가 필요 없다.
 * - `lang` 은 super property 로 등록해서 모든 이벤트가 /en · /ko 로 쪼개지게 한다.
 */
export function PostHogProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!KEY) {
      return;
    }
    posthog.init(KEY, {
      api_host: HOST,
      defaults: "2025-05-24",
      person_profiles: "identified_only",
    });
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      posthog.register({ lang });
    }
  }, [ready, lang]);

  if (!KEY || !ready) {
    return <>{children}</>;
  }
  return <PHProvider client={posthog}>{children}</PHProvider>;
}

"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { type ReactNode, useEffect, useState } from "react";
import type { Lang } from "./i18n";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/**
 * PostHog init wrapper.
 *
 * - Without a key (local dev, forks) it does nothing and passes children
 *   through — no init call is made and no events are sent.
 * - `defaults: "2025-05-24"` turns the App Router's history-based SPA
 *   navigations into automatic $pageview / $pageleave capture, so no
 *   manual capture calls are needed.
 * - `lang` is registered as a super property synchronously after init —
 *   before the automatic initial $pageview is flushed — so every event
 *   splits by /en · /ko.
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
      // When api_host points at a reverse proxy, keep PostHog app links
      // (toolbar etc.) working by naming the real app host.
      ui_host: "https://us.posthog.com",
      defaults: "2025-05-24",
      person_profiles: "identified_only",
    });
    // Register before the automatic initial $pageview so the very first
    // event already carries the language. Read from <html lang> (set by the
    // layout) instead of the prop to keep this init effect dependency-free.
    posthog.register({ lang: document.documentElement.lang });
    setReady(true);
  }, []);

  // Keep the super property in sync when the user switches languages.
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

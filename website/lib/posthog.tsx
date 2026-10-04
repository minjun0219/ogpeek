"use client";

import { useEffect } from "react";
import type { Lang } from "./i18n";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/**
 * PostHog bootstrap.
 *
 * - posthog-js is loaded via dynamic import, and only when a key is set.
 *   In a keyless build (local dev, forks) the import is never executed, so
 *   the browser never downloads any PostHog code — the lazy chunk is still
 *   emitted at build time, it just stays unreferenced.
 * - `defaults: "2025-05-24"` turns the App Router's history-based SPA
 *   navigations into automatic $pageview / $pageleave capture.
 * - `lang` is registered as a super property right after init — before the
 *   automatic initial $pageview is flushed — and re-registered whenever the
 *   user switches languages, so every event splits by /en · /ko.
 */
export function PostHogInit({ lang }: { lang: Lang }) {
  useEffect(() => {
    if (!KEY) {
      return;
    }
    let cancelled = false;
    import("posthog-js")
      .then(({ default: posthog }) => {
        if (cancelled) {
          return;
        }
        if (!posthog.__loaded) {
          posthog.init(KEY, {
            api_host: HOST,
            // When api_host points at a reverse proxy, keep PostHog app links
            // (toolbar etc.) working by naming the real app host.
            ui_host: "https://us.posthog.com",
            defaults: "2025-05-24",
            person_profiles: "identified_only",
          });
        }
        posthog.register({ lang });
      })
      .catch(() => {
        // Analytics is best-effort: if the chunk fails to load (offline,
        // blocked request), stay silent instead of surfacing an unhandled
        // rejection.
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return null;
}

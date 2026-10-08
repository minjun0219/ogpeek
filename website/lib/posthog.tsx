"use client";

import { useEffect } from "react";
import type { Lang } from "./i18n";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
// No fallback. posthog-js's own default api_host is https://us.i.posthog.com,
// so a missing host would ship a build that silently bypasses the reverse
// proxy. Without a host PostHog stays off, and `cf:build` refuses a production
// build that has the key but no host.
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;

/**
 * PostHog bootstrap.
 *
 * - posthog-js is loaded via dynamic import, and only when a key and host are
 *   set. In a keyless build (local dev, forks) the import is never executed,
 *   so the browser never downloads any PostHog code — the lazy chunk is still
 *   emitted at build time, it just stays unreferenced.
 * - `defaults: "2025-05-24"` turns the App Router's history-based SPA
 *   navigations into automatic $pageview / $pageleave capture.
 * - Pageviews (and leaves) only, the same as the other apps sharing the
 *   minjun.kim origin and PostHog project: click autocapture (with rage
 *   clicks), heatmaps, dead clicks, web vitals, exception capture, session
 *   replay and surveys are all off here, so a project setting cannot turn
 *   them back on. Custom events (`webmcp_tool_called`) still go through.
 * - `lang` is registered as a super property right after init — before the
 *   automatic initial $pageview is flushed — and re-registered whenever the
 *   user switches languages, so every event splits by en · ko.
 */
export function PostHogInit({ lang }: { lang: Lang }) {
  useEffect(() => {
    if (!KEY || !HOST) {
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
            autocapture: false,
            capture_heatmaps: false,
            capture_dead_clicks: false,
            capture_performance: false,
            capture_exceptions: false,
            disable_session_recording: true,
            disable_surveys: true,
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

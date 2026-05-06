import { useEffect, useState } from "react";
import { Inspector } from "../components/Inspector.js";
import { browser } from "../lib/browser.js";

type Probe = {
  initialUrl: string;
  preloaded?: { html: string; finalUrl: string };
};

// Popup boot: probe the active tab once. If it's an http(s) page we
// can reach with `activeTab` + `scripting`, lift its current DOM (post
// client-side rendering, with the user's own auth state) and feed it
// into the Inspector — no second HTTP fetch. Restricted pages
// (chrome://, file://, about:blank, etc.) gracefully fall through to
// the manual URL form.
export function App() {
  const [probe, setProbe] = useState<Probe | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        const tab = tabs[0];
        const tabUrl = tab?.url ?? "";
        const tabId = tab?.id;
        const inspectable = /^https?:/.test(tabUrl) && tabId != null;
        if (!inspectable) {
          setProbe({ initialUrl: "" });
          return;
        }
        try {
          const injection = await browser.scripting.executeScript({
            target: { tabId },
            func: () => document.documentElement.outerHTML,
          });
          const html = injection[0]?.result;
          if (typeof html === "string" && html.length > 0) {
            setProbe({
              initialUrl: tabUrl,
              preloaded: { html, finalUrl: tabUrl },
            });
            return;
          }
        } catch {
          // executeScript blocked (e.g. webstore origins, restricted
          // schemes). Fall through with the URL pre-filled so the user
          // can still inspect it via the background fetch path.
        }
        setProbe({ initialUrl: tabUrl });
      } catch {
        setProbe({ initialUrl: "" });
      }
    })();
  }, []);

  function openFull() {
    const base = browser.runtime.getURL("app.html");
    const target = probe?.initialUrl
      ? `${base}?url=${encodeURIComponent(probe.initialUrl)}`
      : base;
    void browser.tabs.create({ url: target });
    window.close();
  }

  if (!probe) {
    return <div className="ogp-status">로딩 중…</div>;
  }

  return (
    <Inspector
      initialUrl={probe.initialUrl}
      preloaded={probe.preloaded}
      compact
      onOpenFull={openFull}
    />
  );
}

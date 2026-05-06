import { useCallback } from "react";
import { Inspector } from "../components/Inspector.js";

// Full-page entry. Reads the URL to inspect from `?url=…`, runs the
// fetch path, and mirrors the inspected URL back into the location bar
// so the result is shareable / bookmarkable. No active-tab DOM probe
// here — this page is the active tab.
export function App() {
  const params =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URL(window.location.href).searchParams;
  const initialUrl = params.get("url") ?? "";

  const onInspectedUrlChange = useCallback((next: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    if (url.searchParams.get("url") === next) {
      return;
    }
    url.searchParams.set("url", next);
    window.history.replaceState({}, "", url.toString());
  }, []);

  return (
    <Inspector
      initialUrl={initialUrl}
      onInspectedUrlChange={onInspectedUrlChange}
    />
  );
}

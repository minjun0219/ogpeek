import type { FetchResult } from "ogpeek/fetch";

// One round-trip shape for the popup → background fetch call. Errors come
// back as `{ ok: false }` so the popup can render the engine's `code` /
// `message` directly (codes stay English per AGENTS.md principle 4).
export type FetchRequest = {
  type: "ogpeek:fetch";
  url: string;
};

export type FetchResponse =
  | { ok: true; result: FetchResult }
  | { ok: false; code: string; status: number; message: string };

export function isFetchRequest(value: unknown): value is FetchRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "ogpeek:fetch" &&
    typeof (value as { url?: unknown }).url === "string"
  );
}

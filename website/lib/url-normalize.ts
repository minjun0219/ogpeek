// If the user's input has no scheme, prepend https:// so it does not get
// rejected by the engine as INVALID_URL / UNSUPPORTED_SCHEME. Inputs that
// already start with http(s):// pass through unchanged. Genuinely malformed
// inputs are not pre-validated here — the engine reports them as
// INVALID_URL, keeping validation in a single place.
export function normalizeUrlInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

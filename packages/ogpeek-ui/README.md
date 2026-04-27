# @ogpeek/ui

Drop-in OG-tag inspector UI for [`ogpeek`](../ogpeek), shipped as
framework-agnostic Web Components plus a parallel HTML-string render API
and an opt-in React wrapper. Renders server-side without JavaScript via
[Declarative Shadow DOM][dsd] and works in any frontend (React, Vue,
Svelte, plain HTML).

> **Status:** v0.1, workspace-only. Not yet published to npm.

## What's in the box

Five components, available three ways:

| HTML-string render | Custom element | React wrapper |
|---|---|---|
| `renderResult({...})` | `<og-peek-result>` | `<OgPeekResult ... />` |
| `renderPreview({...})` | `<og-peek-preview>` | `<OgPeekPreview ... />` |
| `renderValidationPanel({...})` | `<og-peek-validation-panel>` | `<OgPeekValidationPanel ... />` |
| `renderTagTable({...})` | `<og-peek-tag-table>` | `<OgPeekTagTable ... />` |
| `renderRedirectFlow({...})` | `<og-peek-redirect-flow>` | `<OgPeekRedirectFlow ... />` |

All accept the engine's `OgDebugResult` (and friends) directly. Backend —
fetching, SSRF, rate-limiting — stays your responsibility, exactly as
`ogpeek` already requires.

## Server-side rendering (any backend)

```ts
import { renderResult } from "@ogpeek/ui";
import { fetchHtml, parse, validate } from "ogpeek/fetch";

const fetched = await fetchHtml(url, { guard });
const result = validate(parse(fetched.html, { url: fetched.finalUrl }));

const html = renderResult({
  result,
  finalUrl: fetched.finalUrl,
  status: fetched.status,
  redirects: fetched.redirects,
  canonical: result.meta.canonical,
  lang: "ko",
});
// html is a complete `<og-peek-result>...<template shadowrootmode="open">...</template></og-peek-result>` block.
// Inject directly into your server-rendered HTML.
```

Modern browsers (Chrome 90+, Safari 16.4+, Firefox 123+) materialize the
declarative shadow root immediately on parse, so the result is visible
before any client JS loads.

## React (Next.js, etc.)

```tsx
import { OgPeekResult } from "@ogpeek/ui/react";

export default function ResultPage({ result, finalUrl, status, redirects }) {
  return (
    <OgPeekResult
      result={result}
      finalUrl={finalUrl}
      status={status}
      redirects={redirects}
      canonical={result.meta.canonical}
      lang="ko"
    />
  );
}
```

Wrappers are server-component safe — they simply call the matching
`render*` function and inject the DSD string via
`dangerouslySetInnerHTML`. No hooks, no client APIs, no `"use client"`
boundary.

## Client-side custom elements

```html
<og-peek-result lang="ko"></og-peek-result>

<script type="module">
  import { register } from "@ogpeek/ui";
  register();

  const el = document.querySelector("og-peek-result");
  el.result = parsedResult;
  el.finalUrl = "https://example.com/";
  el.status = 200;
  el.redirects = [];
  el.canonical = null;
</script>
```

`register()` is idempotent and guarded — calling it twice or from two
co-loaded bundles will not throw. Custom elements use Shadow DOM so
styles do not leak in or out; consumers do not need to import any CSS
file or configure Tailwind.

## i18n

- Built-in `ko` (default) and `en` dictionaries cover all rendered strings.
- Pick a language via the `lang="ko" | "en"` attribute on any element, or
  the `lang` option on any render function / React wrapper prop.
- For deeper customization, pass a `dict` override (selective deep-merge)
  on either API.

## Security

User-controlled values from third-party HTML (titles, image URLs, etc.)
are HTML-escaped on every interpolation. Image and link `href` values
allow only `http:` / `https:` / `mailto:` / same-document /
relative-path references — `javascript:`, `data:`, `vbscript:` and the
like are blocked at the source. The XSS suite in `test/xss.test.ts`
covers the common payloads.

[dsd]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template#using_declarative_shadow_dom

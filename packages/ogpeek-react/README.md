# @ogpeek/react

Drop-in React components for the [ogpeek](https://www.npmjs.com/package/ogpeek)
OG-tag inspector. Renders the same panels the demo site (`ogpeek.minjun.dev`)
uses — preview card, validation results, redirect flow, tag table — and ships a
plain stylesheet so consumers don't need Tailwind.

## Install

```bash
pnpm add ogpeek @ogpeek/react
```

## Usage

```tsx
import { Result } from "@ogpeek/react";
import "@ogpeek/react/styles.css";
import { parse } from "ogpeek";
import { fetchHtml } from "ogpeek/fetch";

export async function OgInspector({ url }: { url: string }) {
  const fetched = await fetchHtml(url);
  const result = parse(fetched.html, { url: fetched.finalUrl });

  return (
    <Result
      result={result}
      finalUrl={fetched.finalUrl}
      status={fetched.status}
      redirects={fetched.redirects}
      canonical={result.meta.canonical}
      lang="en"
    />
  );
}
```

Every component is a plain React component — no hooks, no Context, no
`"use client"`. They run anywhere React 18+ runs (Node SSR, Cloudflare
Workers, React Server Components, the browser). `<Result />` resolves
the dictionary once and drills `lang` / `dict` / `composed` to every
child, so you don't need a Provider in the tree.

Need only one panel? Each piece is also exported individually:
`Preview`, `ValidationPanel`, `RedirectFlow`, `TagTable`. Standalone
panels accept `lang` and `dict` directly:

```tsx
<ValidationPanel warnings={result.warnings} lang="en" />
```

## Theming

All visual tokens hang off CSS variables on `.ogpeek-root` (the class every
component sets on its outermost element). Override what you want, scoped to
your app:

```css
.my-app .ogpeek-root {
  --ogpeek-fg: 30 41 59;
  --ogpeek-border: 203 213 225;
}
```

Dark mode follows `prefers-color-scheme: dark` out of the box.

## i18n

Korean (default) and English dictionaries are bundled. Pass `lang="en"` (or
`"ko"`) for the built-in copy, or pass a `dict` partial to override individual
strings:

```tsx
<Result
  // …
  lang="en"
  dict={{
    redirectFlow: { title: "Request hops" },
  }}
/>
```

## Security

User-controlled OG values pass through React's normal text escaping, so
`og:title` / `og:description` / warning payloads cannot inject HTML or break
out of attributes. Image URLs go through `safeImageSrc`, which blocks
`javascript:` / `data:` / other non-allowlisted schemes — when an unsafe
scheme is found the empty-image placeholder is rendered instead.

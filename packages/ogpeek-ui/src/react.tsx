// React wrappers for the @ogpeek/ui custom elements. Each wrapper renders
// a Declarative Shadow DOM string via the corresponding render function
// and injects it through `dangerouslySetInnerHTML` — modern browsers
// materialize the shadow root immediately on parse, so SSR works without
// hydration. No hooks, no client APIs: these are server-component safe.

import {
  renderPreview,
  renderRedirectFlow,
  renderResult,
  renderTagTable,
  renderValidationPanel,
  type PreviewProps,
  type RedirectFlowProps,
  type ResultRenderProps,
  type TagTableProps,
  type ValidationPanelProps,
} from "./index.js";

type WrapperProps = {
  // Optional className lets consumers add layout (margins, max-width)
  // around the custom element from their own styling system.
  className?: string;
};

function html(__html: string) {
  return { __html };
}

export function OgPeekResult(props: ResultRenderProps & WrapperProps) {
  const { className, ...rest } = props;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={html(renderResult(rest))}
    />
  );
}

export function OgPeekPreview(props: PreviewProps & WrapperProps) {
  const { className, ...rest } = props;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={html(renderPreview(rest))}
    />
  );
}

export function OgPeekValidationPanel(
  props: ValidationPanelProps & WrapperProps,
) {
  const { className, ...rest } = props;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={html(renderValidationPanel(rest))}
    />
  );
}

export function OgPeekTagTable(props: TagTableProps & WrapperProps) {
  const { className, ...rest } = props;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={html(renderTagTable(rest))}
    />
  );
}

export function OgPeekRedirectFlow(
  props: RedirectFlowProps & WrapperProps,
) {
  const { className, ...rest } = props;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={html(renderRedirectFlow(rest))}
    />
  );
}

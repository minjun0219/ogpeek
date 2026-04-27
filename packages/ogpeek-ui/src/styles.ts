// Scoped stylesheet injected into every shadow root. Tokens mirror
// website/app/globals.css:5-24 so the visual identity matches the
// introduction site 1:1.

export const STYLES = `
:host {
  --og-bg: 255 255 255;
  --og-fg: 17 24 39;
  --og-muted: 107 114 128;
  --og-surface: 249 250 251;
  --og-border: 229 231 235;
  --og-error-fg: 185 28 28;
  --og-error-bg: 254 226 226;
  --og-error-ring: 252 165 165;
  --og-warn-fg: 180 83 9;
  --og-warn-bg: 254 243 199;
  --og-warn-ring: 252 211 77;
  --og-info-fg: 29 78 216;
  --og-info-bg: 219 234 254;
  --og-info-ring: 147 197 253;
  --og-pass-fg: 4 120 87;
  --og-pass-bg: 209 250 229;
  display: block;
  color: rgb(var(--og-fg));
  font: 14px / 1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :host {
    --og-bg: 15 17 21;
    --og-fg: 226 232 240;
    --og-muted: 148 163 184;
    --og-surface: 24 28 35;
    --og-border: 44 50 60;
    --og-error-fg: 252 165 165;
    --og-warn-fg: 252 211 77;
    --og-info-fg: 147 197 253;
    --og-pass-fg: 110 231 183;
  }
}

* { box-sizing: border-box; }

.og-stack { display: flex; flex-direction: column; gap: 24px; }

.og-section {
  border: 1px solid rgb(var(--og-border));
  background: rgb(var(--og-surface));
  border-radius: 12px;
  padding: 16px 20px;
}
.og-section--flat {
  border: 1px solid rgb(var(--og-border));
  border-radius: 12px;
  overflow: hidden;
  background: transparent;
}
.og-section--pass {
  border: 1px solid rgb(var(--og-border));
  background: rgb(var(--og-pass-bg) / 0.5);
  border-radius: 12px;
  padding: 16px 20px;
}

.og-section-header {
  display: flex; align-items: center; justify-content: space-between;
}
.og-h2 { font-size: 14px; font-weight: 500; margin: 0; }
.og-h3 {
  font-size: 11px; font-weight: 500; letter-spacing: 0.05em;
  text-transform: uppercase; color: rgb(var(--og-muted)); margin: 0;
}
.og-muted { color: rgb(var(--og-muted)); }
.og-mono { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace; }
.og-text-xs { font-size: 12px; }
.og-text-sm { font-size: 14px; }
.og-break { word-break: break-all; overflow-wrap: anywhere; }
.og-truncate {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.og-pass-title {
  margin: 0; font-size: 14px; font-weight: 500;
  color: rgb(var(--og-pass-fg));
}
.og-pass-body {
  margin: 4px 0 0; font-size: 12px; color: rgb(var(--og-muted));
}

.og-pill-row { display: flex; gap: 8px; font-size: 12px; }
.og-pill {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 9999px;
  font-size: 12px; line-height: 1.2;
  box-shadow: inset 0 0 0 1px transparent;
}
.og-pill--error {
  color: rgb(var(--og-error-fg));
  background: rgb(var(--og-error-bg) / 0.4);
  box-shadow: inset 0 0 0 1px rgb(var(--og-error-ring) / 0.6);
}
.og-pill--warn {
  color: rgb(var(--og-warn-fg));
  background: rgb(var(--og-warn-bg) / 0.4);
  box-shadow: inset 0 0 0 1px rgb(var(--og-warn-ring) / 0.6);
}
.og-pill--info {
  color: rgb(var(--og-info-fg));
  background: rgb(var(--og-info-bg) / 0.4);
  box-shadow: inset 0 0 0 1px rgb(var(--og-info-ring) / 0.6);
}

.og-warning-list { list-style: none; padding: 0; margin: 12px 0 0; }
.og-warning-item {
  border-radius: 8px; padding: 8px 12px; font-size: 14px;
  box-shadow: inset 0 0 0 1px transparent;
  margin-top: 8px;
}
.og-warning-item:first-child { margin-top: 0; }
.og-warning-item--error {
  color: rgb(var(--og-error-fg));
  background: rgb(var(--og-error-bg) / 0.4);
  box-shadow: inset 0 0 0 1px rgb(var(--og-error-ring) / 0.6);
}
.og-warning-item--warn {
  color: rgb(var(--og-warn-fg));
  background: rgb(var(--og-warn-bg) / 0.4);
  box-shadow: inset 0 0 0 1px rgb(var(--og-warn-ring) / 0.6);
}
.og-warning-item--info {
  color: rgb(var(--og-info-fg));
  background: rgb(var(--og-info-bg) / 0.4);
  box-shadow: inset 0 0 0 1px rgb(var(--og-info-ring) / 0.6);
}
.og-warning-meta {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 500;
  letter-spacing: 0.05em; text-transform: uppercase;
}
.og-warning-meta-code { opacity: 0.6; }
.og-warning-message { margin-top: 4px; }
.og-warning-value {
  margin-top: 4px; font-size: 12px; opacity: 0.8;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.og-table-header {
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid rgb(var(--og-border));
  background: rgb(var(--og-surface));
  padding: 12px 20px;
}
.og-table-group {
  padding: 12px 20px;
  border-top: 1px solid rgb(var(--og-border));
}
.og-table-group:first-of-type { border-top: 0; }
.og-table { width: 100%; margin-top: 8px; border-collapse: collapse; text-align: left; }
.og-table th, .og-table td { padding: 4px 0; vertical-align: top; font-size: 12px; }
.og-table th {
  width: 28%; padding-right: 16px;
  color: rgb(var(--og-muted));
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-weight: 400;
}
.og-table td {
  word-break: break-all; overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
}
.og-table-empty { opacity: 0.4; }

.og-flow-grid {
  display: grid; grid-template-columns: max-content 1fr;
  column-gap: 16px; row-gap: 8px;
  margin: 12px 0 0;
}
.og-flow-grid dt { font-size: 12px; color: rgb(var(--og-muted)); }
.og-flow-grid dd { margin: 0; }
.og-flow-list { list-style: none; padding: 0; margin: 0; font-size: 12px; }
.og-flow-list li {
  display: flex; align-items: baseline; gap: 12px;
  margin-top: 6px;
}
.og-flow-list li:first-child { margin-top: 0; }
.og-flow-tag {
  flex-shrink: 0; border-radius: 4px;
  padding: 2px 8px; font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.05em;
  background: rgb(var(--og-bg));
  color: rgb(var(--og-muted));
  box-shadow: inset 0 0 0 1px rgb(var(--og-border));
}
.og-flow-tag--redirect {
  background: rgb(var(--og-warn-bg) / 0.4);
  color: rgb(var(--og-warn-fg));
  box-shadow: inset 0 0 0 1px rgb(var(--og-warn-ring) / 0.6);
  font-weight: 500;
}
.og-flow-note {
  margin: 4px 0 0; font-size: 11px; color: rgb(var(--og-muted));
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

.og-preview {
  margin: 0; border-radius: 16px;
  border: 1px solid rgb(var(--og-border));
  background: #ffffff;
  overflow: hidden;
  max-width: 480px;
}
.og-preview-image {
  display: block; width: 100%; aspect-ratio: 1.91 / 1;
  object-fit: cover; background: #f1f5f9;
}
.og-preview-image-empty {
  display: block; width: 100%; aspect-ratio: 1.91 / 1;
  background: #f1f5f9;
}
.og-preview-body {
  background: #f0f2f5; color: #0f172a;
  padding: 12px 16px;
}
.og-preview-domain {
  font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.05em; color: #64748b;
}
.og-preview-title {
  margin-top: 2px; font-size: 15px; font-weight: 600;
  line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.og-preview-description {
  margin-top: 2px; font-size: 12px; color: #475569;
  display: -webkit-box; -webkit-line-clamp: 1;
  -webkit-box-orient: vertical; overflow: hidden;
}
`.trim();

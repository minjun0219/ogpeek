import "@ogpeek/react/styles.css";
import "../components/inspector.css";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("app root element missing");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

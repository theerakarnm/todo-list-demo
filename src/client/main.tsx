import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// The app shell (router, i18n, theme) arrives in the next step of lane 0.
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
  <StrictMode>
    <main />
  </StrictMode>,
);

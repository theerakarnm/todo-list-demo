import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./styles/app.css";
import { ThemeProvider } from "./theme/ThemeProvider";

// The app shell (router, i18n, theme) arrives in the next steps of lane 0.
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <main />
    </ThemeProvider>
  </StrictMode>,
);

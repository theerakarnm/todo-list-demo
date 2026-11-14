import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import th from "./th.json";

export const resources = { th: { translation: th } } as const;

// Thai is the only locale. Resources are bundled, so init finishes synchronously.
void i18n.use(initReactI18next).init({
  lng: "th",
  fallbackLng: "th",
  resources,
  initAsync: false,
  interpolation: { escapeValue: false }, // React already escapes text
});

export default i18n;

import "i18next";
import type { resources } from "./index";

// Type-checks every t("...") key against th.json.
declare module "i18next" {
  interface CustomTypeOptions {
    resources: (typeof resources)["th"];
  }
}

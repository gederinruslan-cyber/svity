import { defineRouting } from "next-intl/routing";
import { siteLocales } from "@svity/contracts";

export const routing = defineRouting({
  locales: siteLocales,
  defaultLocale: "en",
  localePrefix: "always",
});

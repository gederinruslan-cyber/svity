import { defineRouting } from "next-intl/routing";
import { siteLocales } from "@svity/contracts";

export const routing = defineRouting({
  locales: siteLocales,
  defaultLocale: "uk",
  localePrefix: "always",
  // Everyone starts in Ukrainian; other languages are one tap away in the menu.
  localeDetection: false,
});

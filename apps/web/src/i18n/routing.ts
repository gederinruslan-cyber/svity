import { defineRouting } from "next-intl/routing";
import { locales } from "@svity/contracts";

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

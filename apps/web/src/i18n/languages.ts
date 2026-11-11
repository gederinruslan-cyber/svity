import type { SiteLocale } from "@svity/contracts";

/** Each site language by its own name, with the short label used in the header. */
export const LANGUAGES: Record<SiteLocale, { name: string; short: string }> = {
  uk: { name: "Українська", short: "UA" },
  en: { name: "English", short: "EN" },
  de: { name: "Deutsch", short: "DE" },
  pl: { name: "Polski", short: "PL" },
  cs: { name: "Čeština", short: "CS" },
  it: { name: "Italiano", short: "IT" },
  es: { name: "Español", short: "ES" },
  fr: { name: "Français", short: "FR" },
};

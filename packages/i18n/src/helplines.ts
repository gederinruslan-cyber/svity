/**
 * Support lines by country (spec §11: by country, not by language).
 * ⚠️ `verified: false` — numbers must be checked by the team before launch (spec §11, §18).
 * 112 and findahelpline.com are always shown next to them.
 */
export interface Helpline {
  name: string;
  phone: string;
  /** Free-form hours as the service publishes them. */
  hours: string;
  url?: string;
  verified: boolean;
}

export const helplineCountries = ["UA", "PL", "DE", "CZ", "IT", "ES", "FR"] as const;
export type HelplineCountry = (typeof helplineCountries)[number];

export const EMERGENCY_NUMBER = "112";
export const FIND_A_HELPLINE = "https://findahelpline.com";

export const helplines: Record<HelplineCountry, Helpline[]> = {
  UA: [{ name: "Lifeline Ukraine", phone: "7333", hours: "24/7", url: "https://lifelineukraine.com", verified: false }],
  PL: [{ name: "Kryzysowy Telefon Zaufania", phone: "116 123", hours: "", verified: false }],
  DE: [{ name: "TelefonSeelsorge", phone: "0800 111 0 111", hours: "24/7", url: "https://www.telefonseelsorge.de", verified: false }],
  CZ: [{ name: "Linka první psychické pomoci", phone: "116 123", hours: "24/7", verified: false }],
  IT: [{ name: "Telefono Amico Italia", phone: "02 2327 2327", hours: "", url: "https://www.telefonoamico.it", verified: false }],
  ES: [{ name: "Línea 024", phone: "024", hours: "24/7", verified: false }],
  FR: [{ name: "3114 — Prévention du suicide", phone: "3114", hours: "24/7", url: "https://3114.fr", verified: false }],
};

const ZONES: Record<string, HelplineCountry> = {
  "Europe/Kyiv": "UA",
  "Europe/Kiev": "UA",
  "Europe/Uzhgorod": "UA",
  "Europe/Zaporozhye": "UA",
  "Europe/Warsaw": "PL",
  "Europe/Berlin": "DE",
  "Europe/Busingen": "DE",
  "Europe/Prague": "CZ",
  "Europe/Rome": "IT",
  "Europe/Madrid": "ES",
  "Atlantic/Canary": "ES",
  "Africa/Ceuta": "ES",
  "Europe/Paris": "FR",
};

/** Best guess of the country from the profile time zone, then the language. */
export function guessCountry(timezone: string | undefined, locale: string): HelplineCountry | null {
  if (timezone && ZONES[timezone]) return ZONES[timezone];
  return locale === "uk" ? "UA" : null;
}

import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, usePathname, useRouter } = createNavigation(routing);

/**
 * URL of `pathname` (without locale) in another language. Language switches use a full
 * page load, because the locale segment owns the root <html> (lang, fonts, theme script).
 */
export function localeHref(locale: (typeof routing.locales)[number], pathname: string) {
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}

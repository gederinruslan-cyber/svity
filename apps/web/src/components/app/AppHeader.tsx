"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, localeHref, usePathname } from "@/i18n/navigation";
import { Star4 } from "../icons";
import { HelpButton } from "./HelpSheet";

/** The signed-in header: Today, Diary, language, sign out. */
export function AppHeader() {
  const t = useTranslations("app.nav");
  const locale = useLocale();
  const pathname = usePathname();

  const links = [
    ["/today", t("today")],
    ["/diary", t("diary")],
    ["/profile", t("profile")],
  ] as const;

  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <Link href="/" className="logo" aria-label={t("home")}>
          SVITY
          <Star4 size={10} className="logo__star" />
        </Link>
        <nav className="app-nav" aria-label="Svity">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={pathname === href || pathname.startsWith(`${href}/`) ? "is-active" : ""}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="app-header__end">
          <div className="lang-switch">
            {(["uk", "en"] as const).map((l) => (
              <a key={l} href={localeHref(l, pathname)} hrefLang={l} className={l === locale ? "is-active" : ""} aria-current={l === locale ? "true" : undefined}>
                {l === "uk" ? "UA" : "EN"}
              </a>
            ))}
          </div>
          <HelpButton />
        </div>
      </div>
    </header>
  );
}

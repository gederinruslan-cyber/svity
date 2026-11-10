"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, localeHref, usePathname, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { DoorClose, Star4 } from "../icons";

/** The signed-in header: Today, Diary, language, sign out. */
export function AppHeader() {
  const t = useTranslations("app.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await api("/v1/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/signin");
  }

  const links = [
    ["/today", t("today")],
    ["/diary", t("diary")],
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
            <Link key={href} href={href} className={pathname === href ? "is-active" : ""} aria-current={pathname === href ? "page" : undefined}>
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
          <button type="button" className="app-signout" onClick={signOut} aria-label={t("signOut")} title={t("signOut")}>
            <DoorClose size={18} />
            <span className="app-signout__text">{t("signOut")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

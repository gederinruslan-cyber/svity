"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { roomsOpen } from "@svity/contracts";
import { Link, localeHref, usePathname } from "@/i18n/navigation";
import { getMe } from "@/lib/api";
import { Calendar, Cards, Leaf, Mirror, Moon, Star4, Sun, User } from "../icons";
import { HelpButton } from "./HelpSheet";

type Theme = "day" | "evening";

/**
 * The signed-in header: sections, theme, language and help. On phones the sections move to a
 * tab bar at the bottom of the screen, within thumb reach.
 */
export function AppHeader() {
  const t = useTranslations("app.nav");
  const tp = useTranslations("app.profile");
  const td = useTranslations("app.difficult");
  const locale = useLocale();
  const pathname = usePathname();
  const [pro, setPro] = useState(false);
  const [theme, setTheme] = useState<Theme>("evening");

  useEffect(() => {
    setTheme(document.documentElement.dataset.themePref === "day" ? "day" : "evening");
    getMe()
      .then((m) => setPro(m.role === "professional"))
      .catch(() => {});
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "day" ? "evening" : "day";
    setTheme(next);
    const d = document.documentElement;
    // A shadow card keeps the page in evening (useEvening); only the preference changes then.
    d.dataset.themePref = next;
    if (!d.dataset.forcedEvening) d.dataset.theme = next;
    try {
      localStorage.setItem("svity-theme", next);
    } catch {}
  }

  const links: { href: string; label: string; icon: React.ReactNode }[] = [
    { href: "/today", label: t("today"), icon: <Cards size={20} /> },
    { href: "/diary", label: t("diary"), icon: <Calendar size={20} /> },
    ...(pro && roomsOpen ? [{ href: "/cabinet", label: t("cabinet"), icon: <Mirror size={20} /> }] : []),
    { href: "/difficult-day", label: td("title"), icon: <Leaf size={20} /> },
    { href: "/profile", label: t("profile"), icon: <User size={20} /> },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const themeLabel = `${tp("theme")}: ${theme === "day" ? tp("themeDay") : tp("themeEvening")}`;

  const nav = (cls: string) => (
    <nav className={cls} aria-label="Svity">
      {links.map(({ href, label, icon }) => (
        <Link key={href} href={href} className={isActive(href) ? "is-active" : ""} aria-current={isActive(href) ? "page" : undefined}>
          {icon}
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      <header className="app-header">
        <div className="container app-header__inner">
          <Link href="/" className="logo" aria-label={t("home")}>
            SVITY
            <Star4 size={10} className="logo__star" />
          </Link>
          {nav("app-nav")}
          <div className="app-header__end">
            <button type="button" className="app-theme" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
              {theme === "evening" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <div className="lang-switch">
              {(["uk", "en"] as const).map((l) => (
                <a key={l} href={localeHref(l, pathname)} hrefLang={l} className={l === locale ? "is-active" : ""} aria-current={l === locale ? "true" : undefined}>
                  {l === "uk" ? "UA" : "EN"}
                </a>
              ))}
            </div>
            <HelpButton withLabel className="app-help" />
          </div>
        </div>
      </header>
      {nav("app-tabs")}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Close, Menu, Moon, Star4, Sun } from "./icons";

type ThemePref = "auto" | "day" | "evening";

function resolveTheme(pref: ThemePref) {
  if (pref !== "auto") return pref;
  const h = new Date().getHours();
  return h >= 18 || h < 6 ? "evening" : "day";
}

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState<ThemePref>("auto");

  useEffect(() => {
    setPref(
      (document.documentElement.dataset.themePref as ThemePref) ?? "auto",
    );
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function cycleTheme() {
    const next: ThemePref =
      pref === "auto" ? "day" : pref === "day" ? "evening" : "auto";
    setPref(next);
    const d = document.documentElement;
    const apply = () => {
      d.dataset.themePref = next;
      d.dataset.theme = resolveTheme(next);
    };
    // Cross-fade the whole page between day and evening where supported.
    if (
      document.startViewTransition &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      document.startViewTransition(apply);
    } else apply();
    try {
      localStorage.setItem("svity-theme", next);
    } catch {}
  }

  const themeLabel = {
    auto: t("themeAuto"),
    day: t("themeDay"),
    evening: t("themeEvening"),
  }[pref];
  const links = [
    ["#how", t("how")],
    ["#deck", t("deck")],
    ["#pros", t("pros")],
    ["#faq", t("faq")],
  ] as const;

  return (
    <header className={`site-header ${scrolled || open ? "is-scrolled" : ""}`}>
      <div className="site-header__inner">
        <a href="#top" className="logo" aria-label="Svity">
          SVITY
          <Star4 size={10} className="logo__star" />
        </a>

        <nav
          className={`site-nav ${open ? "is-open" : ""}`}
          aria-label={t("menu")}
        >
          {links.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </nav>

        <div className="site-header__tools">
          <div className="lang-switch" role="group" aria-label={t("language")}>
            {(["uk", "en"] as const).map((l) => (
              <Link
                key={l}
                href={pathname}
                locale={l}
                className={l === locale ? "is-active" : ""}
                aria-current={l === locale ? "true" : undefined}
              >
                {l === "uk" ? "UA" : "EN"}
              </Link>
            ))}
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={cycleTheme}
            aria-label={`${t("theme")}: ${themeLabel}`}
            title={`${t("theme")}: ${themeLabel}`}
          >
            {pref === "evening" ? (
              <Moon />
            ) : pref === "day" ? (
              <Sun />
            ) : (
              <span className="theme-auto">A</span>
            )}
          </button>
          <a href="#join" className="btn btn--small header-cta">
            {t("cta")}
          </a>
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={t("menu")}
          >
            {open ? <Close /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}

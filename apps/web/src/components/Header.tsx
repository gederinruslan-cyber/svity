"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LangMenu } from "./LangMenu";
import { ChevronRight, Close, Menu, Moon, Star4, Sun } from "./icons";

type ThemePref = "day" | "evening";

const SECTIONS = ["how", "deck", "pros", "faq"] as const;

export function Header() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState<ThemePref>("evening");
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    setPref(document.documentElement.dataset.themePref === "day" ? "day" : "evening");
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the section in the middle of the screen.
  useEffect(() => {
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        setActive(SECTIONS.find((id) => seen.get(id)) ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of SECTIONS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function cycleTheme() {
    const next: ThemePref = pref === "day" ? "evening" : "day";
    setPref(next);
    const d = document.documentElement;
    const apply = () => {
      d.dataset.themePref = next;
      d.dataset.theme = next;
    };
    // Cross-fade the whole page between day and evening where supported.
    if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.startViewTransition(apply);
    } else apply();
    try {
      localStorage.setItem("svity-theme", next);
    } catch {}
  }

  const themeLabel = pref === "day" ? t("themeDay") : t("themeEvening");

  const prefs = (
    <div className="header-prefs">
      <LangMenu />
      <span className="header-prefs__sep" aria-hidden="true" />
      <button type="button" className="header-prefs__theme" onClick={cycleTheme} aria-label={`${t("theme")}: ${themeLabel}`} title={`${t("theme")}: ${themeLabel}`}>
        {pref === "evening" ? <Moon size={16} /> : <Sun size={16} />}
      </button>
    </div>
  );

  return (
    <header className={`site-header ${scrolled || open ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
      <div className="site-header__inner">
        <a href="#top" className="logo" aria-label="Svity" onClick={() => setOpen(false)}>
          SVITY
          <Star4 size={10} className="logo__star" />
        </a>

        <nav className="site-nav" aria-label={t("menu")}>
          {SECTIONS.map((id) => (
            <a key={id} href={`#${id}`} className={active === id ? "is-active" : ""} aria-current={active === id ? "location" : undefined}>
              {t(id)}
            </a>
          ))}
        </nav>

        <div className="site-header__tools">
          <div className="site-header__prefs">{prefs}</div>
          <a href="#try" className="btn btn--small header-cta" aria-label={t("tryLabel")}>
            {t("tryShort")}
            <ChevronRight size={16} />
          </a>
          <button type="button" className="icon-btn menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="site-menu" aria-label={t("menu")}>
            {open ? <Close size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Phone menu: sections, language and theme. */}
      <div id="site-menu" className="site-menu" hidden={!open}>
        <nav className="site-menu__links" aria-label={t("menu")}>
          {SECTIONS.map((id) => (
            <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
              {t(id)}
              <ChevronRight size={18} />
            </a>
          ))}
        </nav>
        <div className="site-menu__prefs">
          <span className="field-label">{t("theme")}</span>
          <button type="button" className="header-prefs__theme" onClick={cycleTheme} aria-label={`${t("theme")}: ${themeLabel}`}>
            {pref === "evening" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
        <div className="site-menu__langs">
          <span className="field-label">{t("language")}</span>
          <LangMenu inline />
        </div>
      </div>
    </header>
  );
}

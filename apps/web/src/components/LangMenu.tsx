"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { siteLocales } from "@svity/contracts";
import { localeHref, usePathname } from "@/i18n/navigation";
import { LANGUAGES } from "@/i18n/languages";
import { ChevronDown } from "./icons";

/** The site language: a small menu of plain links (a full page load per switch); `inline` lists them all. */
export function LangMenu({ inline = false }: { inline?: boolean }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (el?.open && !(e instanceof KeyboardEvent ? e.key !== "Escape" : el.contains(e.target as Node))) el.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  const links = siteLocales.map((l) => (
    <li key={l}>
      <a href={localeHref(l, pathname)} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}>
        {LANGUAGES[l].name}
      </a>
    </li>
  ));

  if (inline) return <ul className="lang-grid">{links}</ul>;

  return (
    <details ref={ref} className="lang-menu">
      <summary aria-label={`${t("language")}: ${LANGUAGES[locale].name}`}>
        {LANGUAGES[locale].short}
        <ChevronDown size={14} />
      </summary>
      <ul className="lang-menu__list glass">{links}</ul>
    </details>
  );
}

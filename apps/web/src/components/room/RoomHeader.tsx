"use client";

import { useLocale } from "next-intl";
import { localeHref, usePathname } from "@/i18n/navigation";
import { Star4 } from "../icons";
import { HelpButton } from "../app/HelpSheet";

/** The client's room header: no app tabs (a guest has no account), but always the help button (spec §11). */
export function RoomHeader() {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <header className="app-header room-header">
      <div className="container app-header__inner">
        <span className="logo" aria-label="Svity">
          SVITY
          <Star4 size={10} className="logo__star" />
        </span>
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

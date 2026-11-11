"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Lifebuoy } from "./icons";

// Breathing 4 · 4 · 6, the same rhythm as the app.
const PHASES = [
  ["in", 4],
  ["hold", 4],
  ["out", 6],
] as const;

/** The help sheet as it opens in the app, with a live breathing circle. Decorative. */
export function HelpMock() {
  const t = useTranslations("app.help");
  const tb = useTranslations("app.breath");
  const ts = useTranslations("safety");
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASES[phase]![1] * 1000);
    return () => clearTimeout(id);
  }, [phase]);

  const [key] = PHASES[phase]!;
  return (
    <div className="help-mock reveal" aria-hidden="true">
      <span className="help-mock__trigger">
        <Lifebuoy size={18} /> {t("open")}
      </span>
      <div className="help-mock__sheet glass">
        <p className="help-mock__title">{t("title")}</p>
        <span className="help-mock__call">{t("call", { number: "112" })}</span>
        <div className="help-mock__row">
          <span className="help-mock__label">{t("country")}</span>
          <span className="chip chip--sm">{ts("mockCountry")}</span>
        </div>
        <span className="help-mock__link">{t("find")}</span>
        <div className="help-mock__breath">
          <span className={`help-mock__circle is-${key}`}>
            <span>{tb(key)}</span>
          </span>
          <span className="help-mock__label">{t("breathe")}</span>
        </div>
        <p className="help-mock__note">{t("notService")}</p>
      </div>
    </div>
  );
}

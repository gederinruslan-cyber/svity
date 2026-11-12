"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const SENSES = ["see", "touch", "hear", "smell", "taste"] as const;

/** Grounding 5-4-3-2-1 (spec §7, §11): one sense at a time, no typing. */
export function Grounding({ onDone }: { onDone: () => void }) {
  const t = useTranslations("app.ground");
  const [i, setI] = useState(0);
  const last = i === SENSES.length - 1;
  return (
    <div className="ground">
      <p className="demo__label">{t("title")}</p>
      <p className="ground__n" aria-hidden="true">
        {5 - i}
      </p>
      <p className="question" aria-live="polite">
        {t(SENSES[i]!)}
      </p>
      <p className="ground__dots" aria-hidden="true">
        {SENSES.map((x, k) => (
          <span key={x} className={k <= i ? "is-on" : ""} />
        ))}
      </p>
      <p className="app-hint">{t("step", { n: i + 1 })}</p>
      <button type="button" className="btn" onClick={() => (last ? onDone() : setI(i + 1))}>
        {last ? t("done") : t("next")}
      </button>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { CardView } from "@svity/contracts";
import { Breathing } from "./Breathing";

/** Spec §8.5: a shadow card switches the interface to the evening theme; restored afterwards. */
export function useEvening(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const d = document.documentElement;
    d.dataset.forcedEvening = "1";
    d.dataset.theme = "evening";
    // Back to the chosen theme, which the header switch may have changed meanwhile.
    return () => {
      delete d.dataset.forcedEvening;
      d.dataset.theme = d.dataset.themePref === "day" ? "day" : "evening";
    };
  }, [active]);
}

/**
 * After a shadow card (spec §8.6–8.7): "Let's come back to the body" (breathing 4-4-6), then the
 * support card from the light part of the deck. Breathing can be skipped; the support card can't.
 */
export function AfterShadow({ support, onDone }: { support: CardView; onDone: () => void }) {
  const t = useTranslations("app.shadow");
  const td = useTranslations("app.difficult");
  const tt = useTranslations("app.today");
  const [step, setStep] = useState<"breath" | "support">("breath");

  if (step === "breath") {
    return (
      <div className="demo__step">
        <p className="demo__label">{t("breathTitle")}</p>
        <Breathing autoStart onDone={() => setTimeout(() => setStep("support"), 1200)} />
        <button type="button" className="link-btn" onClick={() => setStep("support")}>
          {td("skip")}
        </button>
      </div>
    );
  }
  return (
    <div className="demo__step shadow-support">
      <p className="demo__label">{t("supportTitle")}</p>
      <span className="shadow-support__card">
        <Image src={support.imageUrl} alt={tt("cardAlt", { n: support.id })} fill sizes="160px" unoptimized draggable={false} />
      </span>
      <p className="question">{support.question}</p>
      <p className="app-hint">{t("supportHint")}</p>
      <button type="button" className="btn" onClick={onDone}>
        {tt("continue")}
      </button>
    </div>
  );
}

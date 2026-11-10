"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CardView } from "@svity/contracts";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { Breathing } from "./Breathing";
import { Grounding } from "./Grounding";
import { HelpButton } from "./HelpSheet";

type Step = "intro" | "card" | "ground" | "breath" | "end";

/**
 * "Difficult day" (spec §11): a gentle card with no questions about the problem, grounding,
 * breathing, and the help button right next to it. Nothing is saved; the card of the day is untouched.
 */
export function DifficultDay() {
  const t = useTranslations("app.difficult");
  const tt = useTranslations("app.today");
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [card, setCard] = useState<CardView | null>(null);

  useEffect(() => {
    api<{ card: CardView }>(`/v1/today/gentle?locale=${locale}`)
      .then((r) => setCard(r.card))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/signin");
      });
  }, [locale, router]);

  return (
    <section className="difficult container container--narrow">
      <h1 className="h2">{t("title")}</h1>

      <div className="difficult__panel glass" aria-live="polite">
        {step === "intro" && (
          <>
            <p className="difficult__lead">{t("intro")}</p>
            <button type="button" className="btn" onClick={() => setStep("card")}>
              {t("start")}
            </button>
          </>
        )}

        {step === "card" && (
          <>
            {card && (
              <span className="difficult__card">
                <Image src={card.imageUrl} alt={tt("cardAlt", { n: card.id })} fill sizes="220px" unoptimized draggable={false} priority />
              </span>
            )}
            <p className="question">{t("cardTitle")}</p>
            <p className="app-muted">{t("cardSub")}</p>
            <button type="button" className="btn" onClick={() => setStep("ground")}>
              {t("next")}
            </button>
          </>
        )}

        {step === "ground" && <Grounding onDone={() => setStep("breath")} />}

        {step === "breath" && (
          <>
            <Breathing autoStart onDone={() => setTimeout(() => setStep("end"), 1200)} />
            <button type="button" className="link-btn" onClick={() => setStep("end")}>
              {t("skip")}
            </button>
          </>
        )}

        {step === "end" && (
          <>
            <p className="question">{t("end")}</p>
            <p className="app-muted">{t("endSub")}</p>
            <div className="difficult__actions">
              <Link href="/today" className="btn">
                {t("toToday")}
              </Link>
              <button type="button" className="link-btn" onClick={() => setStep("intro")}>
                {t("again")}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Help stays next to the content on every step, not only in the header. */}
      <HelpButton withLabel className="difficult__help" />
    </section>
  );
}

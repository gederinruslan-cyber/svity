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
import { Sky } from "../Sky";
import { Cards, Leaf, Lifebuoy, Star4 } from "../icons";

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

  const steps = [
    { key: "card", icon: <Cards size={22} />, title: t("s1t"), text: t("s1") },
    { key: "ground", icon: <Leaf size={22} />, title: t("s2t"), text: t("s2") },
    { key: "breath", icon: <span className="difficult__breath-icon" />, title: t("s3t"), text: t("s3") },
  ] as const;
  const current = steps.findIndex((x) => x.key === step);

  return (
    <section className={`difficult ${step === "intro" ? "" : "difficult--flow"}`}>
      <Sky />
      <header className="difficult__head">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="h2">{t("title")}</h1>
        {step === "intro" && <p className="difficult__lead">{t("intro")}</p>}
      </header>

      {step === "intro" ? (
        <div className="difficult__intro">
          <div className="difficult__plan glass">
            <ol className="difficult__steps">
              {steps.map((x, i) => (
                <li key={x.key}>
                  <span className="difficult__step-icon" aria-hidden="true">
                    {x.icon}
                  </span>
                  <div>
                    <p className="difficult__step-t">
                      <span className="difficult__step-n">{i + 1}</span> {x.title}
                    </p>
                    <p className="difficult__step-b">{x.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="app-hint difficult__time">{t("time")}</p>
            <button type="button" className="btn btn--large" onClick={() => setStep("card")}>
              {t("start")}
            </button>
          </div>

          <aside className="difficult__care glass" aria-labelledby="difficult-care">
            <span className="difficult__care-icon" aria-hidden="true">
              <Lifebuoy size={22} />
            </span>
            <p id="difficult-care" className="h3">
              {t("careTitle")}
            </p>
            <p className="app-muted">{t("careText")}</p>
            <HelpButton withLabel className="difficult__help" />
          </aside>
        </div>
      ) : (
        <>
          {step !== "end" && (
            <ol className="demo__steps difficult__tracker" aria-label={t("stepsLabel")}>
              {steps.map((x, i) => (
                <li key={x.key} className={i === current ? "is-current" : i < current ? "is-done" : ""} aria-current={i === current ? "step" : undefined}>
                  <span className="demo__step-n">{i + 1}</span>
                  <span className="demo__step-t">{x.title}</span>
                </li>
              ))}
            </ol>
          )}

          <div className={`difficult__panel difficult__panel--${step} glass`} aria-live="polite">
            {step === "card" && (
              <div className="difficult__card-step">
                <span className="difficult__card">
                  {card && <Image src={card.imageUrl} alt={tt("cardAlt", { n: card.id })} fill sizes="(min-width: 860px) 280px, 62vw" unoptimized draggable={false} priority />}
                </span>
                <div className="difficult__card-text">
                  <p className="question">{t("cardTitle")}</p>
                  <p className="app-muted">{t("cardSub")}</p>
                  <button type="button" className="btn" onClick={() => setStep("ground")}>
                    {t("next")}
                  </button>
                </div>
              </div>
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
              <div className="difficult__end">
                <span className="saved-star is-new" aria-hidden="true">
                  <Star4 size={40} />
                </span>
                <p className="question">{t("end")}</p>
                <p className="app-muted">{t("endSub")}</p>
                <div className="difficult__actions">
                  <Link href="/today" className="btn">
                    {t("toToday")}
                  </Link>
                  <button type="button" className="btn btn--ghost" onClick={() => setStep("intro")}>
                    {t("again")}
                  </button>
                </div>
                <p className="app-hint">{t("endNote")}</p>
              </div>
            )}
          </div>

          {/* Help stays next to the content on every step, not only in the header. */}
          <HelpButton withLabel className="difficult__help difficult__help--below" />
        </>
      )}
    </section>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Sky } from "../Sky";
import { ChevronLeft, Star4 } from "../icons";

const SLIDES = [
  { key: "s1", art: "/cards/back.webp", card: true },
  { key: "s2", art: "/brand/diary.webp", card: false },
  { key: "s3", art: "/brand/door.webp", card: false },
] as const;

/** Right after sign-up (spec §5): three short screens, skippable, then the card of the day. */
export function Welcome() {
  const t = useTranslations("app.welcome");
  const router = useRouter();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i]!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, SLIDES.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="welcome">
      <Sky />
      <header className="auth__bar">
        <span className="logo" aria-label="Svity">
          SVITY
          <Star4 size={10} className="logo__star" />
        </span>
        <Link href="/today" className="link-btn welcome__skip">
          {t("skip")}
        </Link>
      </header>
      <main className="welcome__main">
        <section key={slide.key} className="welcome__slide" aria-live="polite" aria-label={t("step", { n: i + 1, total: SLIDES.length })}>
          <div className={`welcome__art ${slide.card ? "welcome__art--card" : ""}`}>
            <Image src={slide.art} alt="" fill sizes="220px" priority />
          </div>
          <h1 className="h2">{t(`${slide.key}t`)}</h1>
          <p className="welcome__text">{t(slide.key)}</p>
        </section>
        <div className="welcome__dots" aria-hidden="true">
          {SLIDES.map((s, n) => (
            <i key={s.key} className={n === i ? "is-on" : ""} />
          ))}
        </div>
        <div className="welcome__nav">
          {i > 0 && (
            <button type="button" className="icon-btn welcome__back" onClick={() => setI(i - 1)} aria-label={t("back")}>
              <ChevronLeft size={20} />
            </button>
          )}
          <button type="button" className="btn welcome__next" onClick={() => (last ? router.replace("/today") : setI(i + 1))}>
            {last ? t("done") : t("next")}
          </button>
        </div>
      </main>
    </div>
  );
}

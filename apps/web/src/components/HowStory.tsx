"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Ornament, Star4 } from "./icons";

const STEPS = [1, 2, 3, 4, 5] as const;
const FEELINGS = [
  "calm",
  "hope",
  "tenderness",
  "tiredness",
  "sadness",
  "anxiety",
  "anger",
] as const;

/**
 * "How it works" as a story: the steps scroll past while a phone stays pinned
 * beside them and shows what each step looks like.
 */
export function HowStory() {
  const t = useTranslations("how");
  const tf = useTranslations("feelings");
  const td = useTranslations("demo");
  const tdi = useTranslations("diary");
  const tc = useTranslations("cards");
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting)
            setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const note = tdi("entryNote");
  const typed = useTyping(note, active === 3);

  return (
    <section className="section how" id="how" aria-labelledby="how-title">
      <div className="container">
        <header className="section-head reveal">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 id="how-title" className="h2">
            {t("title")}
          </h2>
          <Ornament />
          <p className="lead">{t("sub")}</p>
        </header>

        <div className="story">
          <ol className="story__steps">
            {STEPS.map((n, i) => (
              <li
                key={n}
                ref={(el) => {
                  steps.current[i] = el;
                }}
                data-i={i}
                className={`story__step ${active === i ? "is-active" : ""}`}
              >
                <button
                  type="button"
                  className="story__step-btn"
                  onClick={() => setActive(i)}
                  aria-pressed={active === i}
                >
                  <span className="story__num">{n}</span>
                  <span>
                    <span className="story__title">{t(`s${n}t`)}</span>
                    <span className="story__body">{t(`s${n}`)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="story__phone-wrap" aria-hidden="true">
            <div className="story__phone">
              <div className={`screen ${active === 0 ? "is-on" : ""}`}>
                <p className="screen__title">{td("ask")}</p>
                <div className="screen__chips">
                  {FEELINGS.map((f) => (
                    <span
                      key={f}
                      className={`screen__chip ${f === "tiredness" ? "is-picked" : ""}`}
                    >
                      {tf(f)}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className={`screen screen--deck ${active === 1 ? "is-on" : ""}`}
              >
                <span className="screen__deck">
                  <Image src="/cards/back.webp" alt="" fill sizes="160px" />
                  <span className="screen__glow" />
                </span>
                <p className="screen__hint">{td("tap")}</p>
              </div>

              <div className={`screen ${active === 2 ? "is-on" : ""}`}>
                <span className="screen__card">
                  <Image src="/cards/demo-25.webp" alt="" fill sizes="160px" />
                </span>
                <p className="screen__q">{(tc.raw("25") as string[])[1]}</p>
              </div>

              <div className={`screen ${active === 3 ? "is-on" : ""}`}>
                <p className="screen__q screen__q--top">
                  {(tc.raw("25") as string[])[1]}
                </p>
                <div className="screen__note">
                  {typed}
                  <span className="caret" />
                </div>
              </div>

              <div
                className={`screen screen--saved ${active === 4 ? "is-on" : ""}`}
              >
                <span className="saved-star">
                  <Star4 size={40} />
                </span>
                <p className="screen__feel">
                  {tdi("entryBefore")} → {tdi("entryAfter")}
                </p>
                <p className="screen__title">{t("saved")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Types `text` out while `on`; shows it whole when motion is reduced. */
function useTyping(text: string, on: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return setN(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return setN(text.length);
    const id = setInterval(
      () => setN((x) => (x >= text.length ? x : x + 1)),
      45,
    );
    return () => clearInterval(id);
  }, [on, text]);
  return text.slice(0, n);
}

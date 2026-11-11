"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "@svity/tokens";
import { RitualCard, type RitualStage } from "./ritual/RitualCard";
import { Ornament, Star4 } from "./icons";

const FEELINGS = [
  "calm",
  "hope",
  "tenderness",
  "tiredness",
  "sadness",
  "anxiety",
  "anger",
] as const;
type Feeling = (typeof FEELINGS)[number];

const DEMO_CARDS = ["11", "12", "20", "21", "22"] as const;
type DemoCard = (typeof DEMO_CARDS)[number];
const DEMO_REPICKS = 2;

type Phase = "before" | "draw" | "card" | "after" | "done";

const STEPS = ["feeling", "card", "question", "after"] as const;
const STEP_OF: Record<Phase, number> = {
  before: 0,
  draw: 1,
  card: 2,
  after: 3,
  done: 4,
};

function shuffle<T>(xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Days since the epoch for the visitor's local calendar date. */
function localDay(now = new Date()) {
  return Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000,
  );
}

/** Everyone gets the same first card (and question) on the same calendar day. */
function todaysOrder(day: number): DemoCard[] {
  const first = DEMO_CARDS[day % DEMO_CARDS.length]!;
  return [first, ...shuffle(DEMO_CARDS.filter((c) => c !== first))];
}

function untilMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(
    1,
    Math.ceil((next.getTime() - now.getTime()) / 60_000),
  );
  return { h: Math.floor(mins / 60), m: mins % 60 };
}

export function Demo() {
  const t = useTranslations("demo");
  const tf = useTranslations("feelings");
  const tc = useTranslations("cards");
  const tn = useTranslations("nav");

  const [phase, setPhase] = useState<Phase>("before");
  const [stage, setStage] = useState<RitualStage>("deck");
  const [order, setOrder] = useState<DemoCard[]>([...DEMO_CARDS]);
  const [idx, setIdx] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [repicks, setRepicks] = useState(DEMO_REPICKS);
  const [before, setBefore] = useState<Feeling | null>(null);
  const [after, setAfter] = useState<Feeling | null>(null);
  const [note, setNote] = useState("");
  const busy = useRef(false);
  const panel = useRef<HTMLDivElement>(null);

  // On narrow screens the panel sits under the card: bring each new step into view.
  useEffect(() => {
    if (phase === "before" || !panel.current || window.innerWidth >= 860)
      return;
    panel.current.scrollIntoView({
      behavior: reduced() ? "auto" : "smooth",
      block: "center",
    });
  }, [phase]);

  const [day, setDay] = useState(0);
  const [left, setLeft] = useState({ h: 0, m: 0 });

  useEffect(() => {
    const d = localDay();
    setDay(d);
    setOrder(todaysOrder(d));
    const tick = () => setLeft(untilMidnight());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const card = order[idx]!;
  const reduced = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  async function draw() {
    if (busy.current) return;
    busy.current = true;
    setQIndex(idx === 0 ? day % 3 : Math.floor(Math.random() * 3));
    if (!reduced()) {
      setStage("waking");
      await wait(motion.ritual.durationMs);
    }
    setStage("flipped");
    navigator.vibrate?.(motion.haptic.flipMs);
    if (!reduced()) await wait(motion.flip.durationMs);
    setPhase("card");
    busy.current = false;
  }

  async function repick() {
    if (busy.current || repicks === 0 || idx >= order.length - 1) return;
    busy.current = true;
    setStage("deck");
    if (!reduced()) await wait(motion.flip.durationMs / 2);
    setIdx((i) => i + 1);
    setRepicks((r) => r - 1);
    setQIndex(Math.floor(Math.random() * 3));
    setStage("flipped");
    if (!reduced()) await wait(motion.flip.durationMs);
    busy.current = false;
  }

  function restart() {
    setOrder(todaysOrder(day));
    setIdx(0);
    setRepicks(DEMO_REPICKS);
    setBefore(null);
    setAfter(null);
    setNote("");
    setStage("deck");
    setPhase("before");
  }

  const questions = tc.raw(card) as string[];

  return (
    <section className="section demo" id="try" aria-labelledby="demo-title">
      <div className="container">
        <header className="section-head reveal">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 id="demo-title" className="h2">
            {t("title")}
          </h2>
          <Ornament />
          <p className="lead">{t("sub")}</p>
        </header>

        <div className={`demo__stage demo__stage--${phase}`}>
          <div className="demo__card-col">
            <RitualCard
              stage={stage}
              onDraw={phase === "draw" ? draw : undefined}
              deckLabel={t("deckLabel")}
              front={{
                src: `/cards/demo-${card}.webp`,
                alt: t("cardAlt", { n: card }),
              }}
              stacked={phase === "before" || phase === "draw"}
            />
            {phase === "draw" && <p className="demo__hint">{t("tap")}</p>}
            {(phase === "before" || phase === "draw") && (
              <p className="demo__shared">{t("shared")}</p>
            )}
            {(phase === "card" || phase === "after" || phase === "done") && (
              <p className="demo__shared">
                {idx === 0
                  ? t("sharedCard", { n: card })
                  : t("cardN", { n: card })}{" "}
                · {t("nextIn", { time: t("hm", left) })}
              </p>
            )}
          </div>

          <div ref={panel} className="demo__panel glass" aria-live="polite">
            <ol className="demo__steps" aria-label={t("stepsLabel")}>
              {STEPS.map((k, i) => {
                const at = STEP_OF[phase];
                return (
                  <li
                    key={k}
                    className={
                      i < at ? "is-done" : i === at ? "is-current" : ""
                    }
                    aria-current={i === at ? "step" : undefined}
                  >
                    <span className="demo__step-n">{i + 1}</span>
                    <span className="demo__step-t">{t(`steps.${k}`)}</span>
                  </li>
                );
              })}
            </ol>
            <div className="demo__body">
              {phase === "before" && (
                <FeelingPicker
                  title={t("ask")}
                  hint={t("askHint")}
                  label={(f) => tf(f)}
                  selected={before}
                  onPick={(f) => {
                    setBefore(f);
                    setPhase("draw");
                  }}
                />
              )}

              {phase === "draw" && (
                <div className="demo__step">
                  <p className="demo__label">{t("ask")}</p>
                  <p className="chip chip--selected">{before && tf(before)}</p>
                  <p className="demo__big">{t("tap")}</p>
                </div>
              )}

              {phase === "card" && (
                <div className="demo__step">
                  <p className="demo__label">{t("questionLabel")}</p>
                  <p className="question">{questions[qIndex]}</p>
                  <textarea
                    className="field field--area"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("note")}
                    aria-label={t("note")}
                  />
                  <div className="demo__actions">
                    {repicks > 0 ? (
                      <button
                        type="button"
                        className="link-btn"
                        onClick={repick}
                      >
                        {t("repick", { n: repicks })}
                      </button>
                    ) : (
                      <span className="demo__muted">{t("lastCard")}</span>
                    )}
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setPhase("after")}
                    >
                      {t("continue")}
                    </button>
                  </div>
                </div>
              )}

              {phase === "after" && (
                <FeelingPicker
                  title={t("after")}
                  label={(f) => tf(f)}
                  selected={after}
                  onPick={(f) => {
                    setAfter(f);
                    setPhase("done");
                  }}
                />
              )}

              {phase === "done" && (
                <div className="demo__step demo__done">
                  <span className="saved-star" aria-hidden="true">
                    <Star4 size={44} />
                  </span>
                  <p className="demo__feelings">
                    {before && tf(before)} <span aria-hidden="true">→</span>{" "}
                    {after && tf(after)}
                  </p>
                  <p className="h3">{t("done")}</p>
                  <p className="demo__muted">{t("doneSub")}</p>
                  <div className="demo__actions demo__actions--center">
                    <a href="#join" className="btn">
                      {tn("cta")}
                    </a>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={restart}
                    >
                      {t("again")}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {phase !== "done" && (
              <p className="demo__privacy">{t("privacy")}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeelingPicker({
  title,
  hint,
  label,
  selected,
  onPick,
}: {
  title: string;
  hint?: string;
  label: (f: Feeling) => string;
  selected: Feeling | null;
  onPick: (f: Feeling) => void;
}) {
  return (
    <div className="demo__step">
      <p className="h3">{title}</p>
      {hint && <p className="demo__muted demo__hint-text">{hint}</p>}
      <div className="chips" role="group" aria-label={title}>
        {FEELINGS.map((f) => (
          <button
            key={f}
            type="button"
            className={`chip chip--${f} ${selected === f ? "chip--selected" : ""}`}
            aria-pressed={selected === f}
            onClick={() => onPick(f)}
          >
            {label(f)}
          </button>
        ))}
      </div>
    </div>
  );
}

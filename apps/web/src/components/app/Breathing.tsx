"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// Spec §11/§8: in 4 · hold 4 · out 6. Four rounds ≈ one minute.
const PHASES = [
  { key: "in", s: 4 },
  { key: "hold", s: 4 },
  { key: "out", s: 6 },
] as const;
const ROUNDS = 4;

type State = { round: number; phase: number; left: number } | "idle" | "done";

/** A guided breath. The circle grows on the in-breath, rests, and shrinks on the out-breath. */
export function Breathing({ autoStart = false, onDone }: { autoStart?: boolean; onDone?: () => void }) {
  const t = useTranslations("app.breath");
  const [state, setState] = useState<State>(autoStart ? { round: 0, phase: 0, left: PHASES[0].s } : "idle");
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (typeof state !== "object") return;
    const id = setTimeout(() => {
      if (state.left > 1) return setState({ ...state, left: state.left - 1 });
      const nextPhase = state.phase + 1;
      if (nextPhase < PHASES.length) return setState({ round: state.round, phase: nextPhase, left: PHASES[nextPhase]!.s });
      if (state.round + 1 < ROUNDS) return setState({ round: state.round + 1, phase: 0, left: PHASES[0].s });
      setState("done");
      done.current?.();
    }, 1000);
    return () => clearTimeout(id);
  }, [state]);

  const start = () => setState({ round: 0, phase: 0, left: PHASES[0].s });
  const phase = typeof state === "object" ? PHASES[state.phase]! : null;

  return (
    <div className="breath">
      <div
        className={`breath__circle ${phase ? `breath__circle--${phase.key}` : ""}`}
        style={phase ? ({ "--dur": `${phase.s}s` } as React.CSSProperties) : undefined}
        aria-hidden="true"
      />
      <div className="breath__text" aria-live="polite">
        {state === "idle" && (
          <>
            <p className="h3">{t("title")}</p>
            <p className="app-muted">{t("sub")}</p>
            <button type="button" className="btn" onClick={start}>
              {t("start")}
            </button>
          </>
        )}
        {phase && typeof state === "object" && (
          <>
            <p className="breath__phase">{t(phase.key)}</p>
            <p className="breath__count">{t("seconds", { n: state.left })}</p>
            <p className="breath__rounds" aria-hidden="true">
              {Array.from({ length: ROUNDS }, (_, i) => (
                <span key={i} className={i <= state.round ? "is-on" : ""} />
              ))}
            </p>
          </>
        )}
        {state === "done" && (
          <>
            <p className="h3">{t("done")}</p>
            <button type="button" className="link-btn" onClick={start}>
              {t("again")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

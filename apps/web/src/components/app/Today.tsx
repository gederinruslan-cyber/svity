"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { feelings, type Feeling, type Me, type TodayView } from "@svity/contracts";
import { motion } from "@svity/tokens";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError, getMe, getMonth, getToday, preload } from "@/lib/api";
import { RitualCard, type RitualStage } from "../ritual/RitualCard";
import { Star4 } from "../icons";
import { AfterShadow, useEvening } from "./ShadowSteps";

type Phase = "loading" | "before" | "draw" | "card" | "after-shadow" | "after" | "done";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const draftKey = (v: TodayView) => (v.state === "open" ? `svity-draft:${v.nextAvailableAt}` : "");

function readDraft(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function writeDraft(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {}
}

/** Today's card (spec §6): feelings → deck → card + question + note → feelings → saved. */
export function Today() {
  const t = useTranslations("app.today");
  const tf = useTranslations("feelings");
  const td = useTranslations("app.difficult");
  const locale = useLocale();
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [view, setView] = useState<TodayView | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [stage, setStage] = useState<RitualStage>("deck");
  const [before, setBefore] = useState<Feeling | null>(null);
  const [request, setRequest] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [note, setNote] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);

  const fail = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) return router.replace("/signin");
      setError(true);
      busy.current = false;
    },
    [router],
  );

  const show = useCallback((v: TodayView) => {
    setView(v);
    setError(false);
    if (v.state === "ready") {
      setStage("deck");
      setPhase("before");
    } else if (v.state === "open") {
      setStage("flipped");
      setBefore(v.feelingBefore);
      setNote(readDraft(draftKey(v)));
      setPhase((p) => (p === "after" ? p : "card"));
    } else {
      setPhase("done");
    }
  }, []);

  // Reload when the language changes: questions come in the page language.
  useEffect(() => {
    Promise.all([getMe(), getToday(locale)])
      .then(([m, v]) => {
        setMe(m);
        show(v);
      })
      .catch(fail);
  }, [locale, show, fail]);

  async function draw() {
    if (busy.current || !before) return;
    busy.current = true;
    try {
      const anim = reduced() ? Promise.resolve() : (setStage("waking"), wait(motion.ritual.durationMs));
      const v = await api<TodayView>(`/v1/today/draw?locale=${locale}`, {
        method: "POST",
        body: { feelingBefore: before, request: request.trim() || undefined },
      });
      if (v.state === "open") await preload(v.card.imageUrl);
      await anim;
      setView(v);
      setStage("flipped");
      navigator.vibrate?.(motion.haptic.flipMs);
      if (!reduced()) await wait(motion.flip.durationMs);
      show(v);
      busy.current = false;
    } catch (err) {
      setStage("deck");
      fail(err);
    }
  }

  async function repick() {
    if (busy.current) return;
    busy.current = true;
    try {
      const v = await api<TodayView>(`/v1/today/repick?locale=${locale}`, { method: "POST" });
      if (v.state === "open") await preload(v.card.imageUrl);
      setStage("deck");
      if (!reduced()) await wait(motion.flip.durationMs / 2);
      setView(v);
      setStage("flipped");
      if (!reduced()) await wait(motion.flip.durationMs);
      busy.current = false;
    } catch (err) {
      fail(err);
    }
  }

  async function finish(path: "save" | "close", body?: unknown) {
    if (busy.current || !view) return;
    busy.current = true;
    const key = draftKey(view);
    try {
      const v = await api<TodayView>(`/v1/today/${path}?locale=${locale}`, { method: "POST", body });
      writeDraft(key, "");
      setJustSaved(path === "save");
      setConfirmClose(false);
      show(v);
      busy.current = false;
    } catch (err) {
      fail(err);
    }
  }

  useEvening(view?.state === "open" && view.card.isShadow && phase !== "done");

  if (phase === "loading") return <p className="app-loading">{t("loading")}</p>;

  if (phase === "done" && view?.state === "done") {
    return <Done view={view} me={me} justSaved={justSaved} onReady={() => getToday(locale).then(show).catch(fail)} />;
  }

  const open = view?.state === "open" ? view : null;

  return (
    <section className="today">
      <div className={`demo__stage demo__stage--${phase}`}>
        <div className="demo__card-col">
          <RitualCard
            stage={stage}
            onDraw={phase === "draw" ? draw : undefined}
            deckLabel={t("deckLabel")}
            front={open ? { src: open.card.imageUrl, alt: t("cardAlt", { n: open.card.id }) } : null}
            stacked={phase === "before" || phase === "draw"}
            unoptimized
          />
          {phase === "draw" && <p className="demo__hint">{t("tap")}</p>}
          {open && <p className="demo__shared">{t("cardN", { n: open.card.id })}</p>}
        </div>

        <div className="demo__panel glass" aria-live="polite">
          {phase === "before" && (
            <div className="demo__step">
              <FeelingPicker
                title={t("ask")}
                label={(f) => tf(f)}
                selected={before}
                onPick={(f) => {
                  setBefore(f);
                  setPhase("draw");
                }}
              />
              {showRequest ? (
                <label className="today__request">
                  <span className="field-label">{t("requestLabel")}</span>
                  <input
                    className="field"
                    maxLength={500}
                    value={request}
                    onChange={(e) => setRequest(e.target.value)}
                    placeholder={t("requestPlaceholder")}
                  />
                </label>
              ) : (
                <button type="button" className="link-btn" onClick={() => setShowRequest(true)}>
                  {t("addRequest")}
                </button>
              )}
              <Link href="/difficult-day" className="link-btn today__difficult">
                {td("link")}
              </Link>
            </div>
          )}

          {phase === "draw" && (
            <div className="demo__step">
              <p className="demo__label">{t("ask")}</p>
              <p className="chip chip--selected">{before && tf(before)}</p>
              {request && <p className="today__req-text">“{request}”</p>}
              <p className="demo__big">{t("tap")}</p>
            </div>
          )}

          {phase === "card" && open && (
            <div className="demo__step">
              {open.request && <p className="today__req-text">“{open.request}”</p>}
              <p className="demo__label">{t("questionLabel")}</p>
              <p className="question">{open.card.question}</p>
              <textarea
                className="field field--area"
                rows={4}
                maxLength={10_000}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  writeDraft(draftKey(open), e.target.value);
                }}
                placeholder={t("note")}
                aria-label={t("note")}
              />
              <div className="demo__actions">
                {open.repicksLeft > 0 ? (
                  <button type="button" className="link-btn" onClick={repick}>
                    {t("repick", { n: open.repicksLeft })}
                  </button>
                ) : (
                  <span className="demo__muted">{t("lastCard")}</span>
                )}
                <button type="button" className="btn" onClick={() => setPhase(open.support ? "after-shadow" : "after")}>
                  {t("continue")}
                </button>
              </div>
              {confirmClose ? (
                <div className="today__close" role="alert">
                  <p className="demo__muted">{t("closeHint")}</p>
                  <div className="demo__actions">
                    <button type="button" className="link-btn" onClick={() => setConfirmClose(false)}>
                      {t("closeCancel")}
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => finish("close")}>
                      {t("closeConfirm")}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="link-btn today__close-btn" onClick={() => setConfirmClose(true)}>
                  {t("close")}
                </button>
              )}
            </div>
          )}

          {phase === "after-shadow" && open?.support && <AfterShadow support={open.support} onDone={() => setPhase("after")} />}

          {phase === "after" && open && (
            <FeelingPicker
              title={t("after")}
              label={(f) => tf(f)}
              selected={null}
              onPick={(f) => finish("save", { feelingAfter: f, note: note.trim() || undefined })}
            />
          )}

          {error && <p className="form-error">{t("error")}</p>}
        </div>
      </div>
    </section>
  );
}

function Done({
  view,
  me,
  justSaved,
  onReady,
}: {
  view: Extract<TodayView, { state: "done" }>;
  me: Me | null;
  justSaved: boolean;
  onReady: () => void;
}) {
  const t = useTranslations("app.today");
  const tf = useTranslations("feelings");
  const ts = useTranslations("app.shadow");
  const nextMs = Date.parse(view.nextAvailableAt);
  const [left, setLeft] = useState(() => nextMs - Date.now());
  const locale = useLocale();
  const [month, setMonth] = useState<{ name: string; count: number } | null>(null);

  useEffect(() => {
    getMonth(locale)
      .then((m) => {
        const [y, mo] = m.month.split("-").map(Number) as [number, number];
        const name = new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(y, mo - 1, 1));
        setMonth({ name: name.charAt(0).toUpperCase() + name.slice(1), count: m.count });
      })
      .catch(() => {});
  }, [locale, view]);

  useEffect(() => {
    const id = setInterval(() => {
      const ms = nextMs - Date.now();
      setLeft(ms);
      if (ms <= 0) onReady();
    }, 30_000);
    return () => clearInterval(id);
  }, [nextMs, onReady]);

  // The server picks midnight or 12:00 in the profile time zone; show which one it is.
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: me?.timezone }).format(nextMs),
  );
  const mins = Math.max(1, Math.ceil(left / 60_000));
  const e = view.entry;

  return (
    <section className="today today--done">
      <div className="today__done glass">
        <span className={`saved-star ${justSaved ? "is-new" : ""}`} aria-hidden="true">
          <Star4 size={44} />
        </span>
        {justSaved && <p className="today__saved">{t("saved")}</p>}
        {view.entry?.isShadow && <p className="question today__gentle">{ts("gentle")}</p>}
        <h1 className="h3">{t("drawn", { form: me?.addressForm ?? "n" })}</h1>
        <p className="today__next">
          {hour === 0 ? t("nextMidnight") : t("nextNoon")} · {t("countdown", { h: Math.floor(mins / 60), m: mins % 60 })}
        </p>
        <p className="app-hint">{t("rule")}</p>

        {e ? (
          <article className="entry entry--today">
            <span className="entry__thumb">
              <Image src={e.card.imageUrl} alt={t("cardAlt", { n: e.card.id })} fill sizes="72px" unoptimized />
            </span>
            <div>
              <p className="entry__meta">{t("cardN", { n: e.card.id })}</p>
              <p className="entry__q">{e.card.question}</p>
              <p className="entry__note">{e.note ?? t("noNote")}</p>
              <p className="entry__feel">
                <span className="chip chip--sm">{tf(e.feelingBefore)}</span>
                <span aria-hidden="true">→</span>
                <span className="chip chip--sm chip--sage">{tf(e.feelingAfter)}</span>
              </p>
            </div>
          </article>
        ) : (
          <p className="demo__muted">{t("closed")}</p>
        )}

        {month && month.count > 0 && <p className="today__month">{t("monthCount", { month: month.name, count: month.count })}</p>}
        <Link href="/diary" className="btn">
          {t("toDiary")}
        </Link>
      </div>
    </section>
  );
}

export function FeelingPicker({
  title,
  label,
  selected,
  onPick,
}: {
  title: string;
  label: (f: Feeling) => string;
  selected: Feeling | null;
  onPick: (f: Feeling) => void;
}) {
  return (
    <div className="demo__step">
      <p className="h3">{title}</p>
      <div className="chips" role="group" aria-label={title}>
        {feelings.map((f) => (
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

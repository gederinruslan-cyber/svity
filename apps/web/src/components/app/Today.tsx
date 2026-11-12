"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { feelings, type Feeling, type Me, type MonthView, type TodayView } from "@svity/contracts";
import { motion } from "@svity/tokens";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError, getMe, getMonth, getToday, preload } from "@/lib/api";
import { RitualCard, type RitualStage } from "../ritual/RitualCard";
import { Star4 } from "../icons";
import { Sky } from "../Sky";
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

  const step = phase === "before" ? 0 : phase === "draw" ? 1 : phase === "card" ? 2 : 3;
  const steps = [t("stepFeel"), t("stepCard"), t("stepQuestion"), t("stepAfter")];

  return (
    <section className="today">
      <Sky />
      <DayHead me={me} />
      <ol className="demo__steps today__steps" aria-label={t("stepsLabel")}>
        {steps.map((label, i) => (
          <li key={label} className={i === step ? "is-current" : i < step ? "is-done" : ""} aria-current={i === step ? "step" : undefined}>
            <span className="demo__step-n">{i + 1}</span>
            <span className="demo__step-t">{label}</span>
          </li>
        ))}
      </ol>
      <div className={`demo__stage today__stage demo__stage--${phase}`}>
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
              <p className="question today__question">{open.card.question}</p>
              <p className="today__look">{t("lookHint")}</p>
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
      <div className="today__below">
        <Week me={me} refresh={view} />
        <Tips />
      </div>
    </section>
  );
}

/** Date and a greeting for the time of day, in the profile time zone. */
function DayHead({ me }: { me: Me | null }) {
  const t = useTranslations("app.today");
  const locale = useLocale();
  const tz = me?.timezone;
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(now));
  const part = hour < 5 ? "Night" : hour < 12 ? "Morning" : hour < 18 ? "Day" : hour < 23 ? "Evening" : "Night";
  const greeting = t(`greet${part}`);
  const date = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(now);
  return (
    <header className="today__head">
      <p className="eyebrow">{date}</p>
      <h1 className="h2">{me?.displayName ? t("greetName", { greeting, name: me.displayName }) : greeting}</h1>
    </header>
  );
}

const DAY_MS = 86_400_000;

/** The last seven days in the profile time zone, oldest first (calendar days, UTC arithmetic). */
function lastWeek(tz: string | undefined) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz })
    .format(new Date())
    .split("-")
    .map(Number) as [number, number, number];
  const today = Date.UTC(y, m - 1, d);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today - (6 - i) * DAY_MS);
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { date, month, day: date.getUTCDate() };
  });
}

/** Seven days of cards: a thumbnail for each day with an entry, today outlined. */
function Week({ me, refresh }: { me: Me | null; refresh: unknown }) {
  const t = useTranslations("app.today");
  const locale = useLocale();
  const [cells, setCells] = useState<{ date: Date; entry: MonthView["days"][number] | null }[] | null>(null);
  const [monthCount, setMonthCount] = useState<{ name: string; count: number } | null>(null);

  useEffect(() => {
    if (!me) return;
    const days = lastWeek(me.timezone);
    const months = [...new Set(days.map((d) => d.month))];
    Promise.all(months.map((m) => getMonth(locale, m)))
      .then((views) => {
        const byMonth = new Map(views.map((v) => [v.month, v]));
        setCells(days.map((d) => ({ date: d.date, entry: byMonth.get(d.month)?.days.find((x) => x.day === d.day) ?? null })));
        const current = byMonth.get(days[6]!.month)!;
        const name = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(days[6]!.date);
        setMonthCount({ name: name.charAt(0).toUpperCase() + name.slice(1), count: current.count });
      })
      .catch(() => {});
  }, [me, locale, refresh]);

  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const drawn = cells?.filter((c) => c.entry).length ?? 0;

  return (
    <div className="week glass">
      <div className="week__head">
        <p className="h3">{t("weekTitle")}</p>
        <p className="week__count">{t("weekCount", { count: drawn })}</p>
      </div>
      <ol className="week__days">
        {(cells ?? lastWeek(me?.timezone).map((d) => ({ date: d.date, entry: null }))).map(({ date, entry }, i) => (
          <li key={date.toISOString()} className={`week__day ${i === 6 ? "is-today" : ""}`}>
            <span className="week__wd">{weekday.format(date)}</span>
            {entry ? (
              <Link href={`/diary/${entry.entryId}`} className="week__card" aria-label={t("cardN", { n: entry.card.id })}>
                <Image src={entry.card.imageUrl} alt="" fill sizes="64px" unoptimized />
              </Link>
            ) : (
              <span className="week__empty" aria-hidden="true">
                <Star4 size={10} />
              </span>
            )}
            <span className="week__n">{date.getUTCDate()}</span>
          </li>
        ))}
      </ol>
      <div className="week__foot">
        {monthCount && monthCount.count > 0 ? <span>{t("monthCount", { month: monthCount.name, count: monthCount.count })}</span> : <span>{t("weekEmpty")}</span>}
        <Link href="/diary">{t("toDiary")}</Link>
      </div>
    </div>
  );
}

/** Three quiet reminders of how the daily card works. */
function Tips() {
  const t = useTranslations("app.today");
  return (
    <aside className="tips glass" aria-labelledby="today-tips">
      <p id="today-tips" className="h3">
        {t("tipsTitle")}
      </p>
      <ul>
        {(["tip1", "tip2", "tip3"] as const).map((k) => (
          <li key={k}>
            <Star4 size={10} className="tips__star" />
            <span>{t(k)}</span>
          </li>
        ))}
      </ul>
      <Link href="/difficult-day" className="tips__difficult">
        {t("tipDifficult")}
      </Link>
    </aside>
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
      <Sky />
      <DayHead me={me} />
      <div className="today__done-grid">
        {e && (
          <figure className="today__done-card">
            <span className="today__done-img">
              <Image src={e.card.imageUrl} alt={t("cardAlt", { n: e.card.id })} fill sizes="(min-width: 860px) 320px, 72vw" unoptimized />
            </span>
            <figcaption className="demo__shared">{t("cardN", { n: e.card.id })}</figcaption>
          </figure>
        )}
        <div className="today__done glass">
          <span className={`saved-star ${justSaved ? "is-new" : ""}`} aria-hidden="true">
            <Star4 size={36} />
          </span>
          {justSaved && <p className="today__saved">{t("saved")}</p>}
          {view.entry?.isShadow && <p className="question today__gentle">{ts("gentle")}</p>}
          <p className="h3">{t("drawn", { form: me?.addressForm ?? "n" })}</p>

          {e ? (
            <div className="today__entry">
              <p className="demo__label">{t("questionLabel")}</p>
              <p className="question today__question">{e.card.question}</p>
              <p className="today__entry-note">{e.note ?? t("noNote")}</p>
              <p className="entry__feel">
                <span className="chip chip--sm">{tf(e.feelingBefore)}</span>
                <span aria-hidden="true">→</span>
                <span className="chip chip--sm chip--sage">{tf(e.feelingAfter)}</span>
              </p>
            </div>
          ) : (
            <p className="demo__muted">{t("closed")}</p>
          )}

          <div className="today__next-box">
            <p className="today__next">
              {hour === 0 ? t("nextMidnight") : t("nextNoon")} · {t("countdown", { h: Math.floor(mins / 60), m: mins % 60 })}
            </p>
            <p className="app-hint">{t("rule")}</p>
          </div>
          <div className="today__done-actions">
            <Link href={e ? `/diary/${e.id}` : "/diary"} className="btn">
              {e ? t("toEntry") : t("toDiary")}
            </Link>
          </div>
        </div>
      </div>
      <div className="today__below">
        <Week me={me} refresh={view} />
        <Tips />
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

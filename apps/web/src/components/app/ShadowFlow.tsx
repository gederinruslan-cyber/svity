"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { shadowModes, type Feeling, type ProfileStats, type ShadowMode, type ShadowView } from "@svity/contracts";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { FeelingPicker } from "./Today";
import { HelpButton } from "./HelpSheet";
import { AfterShadow, useEvening } from "./ShadowSteps";

type Stats = ProfileStats["shadow"];

/** Shadow cards (spec §8): invitation, consent, mode, and the separate one-a-day flow. */
export function ShadowFlow() {
  const t = useTranslations("app.shadow");
  const tt = useTranslations("app.today");
  const locale = useLocale();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [view, setView] = useState<ShadowView | null>(null);
  const [error, setError] = useState(false);

  const fail = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) return router.replace("/signin");
      setError(true);
    },
    [router],
  );

  const load = useCallback(
    () =>
      Promise.all([api<ProfileStats>("/v1/me/stats"), api<ShadowView>(`/v1/shadow?locale=${locale}`)])
        .then(([s, v]) => {
          setStats(s.shadow);
          setView(v);
          setError(false);
        })
        .catch(fail),
    [locale, fail],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function setMode(mode: ShadowMode | null, understood?: true) {
    try {
      await api("/v1/shadow/settings", { method: "PUT", body: { mode, understood } });
      await load();
    } catch (err) {
      fail(err);
    }
  }

  // The whole shadow space is in the evening theme (spec §8.5).
  useEvening(!!stats?.consented && !!stats.mode && !stats.softStop);

  if (!stats || !view) return <p className="app-loading">{error ? tt("error") : tt("loading")}</p>;

  let body: React.ReactNode;
  if (stats.softStop) body = <SoftStop />;
  else if (!stats.eligible) body = <Locked stats={stats} />;
  else if (!stats.consented) body = <Consent onAccept={(mode) => setMode(mode, true)} />;
  else if (!stats.mode) body = <TurnedOff onTurnOn={(mode) => setMode(mode)} />;
  else body = <Flow view={view} onView={setView} onError={fail} />;

  return (
    <section className="shadow-page container container--narrow">
      <h1 className="h2">{t("title")}</h1>
      {body}
      {stats.consented && stats.mode && !stats.softStop && view.state !== "open" && (
        <div className="shadow-page__settings">
          <p className="field-label">{t("modeTitle")}</p>
          <ModePicker value={stats.mode} onChange={(m) => setMode(m)} />
          <button type="button" className="link-btn" onClick={() => setMode(null)}>
            {t("turnOff")}
          </button>
        </div>
      )}
      {error && <p className="form-error">{tt("error")}</p>}
    </section>
  );
}

function SoftStop() {
  const t = useTranslations("app.shadow");
  const td = useTranslations("app.difficult");
  return (
    <div className="shadow-page__panel glass">
      <h2 className="h3">{t("softTitle")}</h2>
      <p>{t("soft")}</p>
      <p className="app-muted">{t("softPsych")}</p>
      <div className="difficult__actions">
        <HelpButton withLabel />
        <Link href="/difficult-day" className="link-btn">
          {td("link")}
        </Link>
      </div>
    </div>
  );
}

function Locked({ stats }: { stats: Stats }) {
  const t = useTranslations("app.shadow");
  const tp = useTranslations("app.profile");
  return (
    <div className="shadow-page__panel glass">
      <h2 className="h3">{t("lockedTitle")}</h2>
      <p className="app-muted">{t("locked")}</p>
      <p>
        {tp("shadowDays")}: {stats.days}/{stats.daysNeeded} · {tp("shadowEntries")}: {stats.entries}/{stats.entriesNeeded}
      </p>
    </div>
  );
}

function ModePicker({ value, onChange }: { value: ShadowMode | null; onChange: (m: ShadowMode) => void }) {
  const t = useTranslations("app.shadow");
  return (
    <div className="shadow-modes" role="radiogroup" aria-label={t("modeTitle")}>
      {shadowModes.map((m) => (
        <button key={m} type="button" role="radio" aria-checked={value === m} className={`shadow-mode ${value === m ? "is-on" : ""}`} onClick={() => onChange(m)}>
          <span className="shadow-mode__title">{t(m)}</span>
          <span className="shadow-mode__hint">{t(`${m}Hint`)}</span>
        </button>
      ))}
    </div>
  );
}

function Consent({ onAccept }: { onAccept: (mode: ShadowMode) => void }) {
  const t = useTranslations("app.shadow");
  const [ok, setOk] = useState(false);
  const [mode, setMode] = useState<ShadowMode>("on_request");
  return (
    <div className="shadow-page__panel glass">
      <Image src="/brand/door.webp" alt="" width={120} height={120} className="shadow-page__art" />
      <h2 className="h3">{t("consentTitle")}</h2>
      <p className="app-muted">{t("sub")}</p>
      <ul className="shadow-page__points">
        {(["c1", "c2", "c3", "c4"] as const).map((k) => (
          <li key={k}>{t(k)}</li>
        ))}
      </ul>
      <p className="field-label">{t("modeTitle")}</p>
      <ModePicker value={mode} onChange={setMode} />
      <label className="shadow-page__check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>{t("understood")}</span>
      </label>
      <button type="button" className="btn btn--block" disabled={!ok} onClick={() => onAccept(mode)}>
        {t("open")}
      </button>
    </div>
  );
}

function TurnedOff({ onTurnOn }: { onTurnOn: (mode: ShadowMode) => void }) {
  const t = useTranslations("app.shadow");
  const [mode, setMode] = useState<ShadowMode>("on_request");
  return (
    <div className="shadow-page__panel glass">
      <p className="app-muted">{t("off")}</p>
      <p className="field-label">{t("modeTitle")}</p>
      <ModePicker value={mode} onChange={setMode} />
      <button type="button" className="btn" onClick={() => onTurnOn(mode)}>
        {t("turnOn")}
      </button>
    </div>
  );
}

type Step = "card" | "after-shadow" | "after";

function Flow({ view, onView, onError }: { view: ShadowView; onView: (v: ShadowView) => void; onError: (e: unknown) => void }) {
  const t = useTranslations("app.shadow");
  const tt = useTranslations("app.today");
  const tf = useTranslations("feelings");
  const locale = useLocale();
  const [step, setStep] = useState<Step>("card");
  const [note, setNote] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  const post = async (path: string, body?: unknown) => {
    try {
      onView(await api<ShadowView>(`/v1/shadow/${path}?locale=${locale}`, { method: "POST", body: body ?? {} }));
      setStep("card");
    } catch (err) {
      onError(err);
    }
  };

  if (view.state === "locked") return null;

  if (view.state === "ready") {
    return (
      <div className="shadow-page__panel glass">
        <h2 className="h3">{t("drawTitle")}</h2>
        <FeelingPicker title={t("drawSub")} label={(f) => tf(f)} selected={null} onPick={(f: Feeling) => post("draw", { feelingBefore: f })} />
      </div>
    );
  }

  if (view.state === "used") {
    return (
      <div className="shadow-page__panel glass">
        <h2 className="h3">{t("usedTitle")}</h2>
        {view.entry && <p className="question">{t("gentle")}</p>}
        <p className="app-muted">{t("used")}</p>
        {view.entry && (
          <Link href={`/diary/${view.entry.id}`} className="btn btn--ghost">
            {t("toEntry")}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="shadow-page__open">
      <span className="shadow-page__card">
        <Image src={view.card.imageUrl} alt={tt("cardAlt", { n: view.card.id })} fill sizes="(max-width: 700px) 60vw, 280px" unoptimized draggable={false} priority />
      </span>
      <div className="shadow-page__panel glass">
        {step === "card" && (
          <div className="demo__step">
            <p className="demo__label">{t("label")}</p>
            <p className="question">{view.card.question}</p>
            <textarea
              className="field field--area"
              rows={4}
              maxLength={10_000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={tt("note")}
              aria-label={tt("note")}
            />
            <div className="demo__actions">
              <button type="button" className="btn" onClick={() => setStep("after-shadow")}>
                {tt("continue")}
              </button>
            </div>
            {confirmClose ? (
              <div className="today__close" role="alert">
                <p className="demo__muted">{tt("closeHint")}</p>
                <div className="demo__actions">
                  <button type="button" className="link-btn" onClick={() => setConfirmClose(false)}>
                    {tt("closeCancel")}
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => post("close")}>
                    {tt("closeConfirm")}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="link-btn today__close-btn" onClick={() => setConfirmClose(true)}>
                {tt("close")}
              </button>
            )}
          </div>
        )}
        {step === "after-shadow" && <AfterShadow support={view.support} onDone={() => setStep("after")} />}
        {step === "after" && (
          <FeelingPicker title={tt("after")} label={(f) => tf(f)} selected={null} onPick={(f) => post("save", { feelingAfter: f, note: note.trim() || undefined })} />
        )}
      </div>
    </div>
  );
}

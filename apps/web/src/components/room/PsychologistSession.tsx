"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PsychologistRoomView } from "@svity/contracts";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { Breathing } from "../app/Breathing";
import { formatCode, roomLink } from "./Cabinet";
import { SummaryCards } from "./SummaryCards";
import { useLive, usePause } from "./useLive";

const DEEPER = ["d1", "d2", "d3", "d4"] as const;

/**
 * The psychologist's side (spec §10): only confirmed cards appear in their slots, with their three
 * questions and deepening questions; private notes; shared pause; finish and send the summary.
 */
export function PsychologistSession({ id }: { id: string }) {
  const t = useTranslations("app.cabinet");
  const tr = useTranslations("app.room");
  const tt = useTranslations("app.today");
  const { view, connected, refresh } = useLive<PsychologistRoomView>(`/v1/rooms/${id}/live`, `/v1/rooms/${id}`);
  const paused = usePause(view?.pauseAt ?? null);
  const [selected, setSelected] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Select the newest confirmed card as it arrives.
  const confirmedCount = view?.confirmed.filter(Boolean).length ?? 0;
  useEffect(() => {
    if (!view) return;
    const last = view.confirmed.map((c, i) => (c ? i : -1)).filter((i) => i >= 0).pop();
    if (last !== undefined) setSelected(last);
  }, [confirmedCount]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!view) return <p className="app-loading">{tt("loading")}</p>;

  const post = async (path: string, body: unknown = {}) => {
    await api(`/v1/rooms/${id}/${path}`, { method: "POST", body });
    if (!connected) await refresh();
  };
  const status = view.clientOnline ? "inRoom" : view.clientJoined ? "joinedAway" : "notJoined";
  const card = selected !== null ? view.confirmed[selected] : null;

  return (
    <section className="session container">
      <Link href="/cabinet" className="entry-page__back">
        ← {t("back")}
      </Link>
      <header className="session__head">
        <div>
          <h1 className="h2">{view.clientLabel}</h1>
          <p className={`session__status is-${status}`}>
            <span className="session__dot" aria-hidden="true" /> {t(status, { name: view.clientLabel })}
            {view.returns !== null && <> · {t("returned", { n: view.returns })}</>}
          </p>
        </div>
        <div className="session__tools">
          {!view.ended && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(roomLink(view.code)).catch(() => {});
                setCopied(true);
              }}
            >
              {copied ? t("copied") : formatCode(view.code)}
            </button>
          )}
          {view.videoUrl && (
            <a className="btn btn--ghost" href={view.videoUrl} target="_blank" rel="noopener noreferrer">
              {tr("video")} ↗
            </a>
          )}
        </div>
      </header>

      <ol className="session__slots">
        {view.positions.map((p, i) => {
          const c = view.confirmed[i];
          return (
            <li key={p}>
              <button type="button" className={`session__slot ${selected === i ? "is-selected" : ""}`} disabled={!c} onClick={() => setSelected(i)} aria-pressed={selected === i}>
                <span className="session__slot-card">
                  {c ? <Image src={c.imageUrl} alt={tt("cardAlt", { n: c.id })} fill sizes="(max-width: 900px) 30vw, 200px" unoptimized draggable={false} /> : <span className="session__empty">{t("emptySlot")}</span>}
                </span>
                <span className="room-slot__label">{tr(`positions.${p}`)}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="session__grid">
        <div className="session__panel glass">
          {card ? (
            <>
              <p className="field-label">
                {t("questions")} · {tt("cardN", { n: card.id })}
              </p>
              <ol className="session__questions">
                {card.questions.map((q) => (
                  <li key={q.index} className="question">
                    {q.text}
                  </li>
                ))}
              </ol>
              <p className="field-label">
                {t("deeper")} <span className="app-hint">· {t("deeperHint")}</span>
              </p>
              <ul className="session__deeper">
                {DEEPER.map((k) => (
                  <li key={k}>{t(k)}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="app-muted">{t("selectCard")}</p>
          )}
        </div>

        <div className="session__side">
          <Notes id={id} initial={view.notes} />
          {!view.ended && (
            <div className="session__actions">
              <button type="button" className="btn btn--ghost" disabled={paused || !view.clientJoined} onClick={() => post("pause")}>
                {paused ? t("pauseOn") : t("pause")}
              </button>
              <button type="button" className="btn" onClick={() => setFinishing(true)}>
                {t("finish")}
              </button>
            </div>
          )}
          {paused && (
            <div className="session__pause glass">
              <Breathing key={view.pauseAt} autoStart />
            </div>
          )}
        </div>
      </div>

      {finishing && !view.ended && <Finish view={view} onCancel={() => setFinishing(false)} onSend={(week) => post("end", { weekQuestion: week }).then(() => setFinishing(false))} />}

      {view.ended && (
        <div className="session__ended">
          <p className="app-muted">{view.summary ? t("ended") : t("endedNoCards")}</p>
          {view.summary && <SummaryCards summary={view.summary} />}
        </div>
      )}
    </section>
  );
}

/** Private notes, saved as you type. */
function Notes({ id, initial }: { id: string; initial: string }) {
  const t = useTranslations("app.cabinet");
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return (
    <label className="session__notes glass">
      <span className="field-label">
        {t("notes")} <span className="app-hint">· {t("notesHint")}</span> {saved && <span className="profile__saved">· {t("notesSaved")}</span>}
      </span>
      <textarea
        className="field field--area"
        rows={8}
        maxLength={20_000}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          setSaved(false);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => api(`/v1/rooms/${id}/notes`, { method: "PUT", body: { text: v } }).then(() => setSaved(true)), 700);
        }}
      />
    </label>
  );
}

function Finish({ view, onCancel, onSend }: { view: PsychologistRoomView; onCancel: () => void; onSend: (w: { cardId: number; index: number } | null) => void }) {
  const t = useTranslations("app.cabinet");
  const tr = useTranslations("app.room");
  const [week, setWeek] = useState<string>("none");
  const options = view.confirmed.flatMap((c, i) =>
    c ? c.questions.map((q) => ({ key: `${c.id}:${q.index}`, cardId: c.id, index: q.index, text: q.text, position: view.positions[i]! })) : [],
  );
  return (
    <div className="session__finish glass" role="dialog" aria-labelledby="finish-title">
      <h2 id="finish-title" className="h3">
        {t("finishTitle")}
      </h2>
      <fieldset className="profile__field">
        <legend className="field-label">{t("chooseWeek")}</legend>
        <label className="session__option">
          <input type="radio" name="week" value="none" checked={week === "none"} onChange={() => setWeek("none")} /> {t("noWeek")}
        </label>
        {options.map((o) => (
          <label key={o.key} className="session__option">
            <input type="radio" name="week" value={o.key} checked={week === o.key} onChange={() => setWeek(o.key)} />
            <span>
              <span className="app-hint">{tr(`positions.${o.position}`)} · </span>
              {o.text}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="demo__actions">
        <button type="button" className="link-btn" onClick={onCancel}>
          {t("cancel")}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const o = options.find((x) => x.key === week);
            onSend(o ? { cardId: o.cardId, index: o.index } : null);
          }}
        >
          {t("send")}
        </button>
      </div>
    </div>
  );
}

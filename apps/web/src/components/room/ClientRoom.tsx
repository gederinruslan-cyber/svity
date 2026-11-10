"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ClientRoomView, RoomLobby } from "@svity/contracts";
import { api, ApiError } from "@/lib/api";
import { RitualCard } from "../ritual/RitualCard";
import { Breathing } from "../app/Breathing";
import { useLive, usePause } from "./useLive";
import { SummaryCards } from "./SummaryCards";

/** The client's side of a session (spec §10): consent + PIN, then drawing on the phone. */
export function ClientRoom({ code }: { code: string }) {
  const t = useTranslations("app.room");
  const [lobby, setLobby] = useState<RoomLobby | null>(null);
  const [missing, setMissing] = useState(false);

  const loadLobby = useCallback(
    () =>
      api<RoomLobby>(`/v1/r/${encodeURIComponent(code)}`)
        .then(setLobby)
        .catch(() => setMissing(true)),
    [code],
  );
  useEffect(() => {
    loadLobby();
  }, [loadLobby]);

  if (missing) return <p className="room-msg glass">{t("notFound")}</p>;
  if (!lobby) return null;
  if (lobby.isClient) return <Session code={lobby.code} signedIn={lobby.signedIn} />;
  if (lobby.status !== "open") {
    const key = { ended: "statusEnded", expired: "statusExpired", locked: "statusLocked", joined: "statusJoined" } as const;
    return <p className="room-msg glass">{t(key[lobby.status])}</p>;
  }
  return <Lobby lobby={lobby} onJoined={loadLobby} />;
}

function Lobby({ lobby, onJoined }: { lobby: RoomLobby; onJoined: () => void }) {
  const t = useTranslations("app.room");
  const [pin, setPin] = useState("");
  const [agree, setAgree] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/v1/r/${lobby.code}/join`, { method: "POST", body: { agree: true, pin: lobby.pinRequired ? pin : undefined } });
      onJoined();
    } catch (err) {
      if (err instanceof ApiError && err.code === "wrong_pin" && Number(err.data.attemptsLeft) > 0) {
        setAttemptsLeft(Number(err.data.attemptsLeft));
        setPin("");
      } else onJoined(); // locked, taken or expired: the lobby shows why
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="room-lobby glass" onSubmit={join}>
      <p className="demo__label">{t("hello", { label: lobby.clientLabel })}</p>
      <h1 className="h2">{lobby.psychologistName ? t("invites", { name: lobby.psychologistName }) : t("invitesNoName")}</h1>
      <h2 className="h3">{t("what")}</h2>
      <ul className="room-lobby__points">
        <li>{t("w1")}</li>
        <li>{lobby.showReturns ? t("w2returns") : t("w2")}</li>
        <li>{t("w3")}</li>
        <li>
          <strong>{t("w4")}</strong>
        </li>
      </ul>
      <p className="app-hint">{lobby.signedIn ? t("signedIn") : t("guest")}</p>
      {lobby.pinRequired && (
        <label className="room-lobby__pin">
          <span className="field-label">{t("pin")}</span>
          <input
            className="field"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            required
          />
        </label>
      )}
      <label className="shadow-page__check">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>{t("agree")}</span>
      </label>
      {attemptsLeft !== null && (
        <p className="form-error" role="alert">
          {t("wrongPin", { n: attemptsLeft })}
        </p>
      )}
      <button type="submit" className="btn btn--block" disabled={!agree || busy || (lobby.pinRequired && pin.length !== 4)}>
        {t("enter")}
      </button>
    </form>
  );
}

function Session({ code, signedIn }: { code: string; signedIn: boolean }) {
  const t = useTranslations("app.room");
  const tt = useTranslations("app.today");
  const { view, connected, refresh } = useLive<ClientRoomView>(`/v1/r/${code}/live`, `/v1/r/${code}/view`);
  const paused = usePause(view?.pauseAt ?? null);
  const [busy, setBusy] = useState(false);
  const lastTap = useRef(0);

  async function act(path: string, body: unknown = {}) {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/v1/r/${code}/${path}`, { method: "POST", body });
      if (!connected) await refresh();
    } catch {
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  if (!view) return null;
  const name = view.psychologistName;
  const total = view.positions.length;

  if (view.ended) {
    return (
      <section className="room-client">
        <h1 className="h2">{t("endedTitle")}</h1>
        {view.summary ? (
          <>
            <SummaryCards summary={view.summary} />
            <p className="app-hint">{signedIn ? t("toDiary") : t("guestEnd")}</p>
          </>
        ) : (
          <p className="app-muted">{t("statusEnded")}</p>
        )}
      </section>
    );
  }

  const lastConfirmed = [...view.confirmed].reverse().find(Boolean) ?? null;
  const onCardTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) act("confirm", { method: "double_tap" });
    lastTap.current = now;
  };

  return (
    <section className="room-client">
      {paused && (
        <div className="room-pause" role="dialog" aria-modal="true" aria-label={t("pause")}>
          <div className="room-pause__inner glass">
            <p className="h3">{t("pause")}</p>
            <p className="app-muted">{t("pauseSub")}</p>
            <Breathing key={view.pauseAt} autoStart />
          </div>
        </div>
      )}

      <div className="room-client__top">
        {view.current !== null ? (
          <p className="demo__label">{t("position", { n: view.current + 1, total, label: t(`positions.${view.positions[view.current]}`) })}</p>
        ) : (
          <p className="demo__label">{t("complete")}</p>
        )}
        {!view.psychologistOnline && <p className="app-hint">{t("waitingPsych")}</p>}
        {view.videoUrl && (
          <a className="room-client__video" href={view.videoUrl} target="_blank" rel="noopener noreferrer">
            {t("video")} ↗
          </a>
        )}
      </div>

      <ol className="room-slots" aria-label={t("cards")}>
        {view.positions.map((p, i) => {
          const c = view.confirmed[i];
          return (
            <li key={p} className={`room-slot ${i === view.current ? "is-current" : ""}`}>
              <span className="room-slot__card">{c && <Image src={c.imageUrl} alt={tt("cardAlt", { n: c.id })} fill sizes="64px" unoptimized />}</span>
              <span className="room-slot__label">{t(`positions.${p}`)}</span>
            </li>
          );
        })}
      </ol>

      {view.held ? (
        <div className="room-client__held">
          <div className="room-client__card">
            <RitualCard stage="flipped" front={{ src: view.held.imageUrl, alt: tt("cardAlt", { n: view.held.id }) }} deckLabel={tt("deckLabel")} stacked={false} unoptimized />
            <span className="room-client__tap" onPointerUp={onCardTap} aria-hidden="true" />
          </div>
          <div className="room-client__actions">
            <button type="button" className="btn btn--ghost" onClick={() => act("return")} disabled={busy}>
              {t("returnCard")}
            </button>
            <button type="button" className="btn" onClick={() => act("confirm", { method: "button" })} disabled={busy}>
              {t("discuss")}
            </button>
          </div>
          <p className="app-hint">{t("doubleTap")}</p>
        </div>
      ) : view.current !== null ? (
        view.choiceMode === "down" ? (
          <div className="room-client__deck">
            <RitualCard stage="deck" front={null} onDraw={() => act("draw")} deckLabel={t("tapDeck")} />
            <p className="demo__hint">{t("tapDeck")}</p>
          </div>
        ) : (
          <div>
            <p className="demo__hint">{t("chooseCard")}</p>
            <ul className="room-choices">
              {view.choices.map((c) => (
                <li key={c.id}>
                  <button type="button" className="room-choice" onClick={() => act("draw", { cardId: c.id })} disabled={busy} aria-label={tt("cardAlt", { n: c.id })}>
                    <Image src={c.imageUrl} alt="" fill sizes="(max-width: 600px) 30vw, 120px" unoptimized draggable={false} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}

      {!view.held && lastConfirmed && <p className="room-client__seen">{name ? t("seen", { name }) : t("seenNoName")}</p>}
    </section>
  );
}

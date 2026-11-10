"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Me, RoomCreateInput, RoomCreated, RoomListItem } from "@svity/contracts";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError, getMe } from "@/lib/api";

/** The psychologist's cabinet (spec §10): rooms and a new room with the spec's defaults. */
export function Cabinet() {
  const t = useTranslations("app.cabinet");
  const tt = useTranslations("app.today");
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [rooms, setRooms] = useState<RoomListItem[] | null>(null);
  const [created, setCreated] = useState<RoomCreated | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(
    () =>
      Promise.all([getMe(), api<RoomListItem[]>("/v1/rooms")])
        .then(([m, r]) => {
          setMe(m);
          setRooms(r);
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) router.replace("/signin");
          else if (err instanceof ApiError && err.status === 403) router.replace("/today");
          else setError(true);
        }),
    [router],
  );
  useEffect(() => {
    load();
  }, [load]);

  if (!me || !rooms) return <p className="app-loading">{error ? tt("error") : tt("loading")}</p>;

  return (
    <section className="cabinet container">
      <h1 className="h2">{t("title")}</h1>
      <div className="cabinet__grid">
        <div>
          {!me.displayName && <DisplayName onSaved={load} />}
          {created ? <Created room={created} onClose={() => setCreated(null)} /> : <NewRoom onCreated={(r) => (setCreated(r), load())} />}
        </div>
        <div>
          <h2 className="h3">{t("rooms")}</h2>
          {rooms.length === 0 ? (
            <p className="app-muted">{t("empty")}</p>
          ) : (
            <ul className="cabinet__rooms">
              {rooms.map((r) => (
                <li key={r.id}>
                  <Link href={`/cabinet/${r.id}`} className={`cabinet__room glass is-${r.status}`}>
                    <span className="cabinet__room-name">{r.clientLabel}</span>
                    <span className="cabinet__room-meta">
                      {formatCode(r.code)} · {r.spread === 1 ? t("spread1") : t("cards3")} · {t(`status.${r.status}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export const formatCode = (code: string) => `${code.slice(0, 3)}-${code.slice(3)}`;
export const roomLink = (code: string) => `${window.location.origin}/r/${formatCode(code)}`;

function DisplayName({ onSaved }: { onSaved: () => void }) {
  const t = useTranslations("app.cabinet");
  const [name, setName] = useState("");
  return (
    <form
      className="cabinet__panel glass"
      onSubmit={async (e) => {
        e.preventDefault();
        await api("/v1/me", { method: "PATCH", body: { displayName: name } });
        onSaved();
      }}
    >
      <h2 className="h3">{t("nameTitle")}</h2>
      <p className="app-hint">{t("nameHint", { example: name || "…" })}</p>
      <div className="cabinet__inline">
        <input className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} required />
        <button type="submit" className="btn">
          {t("save")}
        </button>
      </div>
    </form>
  );
}

function NewRoom({ onCreated }: { onCreated: (r: RoomCreated) => void }) {
  const t = useTranslations("app.cabinet");
  const tt = useTranslations("app.today");
  const locale = useLocale() as "uk" | "en";
  const [f, setF] = useState<RoomCreateInput>({
    clientLabel: "",
    spread: 3,
    choiceMode: "down",
    includeShadow: false,
    questionLanguage: locale,
    expiryHours: 24,
    pin: true,
    showReturns: true,
    videoUrl: "",
  });
  const [error, setError] = useState(false);
  const set = <K extends keyof RoomCreateInput>(k: K, v: RoomCreateInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const seg = <T extends string | number | boolean>(value: T, options: [T, string][], onPick: (v: T) => void) => (
    <div className="segmented">
      {options.map(([v, label]) => (
        <button key={String(v)} type="button" aria-pressed={value === v} className={value === v ? "is-on" : ""} onClick={() => onPick(v)}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <form
      className="cabinet__panel glass"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          onCreated(await api<RoomCreated>("/v1/rooms", { method: "POST", body: f }));
        } catch {
          setError(true);
        }
      }}
    >
      <h2 className="h3">{t("newRoom")}</h2>
      <label className="profile__field">
        <span className="field-label">{t("client")}</span>
        <input className="field" value={f.clientLabel} maxLength={60} onChange={(e) => set("clientLabel", e.target.value)} required />
        <span className="app-hint">{t("clientHint")}</span>
      </label>
      <fieldset className="profile__field">
        <legend className="field-label">{t("spread")}</legend>
        {seg<1 | 3>(f.spread, [[3, t("spread3")], [1, t("spread1")]], (v) => set("spread", v))}
      </fieldset>
      <fieldset className="profile__field">
        <legend className="field-label">{t("choice")}</legend>
        {seg(f.choiceMode, [["down", t("down")], ["up", t("up")]], (v) => set("choiceMode", v))}
      </fieldset>
      <fieldset className="profile__field">
        <legend className="field-label">{t("shadow")}</legend>
        {seg(f.includeShadow, [[false, t("off")], [true, t("on")]], (v) => set("includeShadow", v))}
      </fieldset>
      <fieldset className="profile__field">
        <legend className="field-label">{t("language")}</legend>
        {seg(f.questionLanguage, [["uk", "Українська"], ["en", "English"]], (v) => set("questionLanguage", v))}
      </fieldset>
      <fieldset className="profile__field">
        <legend className="field-label">{t("expiry")}</legend>
        {seg<24 | 72>(f.expiryHours, [[24, t("h24")], [72, t("h72")]], (v) => set("expiryHours", v))}
      </fieldset>
      <fieldset className="profile__field">
        <legend className="field-label">{t("pinOn")}</legend>
        {seg(f.pin, [[true, t("on")], [false, t("off")]], (v) => set("pin", v))}
      </fieldset>
      <fieldset className="profile__field">
        <legend className="field-label">{t("returnsOn")}</legend>
        {seg(f.showReturns, [[true, t("on")], [false, t("off")]], (v) => set("showReturns", v))}
        <span className="app-hint">{t("returnsHint")}</span>
      </fieldset>
      <label className="profile__field">
        <span className="field-label">{t("videoUrl")}</span>
        <input className="field" type="url" pattern="https://.*" value={f.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://meet.google.com/…" />
      </label>
      {error && <p className="form-error">{tt("error")}</p>}
      <button type="submit" className="btn btn--block cabinet__create">
        {t("create")}
      </button>
    </form>
  );
}

function Created({ room, onClose }: { room: RoomCreated; onClose: () => void }) {
  const t = useTranslations("app.cabinet");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const link = roomLink(room.code);
  const expires = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(room.expiresAt));
  return (
    <div className="cabinet__panel glass cabinet__created">
      <h2 className="h3">{t("createdTitle")}</h2>
      <p className="field-label">{t("link")}</p>
      <div className="cabinet__inline">
        <input className="field" readOnly value={link} onFocus={(e) => e.target.select()} aria-label={t("link")} />
        <button
          type="button"
          className="btn btn--ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(room.pin ? `${link}\nPIN: ${room.pin}` : link).catch(() => {});
            setCopied(true);
          }}
        >
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
      {room.pin && (
        <>
          <p className="field-label">{t("pinLabel")}</p>
          <p className="cabinet__pin">{room.pin}</p>
        </>
      )}
      <p className="app-hint">{t("expires", { date: expires })}</p>
      {room.pin && <p className="app-hint">{t("pinOnce")}</p>}
      <div className="demo__actions">
        <button type="button" className="link-btn" onClick={onClose}>
          {t("newRoom")}
        </button>
        <Link href={`/cabinet/${room.id}`} className="btn">
          {t("openSession")}
        </Link>
      </div>
    </div>
  );
}

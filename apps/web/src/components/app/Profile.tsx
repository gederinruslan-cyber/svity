"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PASSWORD_MIN, addressForms, roomsOpen, reminderTimes, type Me, type ProfilePatch, type ProfileStats } from "@svity/contracts";
import { Link, useRouter } from "@/i18n/navigation";
import { api, API_URL, ApiError } from "@/lib/api";
import { rememberSession } from "@/lib/session";
import { Sky } from "../Sky";
import { Star4 } from "../icons";

type ThemePref = "day" | "evening";
const CONTACT = "hello@svity.app";

/** Profile (spec §7): settings, feelings, shadow-card progress, data, sign out. */
export function Profile() {
  const t = useTranslations("app.profile");
  const tf = useTranslations("feelings");
  const tw = useTranslations("footer");
  const tt = useTranslations("app.today");
  const ts = useTranslations("app.shadow");
  const locale = useLocale();
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [theme, setTheme] = useState<ThemePref>("evening");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([api<{ me: Me }>("/v1/me"), api<ProfileStats>("/v1/me/stats")])
      .then(([m, s]) => {
        setMe(m.me);
        setStats(s);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/signin");
        else setError(true);
      });
    setTheme(document.documentElement.dataset.themePref === "day" ? "day" : "evening");
  }, [router]);

  const zones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [];
    }
  }, []);

  async function update(patch: ProfilePatch) {
    try {
      const r = await api<{ me: Me }>("/v1/me", { method: "PATCH", body: patch });
      setMe(r.me);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      // The page language is the URL; follow the new account language.
      if (patch.locale && patch.locale !== locale) window.location.assign(`/${patch.locale}/profile`);
    } catch {
      setError(true);
    }
  }

  function applyTheme(next: ThemePref) {
    setTheme(next);
    const d = document.documentElement;
    d.dataset.themePref = next;
    d.dataset.theme = next;
    try {
      localStorage.setItem("svity-theme", next);
    } catch {}
  }

  async function signOut() {
    await api("/v1/auth/logout", { method: "POST" }).catch(() => {});
    rememberSession(null);
    router.replace("/signin");
  }

  async function deleteAccount() {
    try {
      await api("/v1/me", { method: "DELETE", body: { confirm: "delete" } });
      rememberSession(null);
      window.location.assign(`/${locale}`);
    } catch {
      setError(true);
    }
  }

  if (!me) return <p className="app-loading">{error ? tt("error") : tt("loading")}</p>;

  const topics = [tw("topicIdea"), tw("topicCard"), tw("topicBug"), tw("topicThanks")];
  const since = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(me.createdAt));
  const initial = (me.displayName ?? "").trim().charAt(0).toUpperCase();

  return (
    <section className="profile">
      <Sky />
      <header className="profile__head">
        <h1 className="h2">{t("title")}</h1>
        <p className="profile__saved-pill" role="status" data-on={saved || undefined}>
          {saved && t("saved")}
        </p>
      </header>

      <div className="profile__layout">
        <aside className="profile__side">
          <div className="profile-card glass">
            <span className="profile-card__avatar" aria-hidden="true">
              {initial || <Star4 size={22} />}
            </span>
            <p className="profile-card__name">{me.displayName ?? t("noName")}</p>
            <p className="profile-card__email">{me.email}</p>
            <p className="profile-card__since">{t("since", { date: since })}</p>

            {stats && stats.entries > 0 ? (
              <>
                <dl className="diary-stats profile-card__stats">
                  <div>
                    <dt>{t("statEntries")}</dt>
                    <dd>{stats.entries}</dd>
                  </div>
                  <div>
                    <dt>{t("statLighter")}</dt>
                    <dd>{Math.round((100 * stats.lighter) / stats.entries)}%</dd>
                  </div>
                </dl>
                <p className="field-label">{t("topAfter")}</p>
                <ol className="profile__top">
                  {stats.topAfter.map((x) => (
                    <li key={x.feeling} className={`chip chip--sm chip--${x.feeling}`}>
                      {tf(x.feeling)} · {x.count}
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="app-muted profile-card__empty">{t("noStats")}</p>
            )}
          </div>

          {stats && (
            <div className="profile__block glass" id="shadow">
              <h2 className="h3">{t("shadow")}</h2>
              <Progress label={t("shadowDays")} value={stats.shadow.days} max={stats.shadow.daysNeeded} />
              <Progress label={t("shadowEntries")} value={stats.shadow.entries} max={stats.shadow.entriesNeeded} />
              {stats.shadow.softStop ? (
                <p className="app-muted">{ts("soft")}</p>
              ) : !stats.shadow.eligible ? (
                <p className="app-muted">{t("shadowLocked")}</p>
              ) : (
                <>
                  <p className="app-muted">{stats.shadow.mode ? ts(stats.shadow.mode) : stats.shadow.consented ? ts("off") : ts("sub")}</p>
                  <Link href="/shadow" className="btn btn--ghost">
                    {stats.shadow.mode ? ts("drawTitle") : stats.shadow.consented ? ts("manage") : ts("open")}
                  </Link>
                </>
              )}
            </div>
          )}
        </aside>

        <div className="profile__main">
          <div className="profile__block glass">
            <h2 className="h3">{t("groupYou")}</h2>
            <NameField value={me.displayName ?? ""} onSave={(displayName) => update({ displayName })} />
            <fieldset className="profile__field">
              <legend className="field-label">{t("address")}</legend>
              <div className="segmented">
                {addressForms.map((f) => (
                  <button key={f} type="button" aria-pressed={me.addressForm === f} className={me.addressForm === f ? "is-on" : ""} onClick={() => update({ addressForm: f })}>
                    {t(f)}
                  </button>
                ))}
              </div>
              <p className="app-hint">{t("addressHint")}</p>
            </fieldset>
          </div>

          <div className="profile__block glass">
            <h2 className="h3">{t("groupTime")}</h2>
            <fieldset className="profile__field">
              <legend className="field-label">{t("language")}</legend>
              <div className="segmented">
                {(["uk", "en"] as const).map((l) => (
                  <button key={l} type="button" aria-pressed={me.locale === l} className={me.locale === l ? "is-on" : ""} onClick={() => update({ locale: l })} lang={l}>
                    {l === "uk" ? "Українська" : "English"}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="profile__field">
              <label className="field-label" htmlFor="profile-tz">
                {t("timezone")}
              </label>
              <select id="profile-tz" className="field" value={me.timezone} onChange={(e) => update({ timezone: e.target.value })}>
                {(zones.includes(me.timezone) ? zones : [me.timezone, ...zones]).map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <p className="app-hint">{t("timezoneHint")}</p>
            </div>

            <fieldset className="profile__field">
              <legend className="field-label">{t("reminder")}</legend>
              <div className="segmented">
                {reminderTimes.map((r) => (
                  <button key={r} type="button" aria-pressed={me.reminderTime === r} className={me.reminderTime === r ? "is-on" : ""} onClick={() => update({ reminderTime: r })}>
                    {r}
                  </button>
                ))}
                <button type="button" aria-pressed={me.reminderTime === null} className={me.reminderTime === null ? "is-on" : ""} onClick={() => update({ reminderTime: null })}>
                  {t("reminderOff")}
                </button>
              </div>
              <p className="app-hint">{t("reminderHint")}</p>
            </fieldset>
          </div>

          <div className="profile__block glass">
            <h2 className="h3">{t("groupLook")}</h2>
            <fieldset className="profile__field profile__field--first">
              <legend className="field-label">{t("theme")}</legend>
              <div className="segmented">
                {(["day", "evening"] as const).map((p) => (
                  <button key={p} type="button" aria-pressed={theme === p} className={theme === p ? "is-on" : ""} onClick={() => applyTheme(p)}>
                    {t(p === "day" ? "themeDay" : "themeEvening")}
                  </button>
                ))}
              </div>
            </fieldset>

            {roomsOpen && (
              <fieldset className="profile__field">
                <legend className="field-label">{t("work")}</legend>
                <div className="segmented">
                  {(["personal", "professional"] as const).map((r) => (
                    <button key={r} type="button" aria-pressed={me.role === r} className={me.role === r ? "is-on" : ""} onClick={() => update({ role: r })}>
                      {t(r === "personal" ? "workPersonal" : "workProfessional")}
                    </button>
                  ))}
                </div>
                <p className="app-hint">{t("workHint")}</p>
              </fieldset>
            )}
          </div>

          <ChangePassword />

          <div className="profile__block glass">
            <h2 className="h3">{t("write")}</h2>
            <p className="app-muted profile__write-sub">{t("writeSub")}</p>
            <ul className="profile__topics">
              {topics.map((topic) => (
                <li key={topic}>
                  <a className="chip" href={`mailto:${CONTACT}?subject=${encodeURIComponent(`Svity: ${topic}`)}`}>
                    {topic}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="profile__block glass">
            <h2 className="h3">{t("data")}</h2>
            <p className="app-muted">{t("dataSub")}</p>
            <div className="profile__actions">
              <a className="btn btn--ghost" href={`${API_URL}/v1/me/export`} download>
                {t("export")}
              </a>
              <button type="button" className="btn btn--ghost" onClick={signOut}>
                {t("signOut")}
              </button>
            </div>
            {confirmDelete ? (
              <div className="today__close" role="alert">
                <p className="demo__muted">{t("deleteConfirm")}</p>
                <div className="demo__actions">
                  <button type="button" className="link-btn" onClick={() => setConfirmDelete(false)}>
                    {t("deleteNo")}
                  </button>
                  <button type="button" className="btn btn--danger" onClick={deleteAccount}>
                    {t("deleteYes")}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="link-btn profile__delete" onClick={() => setConfirmDelete(true)}>
                {t("delete")}
              </button>
            )}
          </div>
          {error && <p className="form-error">{tt("error")}</p>}
        </div>
      </div>
    </section>
  );
}

/** The name for greetings; saved on blur or Enter. */
function NameField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const t = useTranslations("app.profile");
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const save = () => {
    const next = v.trim();
    if (next && next !== value) onSave(next);
    else setV(value);
  };
  return (
    <div className="profile__field profile__field--first">
      <label className="field-label" htmlFor="profile-name">
        {t("name")}
      </label>
      <input
        id="profile-name"
        className="field"
        maxLength={60}
        autoComplete="given-name"
        value={v}
        placeholder={t("namePlaceholder")}
        onChange={(e) => setV(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      />
      <p className="app-hint">{t("nameHint")}</p>
    </div>
  );
}

function Progress({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="progress">
      <div className="progress__row">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <span className="progress__bar" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <span style={{ width: `${(100 * value) / max}%` }} />
      </span>
    </div>
  );
}

function ChangePassword() {
  const t = useTranslations("app.password");
  const ts = useTranslations("app.signup");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "wrong" | "error">("idle");
  return (
    <form
      className="profile__block glass"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        try {
          await api("/v1/auth/password", { method: "POST", body: { current, password: next } });
          setCurrent("");
          setNext("");
          setState("done");
        } catch (err) {
          setState(err instanceof ApiError && err.code === "invalid_credentials" ? "wrong" : "error");
        }
      }}
    >
      <h2 className="h3">{t("title")}</h2>
      <label className="profile__field profile__field--first">
        <span className="field-label">{t("current")}</span>
        <input className="field" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="profile__field">
        <span className="field-label">{t("new")}</span>
        <input className="field" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN} maxLength={200} value={next} onChange={(e) => setNext(e.target.value)} />
        <span className="app-hint">{ts("passwordHint", { n: PASSWORD_MIN })}</span>
      </label>
      <button type="submit" className="btn btn--ghost profile__submit" disabled={state === "busy" || next.length < PASSWORD_MIN}>
        {t("submit")}
      </button>
      {state === "done" && <p className="app-hint" role="status">{t("done")}</p>}
      {state === "wrong" && <p className="form-error" role="alert">{t("wrong")}</p>}
      {state === "error" && <p className="form-error" role="alert">{t("none")}</p>}
    </form>
  );
}

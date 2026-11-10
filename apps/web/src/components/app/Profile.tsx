"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { addressForms, reminderTimes, type Me, type ProfilePatch, type ProfileStats } from "@svity/contracts";
import { useRouter } from "@/i18n/navigation";
import { api, API_URL, ApiError } from "@/lib/api";

type ThemePref = "auto" | "day" | "evening";
const CONTACT = "hello@svity.app";

/** Profile (spec §7): settings, feelings, shadow-card progress, data, sign out. */
export function Profile() {
  const t = useTranslations("app.profile");
  const tf = useTranslations("feelings");
  const tw = useTranslations("footer");
  const tt = useTranslations("app.today");
  const locale = useLocale();
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [theme, setTheme] = useState<ThemePref>("auto");
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
    setTheme((document.documentElement.dataset.themePref as ThemePref) ?? "auto");
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
    const h = new Date().getHours();
    d.dataset.theme = next === "auto" ? (h >= 18 || h < 6 ? "evening" : "day") : next;
    try {
      localStorage.setItem("svity-theme", next);
    } catch {}
  }

  async function signOut() {
    await api("/v1/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/signin");
  }

  async function deleteAccount() {
    try {
      await api("/v1/me", { method: "DELETE", body: { confirm: "delete" } });
      window.location.assign(`/${locale}`);
    } catch {
      setError(true);
    }
  }

  if (!me) return <p className="app-loading">{error ? tt("error") : tt("loading")}</p>;

  const topics = [tw("topicIdea"), tw("topicCard"), tw("topicBug"), tw("topicThanks")];

  return (
    <section className="profile container container--narrow">
      <h1 className="h2">{t("title")}</h1>
      <p className="app-muted">{t("email", { email: me.email })}</p>

      <div className="profile__block glass">
        <h2 className="h3">{t("feelings")}</h2>
        {stats && stats.entries > 0 ? (
          <>
            <p>{t("lighter", { lighter: stats.lighter, total: stats.entries })}</p>
            <p className="field-label">{t("topAfter")}</p>
            <ol className="profile__top">
              {stats.topAfter.map((x) => (
                <li key={x.feeling} className={`chip chip--${x.feeling}`}>
                  {tf(x.feeling)} · {x.count}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="app-muted">{t("noStats")}</p>
        )}
      </div>

      {stats && (
        <div className="profile__block glass" id="shadow">
          <h2 className="h3">{t("shadow")}</h2>
          <Progress label={t("shadowDays")} value={stats.shadow.days} max={stats.shadow.daysNeeded} />
          <Progress label={t("shadowEntries")} value={stats.shadow.entries} max={stats.shadow.entriesNeeded} />
          {!stats.shadow.eligible && <p className="app-muted">{t("shadowLocked")}</p>}
        </div>
      )}

      <div className="profile__block glass">
        <h2 className="h3">
          {t("settings")} {saved && <span className="profile__saved" role="status">· {t("saved")}</span>}
        </h2>

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

        <fieldset className="profile__field">
          <legend className="field-label">{t("theme")}</legend>
          <div className="segmented">
            {(["auto", "day", "evening"] as const).map((p) => (
              <button key={p} type="button" aria-pressed={theme === p} className={theme === p ? "is-on" : ""} onClick={() => applyTheme(p)}>
                {t(p === "auto" ? "themeAuto" : p === "day" ? "themeDay" : "themeEvening")}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="profile__block glass">
        <h2 className="h3">{t("write")}</h2>
        <ul className="profile__links">
          {topics.map((topic) => (
            <li key={topic}>
              <a href={`mailto:${CONTACT}?subject=${encodeURIComponent(`Svity: ${topic}`)}`}>{topic}</a>
            </li>
          ))}
        </ul>
      </div>

      <div className="profile__block glass">
        <h2 className="h3">{t("data")}</h2>
        <a className="btn btn--ghost" href={`${API_URL}/v1/me/export`} download>
          {t("export")}
        </a>
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

      <button type="button" className="btn btn--ghost profile__signout" onClick={signOut}>
        {t("signOut")}
      </button>
      {error && <p className="form-error">{tt("error")}</p>}
    </section>
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

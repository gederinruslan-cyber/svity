"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PASSWORD_MIN, roomsOpen, type Me } from "@svity/contracts";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError, getMe } from "@/lib/api";
import { rememberSession } from "@/lib/session";
import { LangMenu } from "../LangMenu";
import { Sky } from "../Sky";
import { Calendar, Cards, Leaf, Lock, Star4 } from "../icons";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Every auth page: a slim bar (logo, language), the deck and what Svity is on the left, the form
 * on the right. On phones the fan shrinks above the form and the points are hidden.
 */
function Card({ children, tab }: { children: React.ReactNode; tab?: "signin" | "signup" }) {
  const t = useTranslations("app.auth");
  const th = useTranslations("hero");
  return (
    <div className="auth">
      <Sky />
      <header className="auth__bar">
        <Link href="/" className="logo" aria-label={t("home")}>
          SVITY
          <Star4 size={10} className="logo__star" />
        </Link>
        <LangMenu />
      </header>
      <main className="auth__main">
        <aside className="auth__show">
          <div className="auth__fan" aria-hidden="true">
            <span className="auth__fan-card auth__fan-card--l">
              <Image src="/cards/gallery-3.webp" alt="" fill sizes="(min-width: 900px) 180px, 90px" />
            </span>
            <span className="auth__fan-card auth__fan-card--r">
              <Image src="/cards/gallery-5.webp" alt="" fill sizes="(min-width: 900px) 180px, 90px" />
            </span>
            <span className="auth__fan-card auth__fan-card--c">
              <Image src="/cards/back.webp" alt="" fill sizes="(min-width: 900px) 200px, 100px" priority />
            </span>
          </div>
          <p className="eyebrow">{th("eyebrow")}</p>
          <p className="auth__title">{th("title")}</p>
          <ul className="auth__points">
            <li>
              <Cards size={20} />
              <span>{t("p1")}</span>
            </li>
            <li>
              <Calendar size={20} />
              <span>{t("p2")}</span>
            </li>
            <li>
              <Leaf size={20} />
              <span>{t("p3")}</span>
            </li>
          </ul>
        </aside>
        <section className="auth__panel glass">
          {tab && (
            <nav className="auth__tabs" aria-label={t("tabs")}>
              <Link href="/signin" className={tab === "signin" ? "is-on" : ""} aria-current={tab === "signin" ? "page" : undefined}>
                {t("tabSignin")}
              </Link>
              <Link href="/signup" className={tab === "signup" ? "is-on" : ""} aria-current={tab === "signup" ? "page" : undefined}>
                {t("tabSignup")}
              </Link>
            </nav>
          )}
          {children}
          <p className="auth__private">
            <Lock size={16} />
            <span>{t("private")}</span>
          </p>
        </section>
      </main>
    </div>
  );
}

/** Length is the only rule (contracts): show how far to the minimum, then how good it is. */
function PasswordMeter({ length }: { length: number }) {
  const t = useTranslations("app.auth");
  const level = length === 0 ? 0 : length < PASSWORD_MIN ? 1 : length < 16 ? 2 : 3;
  const msg = length === 0 ? t("pwHint", { n: PASSWORD_MIN }) : level === 1 ? t("pwMore", { n: PASSWORD_MIN - length }) : level === 2 ? t("pwOk") : t("pwGreat");
  return (
    <div className="pw-meter" data-level={level}>
      <span className="pw-meter__bar" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <p className="app-hint" id="auth-password-hint" aria-live="polite">
        {msg}
      </p>
    </div>
  );
}

function EmailField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("app.signin");
  return (
    <>
      <label className="field-label" htmlFor="auth-email">
        {t("email")}
      </label>
      <input
        id="auth-email"
        className="field"
        type="email"
        required
        autoComplete="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="you@example.com"
      />
    </>
  );
}

/** Password with show/hide; `isNew` tells password managers to suggest one. */
function PasswordField({ label, value, onChange, isNew, id = "auth-password", hint, describedBy }: { label: string; value: string; onChange: (v: string) => void; isNew?: boolean; id?: string; hint?: string; describedBy?: string }) {
  const t = useTranslations("app.signin");
  const [shown, setShown] = useState(false);
  return (
    <>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="password-field">
        <input
          id={id}
          className="field"
          type={shown ? "text" : "password"}
          required
          minLength={isNew ? PASSWORD_MIN : undefined}
          maxLength={200}
          autoComplete={isNew ? "new-password" : "current-password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy ?? (hint ? `${id}-hint` : undefined)}
        />
        <button type="button" className="password-field__toggle" onClick={() => setShown((x) => !x)} aria-pressed={shown}>
          {shown ? t("hide") : t("show")}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="app-hint">
          {hint}
        </p>
      )}
    </>
  );
}

const errorKey = (err: unknown) => (err instanceof ApiError ? (err.status === 429 ? "rateLimited" : err.code) : "error");

export function SignIn() {
  const t = useTranslations("app.signin");
  const ta = useTranslations("app.auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      rememberSession((await api<{ me: Me }>("/v1/auth/signin", { method: "POST", body: { email, password } })).me);
      router.replace("/today");
    } catch (err) {
      const k = errorKey(err);
      setError(k === "invalid_credentials" ? "invalid" : k === "rateLimited" ? k : "error");
      setBusy(false);
    }
  }

  return (
    <Card tab="signin">
      <form onSubmit={submit}>
        <h1 className="h3">{ta("welcome")}</h1>
        <p className="app-muted">{ta("welcomeSub")}</p>
        <EmailField value={email} onChange={setEmail} />
        <PasswordField label={t("password")} value={password} onChange={setPassword} />
        <Link href="/forgot-password" className="link-btn app-auth__forgot">
          {t("forgot")}
        </Link>
        <button type="submit" className="btn btn--block" disabled={busy}>
          {busy ? t("sending") : t("submit")}
        </button>
        {error && (
          <p className="form-error" role="alert">
            {t(error as "invalid" | "rateLimited" | "error")}
          </p>
        )}
      </form>
      <p className="app-hint auth__remember">{ta("remember")}</p>
    </Card>
  );
}

export function SignUp({ initialRole = "personal" }: { initialRole?: Me["role"] }) {
  const t = useTranslations("app.signup");
  const ts = useTranslations("app.signin");
  const ta = useTranslations("app.auth");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Me["role"]>(roomsOpen ? initialRole : "personal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      rememberSession((await api<{ me: Me }>("/v1/auth/signup", { method: "POST", body: { email, password, timezone, locale, role } })).me);
      router.replace(role === "professional" ? "/cabinet" : "/today");
    } catch (err) {
      const k = errorKey(err);
      setError(k === "email_taken" ? "taken" : k === "rateLimited" ? k : "error");
      setBusy(false);
    }
  }

  return (
    <Card tab="signup">
      <form onSubmit={submit}>
        <h1 className="h3">{t("title")}</h1>
        <p className="app-muted">{t("sub")}</p>
        {roomsOpen && (
        <fieldset className="app-auth__role">
          <legend className="field-label">{t("roleLabel")}</legend>
          <div className="segmented">
            {(["personal", "professional"] as const).map((r) => (
              <button key={r} type="button" aria-pressed={role === r} className={role === r ? "is-on" : ""} onClick={() => setRole(r)}>
                {t(r === "personal" ? "rolePersonal" : "roleProfessional")}
              </button>
            ))}
          </div>
          <p className="app-hint">{t(role === "personal" ? "rolePersonalHint" : "roleProfessionalHint")}</p>
        </fieldset>
        )}
        <EmailField value={email} onChange={setEmail} />
        <PasswordField label={t("password")} value={password} onChange={setPassword} isNew describedBy="auth-password-hint" />
        <PasswordMeter length={password.length} />
        <button type="submit" className="btn btn--block" disabled={busy || password.length < PASSWORD_MIN}>
          {busy ? t("sending") : t("submit")}
        </button>
        {error === "taken" ? (
          <p className="form-error" role="alert">
            {t("taken")} <Link href="/forgot-password">{t("forgot")}</Link>
          </p>
        ) : (
          error && (
            <p className="form-error" role="alert">
              {ts(error as "rateLimited" | "error")}
            </p>
          )
        )}
      </form>
      <p className="app-hint auth__remember">{ta("emailOnly")}</p>
    </Card>
  );
}

export function ForgotPassword() {
  const t = useTranslations("app.forgot");
  const ts = useTranslations("app.signin");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "rateLimited">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      await api("/v1/auth/forgot", { method: "POST", body: { email, locale } });
      setState("sent");
    } catch (err) {
      setState(errorKey(err) === "rateLimited" ? "rateLimited" : "error");
    }
  }

  return (
    <Card>
      {state === "sent" ? (
        <div aria-live="polite">
          <h1 className="h3">{t("sentTitle")}</h1>
          <p className="app-muted">{t("sent", { email })}</p>
          {isDev && <p className="app-hint">{t("devHint")}</p>}
        </div>
      ) : (
        <form onSubmit={submit}>
          <h1 className="h3">{t("title")}</h1>
          <p className="app-muted">{t("sub")}</p>
          <EmailField value={email} onChange={setEmail} />
          <button type="submit" className="btn btn--block" disabled={state === "sending"}>
            {t("submit")}
          </button>
          {(state === "error" || state === "rateLimited") && (
            <p className="form-error" role="alert">
              {ts(state)}
            </p>
          )}
        </form>
      )}
      <p className="app-auth__switch">
        <Link href="/signin">{t("back")}</Link>
      </p>
    </Card>
  );
}

export function ResetPassword({ token }: { token: string }) {
  const t = useTranslations("app.reset");
  const tu = useTranslations("app.signup");
  const ts = useTranslations("app.signin");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"invalid" | "error" | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      rememberSession((await api<{ me: Me }>("/v1/auth/reset", { method: "POST", body: { token, password } })).me);
      router.replace("/today");
    } catch (err) {
      setError(errorKey(err) === "link_invalid" || errorKey(err) === "invalid" ? "invalid" : "error");
      setBusy(false);
    }
  }

  if (error === "invalid" || !token) {
    return (
      <Card>
        <p className="app-muted">{t("invalid")}</p>
        <Link href="/forgot-password" className="btn">
          {t("newLink")}
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <h1 className="h3">{t("title")}</h1>
        <PasswordField label={tu("password")} value={password} onChange={setPassword} isNew describedBy="auth-password-hint" />
        <PasswordMeter length={password.length} />
        <p className="app-hint">{t("note")}</p>
        <button type="submit" className="btn btn--block" disabled={busy || password.length < PASSWORD_MIN}>
          {t("submit")}
        </button>
        {error && (
          <p className="form-error" role="alert">
            {ts("error")}
          </p>
        )}
      </form>
    </Card>
  );
}

/** The header's single "Svity" button leads here: create an account or sign in. */
export function Start() {
  const t = useTranslations("app.start");
  const router = useRouter();
  // Already signed in: straight into the app.
  useEffect(() => {
    getMe()
      .then(() => router.replace("/today"))
      .catch(() => {});
  }, [router]);
  return (
    <Card>
      <h1 className="h3">{t("title")}</h1>
      <p className="app-muted">{t("sub")}</p>
      <div className="app-auth__choice">
        <Link href="/signup" className="btn btn--block">
          {t("create")}
        </Link>
        <Link href="/signin" className="btn btn--ghost btn--block">
          {t("signin")}
        </Link>
      </div>
    </Card>
  );
}

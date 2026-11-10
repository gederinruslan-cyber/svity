"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { Star4 } from "../icons";

const isDev = process.env.NODE_ENV !== "production";

export function SignIn() {
  const t = useTranslations("app.signin");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "limited">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      await api("/v1/auth/email", { method: "POST", body: { email, locale } });
      setState("sent");
    } catch (err) {
      setState(err instanceof ApiError && err.status === 429 ? "limited" : "error");
    }
  }

  return (
    <main className="app-auth">
      <div className="app-auth__card glass">
        <span className="app-auth__star" aria-hidden="true">
          <Star4 size={28} />
        </span>
        {state === "sent" ? (
          <div aria-live="polite">
            <h1 className="h3">{t("sentTitle")}</h1>
            <p className="app-muted">{t("sent", { email })}</p>
            {isDev && <p className="app-hint">{t("devHint")}</p>}
            <button type="button" className="link-btn" onClick={() => setState("idle")}>
              {t("again")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h1 className="h3">{t("title")}</h1>
            <p className="app-muted">{t("sub")}</p>
            <label className="field-label" htmlFor="signin-email">
              {t("email")}
            </label>
            <input
              id="signin-email"
              className="field"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <button type="submit" className="btn btn--block" disabled={state === "sending"}>
              {state === "sending" ? t("sending") : t("submit")}
            </button>
            {state === "error" && <p className="form-error">{t("error")}</p>}
            {state === "limited" && <p className="form-error">{t("rateLimited")}</p>}
          </form>
        )}
      </div>
    </main>
  );
}

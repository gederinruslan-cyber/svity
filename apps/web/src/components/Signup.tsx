"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { specializations, type SubmitResult } from "@svity/contracts";
import { Ornament, Star4 } from "./icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Tab = "user" | "pro";
type Status =
  "idle" | "sending" | "done" | "invalid" | "rate_limited" | "server";

async function submit(path: string, body: unknown): Promise<SubmitResult> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as SubmitResult;
  } catch {
    return { ok: false, error: "server" };
  }
}

export function Signup() {
  const t = useTranslations("form");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("user");
  const [status, setStatus] = useState<Status>("idle");

  // `#join-pro` links (psychologist CTAs) open the second tab.
  useEffect(() => {
    const sync = () => {
      if (location.hash === "#join-pro") setTab("pro");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim();
    setStatus("sending");
    const res =
      tab === "user"
        ? await submit("/v1/waitlist", {
            email: str("email"),
            locale,
            website: str("website"),
          })
        : await submit("/v1/beta-applications", {
            name: str("name"),
            email: str("email"),
            specialization: str("specialization"),
            country: str("country"),
            usesCards: f.get("usesCards") === "on",
            message: str("message") || undefined,
            locale,
            website: str("website"),
          });
    setStatus(res.ok ? "done" : res.error);
  }

  const errorText =
    status === "invalid"
      ? t("errorInvalid")
      : status === "rate_limited"
        ? t("errorRate")
        : status === "server"
          ? t("errorServer")
          : null;

  return (
    <section className="section signup" id="join" aria-labelledby="join-title">
      <span id="join-pro" className="anchor-alias" aria-hidden="true" />
      <div className="container container--narrow">
        <header className="section-head reveal">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 id="join-title" className="h2">
            {t("title")}
          </h2>
          <Ornament />
        </header>

        <div className="signup__card glass reveal">
          <div className="tabs" role="tablist">
            {(["user", "pro"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                className={`tab ${tab === k ? "is-active" : ""}`}
                onClick={() => {
                  setTab(k);
                  setStatus("idle");
                }}
              >
                {k === "user" ? t("tabUser") : t("tabPro")}
              </button>
            ))}
          </div>

          {status === "done" ? (
            <div className="signup__done" role="status">
              <span className="saved-star" aria-hidden="true">
                <Star4 size={36} />
              </span>
              <p className="h3">
                {tab === "user" ? t("successUser") : t("successPro")}
              </p>
            </div>
          ) : (
            <form className="form" onSubmit={onSubmit} noValidate={false}>
              {/* Honeypot: hidden from people, tempting for bots. */}
              <input
                type="text"
                name="website"
                className="hp"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              {tab === "pro" && (
                <label className="form__row">
                  <span>{t("name")}</span>
                  <input
                    className="field"
                    name="name"
                    required
                    maxLength={120}
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="form__row">
                <span>{t("email")}</span>
                <input
                  className="field"
                  type="email"
                  name="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder={t("emailPlaceholder")}
                />
              </label>

              {tab === "pro" && (
                <>
                  <div className="form__split">
                    <label className="form__row">
                      <span>{t("specialization")}</span>
                      <select
                        className="field"
                        name="specialization"
                        required
                        defaultValue="psychologist"
                      >
                        {specializations.map((s) => (
                          <option key={s} value={s}>
                            {t(`spec_${s}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form__row">
                      <span>{t("country")}</span>
                      <input
                        className="field"
                        name="country"
                        required
                        maxLength={80}
                        autoComplete="country-name"
                      />
                    </label>
                  </div>
                  <label className="check">
                    <input type="checkbox" name="usesCards" />
                    <span>{t("usesCards")}</span>
                  </label>
                  <label className="form__row">
                    <span>{t("message")}</span>
                    <textarea
                      className="field field--area"
                      name="message"
                      rows={3}
                      maxLength={2000}
                    />
                  </label>
                </>
              )}

              {errorText && (
                <p className="form__error" role="alert">
                  {errorText}
                </p>
              )}

              <button
                type="submit"
                className="btn btn--large btn--block"
                disabled={status === "sending"}
              >
                {status === "sending"
                  ? t("sending")
                  : tab === "user"
                    ? t("submitUser")
                    : t("submitPro")}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

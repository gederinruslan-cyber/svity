"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { rememberSession, useSession } from "@/lib/session";
import type { Me } from "@svity/contracts";
import { Ornament } from "./icons";

type Tab = "user" | "pro";

/** The landing's "Start" block: an account for yourself, or a psychologist account. */
export function Signup() {
  const t = useTranslations("form");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("user");
  const [busy, setBusy] = useState(false);
  const session = useSession();

  // `#join-pro` links (psychologist CTAs) open the second tab.
  useEffect(() => {
    const sync = () => {
      if (location.hash === "#join-pro") setTab("pro");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  async function turnOnCabinet() {
    setBusy(true);
    try {
      rememberSession((await api<{ me: Me }>("/v1/me", { method: "PATCH", body: { role: "professional" } })).me);
      router.push("/cabinet");
    } catch {
      setBusy(false);
    }
  }

  const pending = session.status === "unknown" ? "is-pending" : "";

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
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={`tab ${tab === k ? "is-active" : ""}`} onClick={() => setTab(k)}>
                {k === "user" ? t("tabUser") : t("tabPro")}
              </button>
            ))}
          </div>

          <div className={`signup__account ${pending}`}>
            {tab === "user" ? (
              session.status === "in" ? (
                <>
                  <p className="h3">{t("welcomeTitle")}</p>
                  <p className="signup__lead">{t("welcomeSub")}</p>
                  <div className="signup__actions">
                    <Link href="/today" className="btn btn--large">
                      {t("openToday")}
                    </Link>
                    <Link href="/diary" className="btn btn--ghost btn--large">
                      {t("openDiary")}
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="signup__lead">{t("userSub")}</p>
                  <Link href="/signup" className="btn btn--large btn--block">
                    {t("create")}
                  </Link>
                  <p className="signup__switch">
                    {t("haveAccount")} <Link href="/signin">{t("signin")}</Link>
                  </p>
                </>
              )
            ) : session.status === "in" && session.role === "professional" ? (
              <>
                <p className="signup__lead">{t("proIn")}</p>
                <Link href="/cabinet" className="btn btn--large btn--block">
                  {t("openCabinet")}
                </Link>
              </>
            ) : session.status === "in" ? (
              <>
                <p className="signup__lead">{t("proTurnOnSub")}</p>
                <button type="button" className="btn btn--large btn--block" disabled={busy} onClick={turnOnCabinet}>
                  {t("proTurnOn")}
                </button>
              </>
            ) : (
              <>
                <p className="signup__lead">{t("proSub")}</p>
                <Link href="/signup?role=professional" className="btn btn--large btn--block">
                  {t("proCreate")}
                </Link>
                <p className="signup__switch">
                  {t("haveAccount")} <Link href="/signin">{t("signin")}</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

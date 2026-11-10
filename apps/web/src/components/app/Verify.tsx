"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { Star4 } from "../icons";

/** Confirms the e-mail link with a POST (mail scanners that prefetch links don't run this). */
export function Verify({ token }: { token: string }) {
  const t = useTranslations("app.signin");
  const locale = useLocale();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return; // React dev mode runs effects twice; the link works once.
    sent.current = true;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    api("/v1/auth/verify", { method: "POST", body: { token, timezone, locale } })
      .then(() => router.replace("/today"))
      .catch(() => setFailed(true));
  }, [token, locale, router]);

  return (
    <main className="app-auth">
      <div className="app-auth__card glass" aria-live="polite">
        <span className="app-auth__star" aria-hidden="true">
          <Star4 size={28} />
        </span>
        {failed ? (
          <>
            <h1 className="h3">{t("linkInvalid")}</h1>
            <Link href="/signin" className="btn">
              {t("newLink")}
            </Link>
          </>
        ) : (
          <p className="h3">{t("verifying")}</p>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SessionSummaryView } from "@svity/contracts";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { SummaryCards } from "./SummaryCards";

/** A session summary in the client's diary. */
export function SessionSummaryPage({ id }: { id: string }) {
  const t = useTranslations("app.room");
  const td = useTranslations("app.diary");
  const tt = useTranslations("app.today");
  const locale = useLocale();
  const router = useRouter();
  const [summary, setSummary] = useState<SessionSummaryView | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api<SessionSummaryView>(`/v1/sessions/${id}`)
      .then(setSummary)
      .catch((err) => (err instanceof ApiError && err.status === 401 ? router.replace("/signin") : setMissing(true)));
  }, [id, router]);

  return (
    <section className="entry-page container container--narrow">
      <Link href="/diary" className="entry-page__back">
        ← {td("back")}
      </Link>
      {missing ? (
        <p className="app-muted">{td("notFound")}</p>
      ) : !summary ? (
        <p className="app-loading">{tt("loading")}</p>
      ) : (
        <>
          <p className="entry__meta">{new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(summary.sentAt))}</p>
          <h1 className="h2">{t("endedTitle")}</h1>
          <SummaryCards summary={summary} />
        </>
      )}
    </section>
  );
}

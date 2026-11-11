"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AdminApplication, ApplicationStatus } from "@svity/contracts";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";

/** The Svity team's page: approve psychologists for the beta. */
export function Admin() {
  const t = useTranslations("app.admin");
  const tt = useTranslations("app.today");
  const router = useRouter();
  const [apps, setApps] = useState<AdminApplication[] | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus>("pending");
  const [error, setError] = useState(false);

  const load = useCallback(
    () =>
      api<AdminApplication[]>("/v1/admin/applications")
        .then(setApps)
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

  if (!apps) return <p className="app-loading">{error ? tt("error") : tt("loading")}</p>;

  const count = (s: ApplicationStatus) => apps.filter((a) => a.status === s).length;
  const shown = apps.filter((a) => a.status === filter);

  return (
    <section className="admin container">
      <h1 className="h2">{t("title")}</h1>
      <div className="segmented admin__filter" role="tablist">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={filter === s} className={filter === s ? "is-on" : ""} onClick={() => setFilter(s)}>
            {t(`status.${s}`)} · {count(s)}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="app-muted">{t("empty")}</p>
      ) : (
        <ul className="admin__list">
          {shown.map((a) => (
            <Application key={a.id} app={a} onChanged={load} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Application({ app: a, onChanged }: { app: AdminApplication; onChanged: () => void }) {
  const t = useTranslations("app.admin");
  const tf = useTranslations("form");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));

  async function decide(status: ApplicationStatus) {
    setBusy(true);
    try {
      await api(`/v1/admin/applications/${a.id}`, { method: "POST", body: { status } });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="admin__app glass">
      <div className="admin__head">
        <p className="h3">{a.name}</p>
        <p className="app-hint">{date(a.createdAt)}</p>
      </div>
      <p className="admin__meta">
        <a href={`mailto:${a.email}`}>{a.email}</a> · {tf(`spec_${a.specialization}`)} · {a.country} · {a.locale.toUpperCase()}
      </p>
      <p className="admin__meta">
        {a.usesCards ? t("usesCards") : t("noCards")} · {a.account ? (a.account.role === "professional" ? t("accountPro") : t("accountPersonal")) : t("noAccount")}
      </p>
      {a.message && <p className="admin__message">{a.message}</p>}
      {a.decidedAt && <p className="app-hint">{t("decided", { date: date(a.decidedAt) })}</p>}
      <div className="admin__actions">
        {a.status !== "approved" && (
          <button type="button" className="btn" disabled={busy} onClick={() => decide("approved")}>
            {t("approve")}
          </button>
        )}
        {a.status === "pending" && (
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => decide("rejected")}>
            {t("reject")}
          </button>
        )}
        {a.status === "approved" && (
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => confirm(t("revokeConfirm")) && decide("rejected")}>
            {t("revoke")}
          </button>
        )}
      </div>
    </li>
  );
}

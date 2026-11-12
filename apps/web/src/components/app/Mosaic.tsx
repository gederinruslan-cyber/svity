"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { MonthView } from "@svity/contracts";
import { Link } from "@/i18n/navigation";
import { getMonth } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "../icons";

/** The month in cards (spec §7): one cell per day, the day's card where there is one. */
export function Mosaic() {
  const t = useTranslations("app.diary");
  const tt = useTranslations("app.today");
  const locale = useLocale();
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [view, setView] = useState<MonthView | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Ignore a late answer for a month we already left (fast prev/next clicks).
    let current = true;
    setFailed(false);
    getMonth(locale, month)
      .then((v) => current && setView(v))
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [locale, month, attempt]);

  if (!view)
    return (
      <div className="mosaic mosaic--app mosaic--status glass" aria-busy={!failed}>
        {failed && (
          <>
            <p className="app-muted">{tt("error")}</p>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setAttempt((n) => n + 1)}>
              {tt("retry")}
            </button>
          </>
        )}
      </div>
    );

  const [y, m] = view.month.split("-").map(Number) as [number, number];
  const first = new Date(y, m - 1, 1);
  const daysIn = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday first
  const now = new Date();
  const today = now.getFullYear() === y && now.getMonth() === m - 1 ? now.getDate() : 0;
  const byDay = new Map(view.days.map((d) => [d.day, d]));

  const monthName = new Intl.DateTimeFormat(locale, { month: "long", year: now.getFullYear() === y ? undefined : "numeric" }).format(first);
  const title = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const dayLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2024, 0, 1 + i)),
  );

  return (
    <section className="mosaic mosaic--app glass" aria-label={title}>
      <div className="mosaic__head">
        <button type="button" className="icon-btn" onClick={() => setMonth(view.prev!)} disabled={!view.prev} aria-label={t("prevMonth")}>
          <ChevronLeft />
        </button>
        <p className="mosaic__month">{title}</p>
        <button type="button" className="icon-btn" onClick={() => setMonth(view.next!)} disabled={!view.next} aria-label={t("nextMonth")}>
          <ChevronRight />
        </button>
      </div>
      <div className="mosaic__grid mosaic__grid--week" aria-hidden="true">
        {weekdays.map((w, i) => (
          <span key={i} className="mosaic__weekday">
            {w}
          </span>
        ))}
      </div>
      <div className="mosaic__grid">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: daysIn }, (_, i) => {
          const day = i + 1;
          const cell = byDay.get(day);
          const cls = `mosaic__day ${cell ? "has-card" : ""} ${day === today ? "is-today" : ""} ${today && day > today ? "is-future" : ""}`;
          return cell ? (
            <Link key={day} href={`/diary/${cell.entryId}`} className={cls} aria-label={t("openDay", { date: dayLabel.format(new Date(y, m - 1, day)) })}>
              <Image src={cell.card.imageUrl} alt="" fill sizes="48px" unoptimized />
            </Link>
          ) : (
            <span key={day} className={cls}>
              {day}
            </span>
          );
        })}
      </div>
      <p className="mosaic__count">{t("monthCount", { month: title, count: view.count })}</p>
      {failed && (
        <p className="form-error mosaic__error">
          {tt("error")}{" "}
          <button type="button" className="link-btn" onClick={() => setAttempt((n) => n + 1)}>
            {tt("retry")}
          </button>
        </p>
      )}
    </section>
  );
}

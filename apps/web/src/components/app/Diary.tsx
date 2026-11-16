"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { type EntryView, type ProfileStats } from "@svity/contracts";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError, getEntries } from "@/lib/api";
import { Heart } from "../icons";
import { Mosaic } from "./Mosaic";
import { Sky } from "../Sky";
import type { SessionSummaryView } from "@svity/contracts";
import { api } from "@/lib/api";

/** The diary (spec §7): newest first, filter by favourites. */
export function Diary() {
  const t = useTranslations("app.diary");
  const tt = useTranslations("app.today");
  const ts = useTranslations("app.shadow");
  const locale = useLocale();
  const router = useRouter();

  const [favorite, setFavorite] = useState(false);
  const [items, setItems] = useState<EntryView[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (before?: string) => {
      try {
        const page = await getEntries(locale, { before, favorite });
        setItems((xs) => (before && xs ? [...xs, ...page.entries] : page.entries));
        setNext(page.next);
        setError(false);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return router.replace("/signin");
        setError(true);
      }
    },
    [locale, favorite, router],
  );

  useEffect(() => {
    load();
  }, [load]);

  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", weekday: "long" });
  const thisYear = new Date().getFullYear();
  const monthLabel = (d: Date) =>
    new Intl.DateTimeFormat(locale, { month: "long", year: d.getFullYear() === thisYear ? undefined : "numeric" }).format(d);
  // Newest first, grouped by calendar month.
  const groups: { key: string; label: string; items: EntryView[] }[] = [];
  for (const e of items ?? []) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (groups.at(-1)?.key !== key) {
      const label = monthLabel(d);
      groups.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] });
    }
    groups.at(-1)!.items.push(e);
  }
  const filtered = favorite;

  return (
    <section className="diary-page">
      <Sky />
      <header className="diary-page__head">
        <h1 className="h2">{t("title")}</h1>
        <p className="diary-page__sub">{t("sub")}</p>
      </header>

      <div className="diary-page__layout">
        <aside className="diary-page__side">
          <Mosaic />
          <Stats />
          <div className="diary-page__filters">
            <p className="field-label">{t("filter")}</p>
            <div className="chips diary-page__filter" role="group" aria-label={t("filter")}>
              <button
                type="button"
                className={`chip ${!filtered ? "chip--selected" : ""}`}
                aria-pressed={!filtered}
                onClick={() => setFavorite(false)}
              >
                {t("all")}
              </button>
              <button type="button" className={`chip chip--icon ${favorite ? "chip--selected" : ""}`} aria-pressed={favorite} onClick={() => setFavorite((x) => !x)}>
                <Heart size={14} filled={favorite} /> {t("favorites")}
              </button>
            </div>
          </div>
        </aside>

        <div className="diary-page__main">
          <Sessions />
          {error && <p className="form-error">{tt("error")}</p>}

          {items?.length === 0 && (
            <div className="diary-page__empty glass">
              <Image src="/brand/diary.webp" alt="" width={140} height={140} />
              <p>{filtered ? t("empty") : t("emptyAll")}</p>
              {!filtered && (
                <Link href="/today" className="btn">
                  {t("drawToday")}
                </Link>
              )}
            </div>
          )}

          {groups.map((g) => (
            <section key={g.key} className="diary-month" aria-label={g.label}>
              <h2 className="diary-month__title">
                {g.label}
                <span>{t("entriesN", { count: g.items.length })}</span>
              </h2>
              <ol className="diary-page__list">
                {g.items.map((e) => (
                  <li key={e.id}>
                    <Link href={`/diary/${e.id}`} className="entry entry--link diary-entry glass" aria-label={`${t("open")}: ${e.card.question}`}>
                      <span className="entry__thumb diary-entry__thumb">
                        <Image src={e.card.imageUrl} alt={tt("cardAlt", { n: e.card.id })} fill sizes="96px" unoptimized />
                      </span>
                      <div className="diary-entry__body">
                        <p className="entry__meta">
                          <time dateTime={e.createdAt}>{date.format(new Date(e.createdAt))}</time> · {tt("cardN", { n: e.card.id })}
                          {e.isShadow && <> · {ts("label")}</>}
                          {e.editedAt && <> · {t("edited")}</>}
                        </p>
                        <p className="entry__q">{e.card.question}</p>
                        {e.request && <p className="today__req-text">“{e.request}”</p>}
                        <p className={`entry__note diary-entry__note ${e.note ? "" : "is-empty"}`}>{e.note ?? t("noNote")}</p>
                      </div>
                      {e.isFavorite && (
                        <span className="entry__fav" aria-hidden="true">
                          <Heart size={16} filled />
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          {next && (
            <button type="button" className="btn btn--ghost diary-page__more" onClick={() => load(next)}>
              {t("more")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/** How many entries the diary holds. */
function Stats() {
  const t = useTranslations("app.diary");
  const [stats, setStats] = useState<ProfileStats | null>(null);
  useEffect(() => {
    api<ProfileStats>("/v1/me/stats")
      .then(setStats)
      .catch(() => {});
  }, []);
  if (!stats || stats.entries === 0) return null;
  return (
    <dl className="diary-stats glass">
      <div>
        <dt>{t("statEntries")}</dt>
        <dd>{stats.entries}</dd>
      </div>
    </dl>
  );
}

/** Session summaries from a psychologist (spec §10.8), newest first. Hidden when there are none. */
function Sessions() {
  const t = useTranslations("app.sessions");
  const tr = useTranslations("app.room");
  const locale = useLocale();
  const [items, setItems] = useState<SessionSummaryView[]>([]);
  useEffect(() => {
    api<SessionSummaryView[]>("/v1/sessions")
      .then(setItems)
      .catch(() => {});
  }, []);
  if (!items.length) return null;
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });
  return (
    <div className="diary-sessions">
      <h2 className="h3">{t("title")}</h2>
      <ul>
        {items.map((s) => (
          <li key={s.id}>
            <Link href={`/diary/session/${s.id}`} className="diary-session glass">
              <span className="diary-session__thumbs" aria-hidden="true">
                {s.cards.map((c) => (
                  <span key={c.position} className="diary-session__thumb">
                    <Image src={c.card.imageUrl} alt="" fill sizes="40px" unoptimized />
                  </span>
                ))}
              </span>
              <span>
                <span className="entry__meta">
                  {date.format(new Date(s.sentAt))}
                  {s.psychologistName && <> · {tr("from", { name: s.psychologistName })}</>}
                </span>
                <span className="diary-session__q">{s.weekQuestion ?? t("open")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

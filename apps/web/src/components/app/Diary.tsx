"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { feelings, type EntryView, type Feeling } from "@svity/contracts";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError, getEntries } from "@/lib/api";
import { Heart } from "../icons";
import { Mosaic } from "./Mosaic";
import type { SessionSummaryView } from "@svity/contracts";
import { api } from "@/lib/api";

/** The diary (spec §7): newest first, filter by feeling (before or after). */
export function Diary() {
  const t = useTranslations("app.diary");
  const tt = useTranslations("app.today");
  const tf = useTranslations("feelings");
  const ts = useTranslations("app.shadow");
  const locale = useLocale();
  const router = useRouter();

  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [items, setItems] = useState<EntryView[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (before?: string) => {
      try {
        const page = await getEntries(locale, { before, feeling: feeling ?? undefined, favorite });
        setItems((xs) => (before && xs ? [...xs, ...page.entries] : page.entries));
        setNext(page.next);
        setError(false);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return router.replace("/signin");
        setError(true);
      }
    },
    [locale, feeling, favorite, router],
  );

  useEffect(() => {
    load();
  }, [load]);

  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", weekday: "short" });

  return (
    <section className="diary-page container container--narrow">
      <h1 className="h2">{t("title")}</h1>
      <Mosaic />
      <Sessions />

      <div className="chips diary-page__filter" role="group" aria-label={t("filter")}>
        <button
          type="button"
          className={`chip ${feeling === null && !favorite ? "chip--selected" : ""}`}
          aria-pressed={feeling === null && !favorite}
          onClick={() => {
            setFeeling(null);
            setFavorite(false);
          }}
        >
          {t("all")}
        </button>
        <button type="button" className={`chip chip--icon ${favorite ? "chip--selected" : ""}`} aria-pressed={favorite} onClick={() => setFavorite((x) => !x)}>
          <Heart size={14} filled={favorite} /> {t("favorites")}
        </button>
        {feelings.map((f) => (
          <button
            key={f}
            type="button"
            className={`chip chip--${f} ${feeling === f ? "chip--selected" : ""}`}
            aria-pressed={feeling === f}
            onClick={() => setFeeling(f)}
          >
            {tf(f)}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{tt("error")}</p>}

      {items?.length === 0 && (
        <div className="diary-page__empty glass">
          <Image src="/brand/diary.webp" alt="" width={140} height={140} />
          <p>{feeling || favorite ? t("empty") : t("emptyAll")}</p>
          {!feeling && !favorite && (
            <Link href="/today" className="btn">
              {t("drawToday")}
            </Link>
          )}
        </div>
      )}

      <ol className="diary-page__list">
        {items?.map((e) => (
          <li key={e.id}>
            <Link href={`/diary/${e.id}`} className="entry entry--link glass" aria-label={`${t("open")}: ${e.card.question}`}>
              <span className="entry__thumb">
                <Image src={e.card.imageUrl} alt={tt("cardAlt", { n: e.card.id })} fill sizes="72px" unoptimized />
              </span>
              <div>
                <p className="entry__meta">
                  <time dateTime={e.createdAt}>{date.format(new Date(e.createdAt))}</time> · {tt("cardN", { n: e.card.id })}
                  {e.isShadow && <> · {ts("label")}</>}
                  {e.editedAt && <> · {t("edited")}</>}
                </p>
                <p className="entry__q">{e.card.question}</p>
                {e.request && <p className="today__req-text">“{e.request}”</p>}
                <p className="entry__note">{e.note ?? t("noNote")}</p>
                <p className="entry__feel">
                  <span className="chip chip--sm">{tf(e.feelingBefore)}</span>
                  <span aria-hidden="true">→</span>
                  <span className="chip chip--sm chip--sage">{tf(e.feelingAfter)}</span>
                </p>
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

      {next && (
        <button type="button" className="btn btn--ghost diary-page__more" onClick={() => load(next)}>
          {t("more")}
        </button>
      )}
    </section>
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

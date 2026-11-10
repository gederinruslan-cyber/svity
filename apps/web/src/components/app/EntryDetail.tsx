"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { EntryView } from "@svity/contracts";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError, deleteEntry, getEntry, patchEntry } from "@/lib/api";
import { ChevronLeft, Heart, Share, Trash } from "../icons";

/** One diary entry (spec §7): card, question, feelings, editable note, favourite, share, delete in two steps. */
export function EntryDetail({ id }: { id: string }) {
  const t = useTranslations("app.diary");
  const tt = useTranslations("app.today");
  const tf = useTranslations("feelings");
  const ts = useTranslations("app.shadow");
  const locale = useLocale();
  const router = useRouter();

  const [entry, setEntry] = useState<EntryView | null>(null);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    getEntry(id, locale)
      .then(setEntry)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return router.replace("/signin");
        setMissing(true);
      });
  }, [id, locale, router]);

  async function update(body: Parameters<typeof patchEntry>[2]) {
    try {
      setEntry(await patchEntry(id, locale, body));
      setError(false);
      return true;
    } catch {
      setError(true);
      return false;
    }
  }

  async function remove() {
    try {
      await deleteEntry(id);
      router.replace("/diary");
    } catch {
      setError(true);
    }
  }

  // Text only, never the card image (spec §6).
  async function share() {
    if (!entry) return;
    const text = t("shareText", { q: entry.card.question });
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  }

  if (missing) {
    return (
      <section className="entry-page container container--narrow">
        <p className="app-muted">{t("notFound")}</p>
        <Link href="/diary" className="btn">
          {t("back")}
        </Link>
      </section>
    );
  }
  if (!entry) return <p className="app-loading">{tt("loading")}</p>;

  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", weekday: "long" });

  return (
    <article className="entry-page container container--narrow">
      <Link href="/diary" className="entry-page__back">
        <ChevronLeft size={18} /> {t("back")}
      </Link>

      <div className="entry-page__grid">
        <span className="entry-page__card">
          <Image src={entry.card.imageUrl} alt={tt("cardAlt", { n: entry.card.id })} fill sizes="(max-width: 700px) 60vw, 300px" unoptimized draggable={false} />
        </span>

        <div className="entry-page__body">
          <p className="entry__meta">
            <time dateTime={entry.createdAt}>{date.format(new Date(entry.createdAt))}</time> · {tt("cardN", { n: entry.card.id })}
            {entry.isShadow && <> · {ts("label")}</>}
            {entry.editedAt && <> · {t("edited")}</>}
          </p>
          <h1 className="question">{entry.card.question}</h1>
          {entry.request && (
            <p className="today__req-text">
              <span className="sr-only">{t("request")}: </span>“{entry.request}”
            </p>
          )}
          <p className="entry__feel" aria-label={t("feelings")}>
            <span className="chip chip--sm">{tf(entry.feelingBefore)}</span>
            <span aria-hidden="true">→</span>
            <span className="chip chip--sm chip--sage">{tf(entry.feelingAfter)}</span>
          </p>

          {editing ? (
            <div className="entry-page__edit">
              <textarea
                className="field field--area"
                rows={6}
                maxLength={10_000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label={t("editNote")}
                autoFocus
              />
              <div className="demo__actions">
                <button type="button" className="link-btn" onClick={() => setEditing(false)}>
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    if (await update({ note: draft.trim() || null })) setEditing(false);
                  }}
                >
                  {t("saveNote")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={`entry-page__note ${entry.note ? "" : "is-empty"}`}>{entry.note ?? t("noNote")}</p>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setDraft(entry.note ?? "");
                  setEditing(true);
                }}
              >
                {entry.note ? t("editNote") : t("addNote")}
              </button>
            </>
          )}

          <div className="entry-page__actions">
            <button
              type="button"
              className={`icon-btn ${entry.isFavorite ? "is-on" : ""}`}
              aria-pressed={entry.isFavorite}
              aria-label={entry.isFavorite ? t("favoriteRemove") : t("favoriteAdd")}
              title={entry.isFavorite ? t("favoriteRemove") : t("favoriteAdd")}
              onClick={() => update({ isFavorite: !entry.isFavorite })}
            >
              <Heart filled={entry.isFavorite} />
            </button>
            <button type="button" className="icon-btn" aria-label={t("share")} title={t("share")} onClick={share}>
              <Share />
            </button>
            <button type="button" className="icon-btn" aria-label={t("delete")} title={t("delete")} onClick={() => setConfirmDelete(true)}>
              <Trash />
            </button>
            {copied && (
              <span className="entry-page__toast" role="status">
                {t("copied")}
              </span>
            )}
          </div>

          {confirmDelete && (
            <div className="today__close" role="alert">
              <p className="demo__muted">{t("deleteConfirm")}</p>
              <div className="demo__actions">
                <button type="button" className="link-btn" onClick={() => setConfirmDelete(false)}>
                  {t("deleteNo")}
                </button>
                <button type="button" className="btn btn--danger" onClick={remove}>
                  {t("deleteYes")}
                </button>
              </div>
            </div>
          )}
          {error && <p className="form-error">{tt("error")}</p>}
        </div>
      </div>
    </article>
  );
}

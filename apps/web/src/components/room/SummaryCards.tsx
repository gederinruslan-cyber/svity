"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { SessionSummaryView } from "@svity/contracts";

/** "Session summary" (spec §10.8): the confirmed cards by position and the question for the week. */
export function SummaryCards({ summary }: { summary: SessionSummaryView }) {
  const t = useTranslations("app.room");
  const tt = useTranslations("app.today");
  return (
    <div className="summary glass">
      {summary.psychologistName && <p className="demo__label">{t("from", { name: summary.psychologistName })}</p>}
      <ol className="summary__cards">
        {summary.cards.map((c) => (
          <li key={c.position}>
            <span className="summary__card">
              <Image src={c.card.imageUrl} alt={tt("cardAlt", { n: c.card.id })} fill sizes="120px" unoptimized draggable={false} />
            </span>
            <span className="room-slot__label">{t(`positions.${c.position}`)}</span>
          </li>
        ))}
      </ol>
      {summary.weekQuestion && (
        <>
          <p className="field-label">{t("weekQuestion")}</p>
          <p className="question">{summary.weekQuestion}</p>
        </>
      )}
    </div>
  );
}

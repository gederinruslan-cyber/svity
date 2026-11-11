"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";

// What the client draws, one per position.
const DRAWN = ["22", "20", "12"] as const;

/** The psychologist's room, playable: the client shares cards one by one and they land in the pro's slots. */
export function RoomMock() {
  const t = useTranslations("pros");
  const [shared, setShared] = useState(0);
  const slots = [t("mockSlot1"), t("mockSlot2"), t("mockSlot3")];
  const done = shared === DRAWN.length;
  const current = DRAWN[Math.min(shared, DRAWN.length - 1)]!;

  return (
    <div className="room-mock reveal">
      <div className="laptop" aria-hidden="true">
        <div className="laptop__bar">
          <span className="dot-live" /> {t("mockStatus")}
        </div>
        <div className="laptop__slots">
          {slots.map((s, i) => (
            <div key={s} className={`slot ${i < shared ? "slot--filled" : ""}`}>
              <span className="slot__card">
                {i >= shared && <span className="slot__wait">{t("mockEmpty")}</span>}
                {i < shared && (
                  <Image
                    src={`/cards/demo-${DRAWN[i]}.webp`}
                    alt=""
                    fill
                    sizes="90px"
                  />
                )}
              </span>
              <span className="slot__label">{s}</span>
            </div>
          ))}
        </div>
        <div className="laptop__notes">
          <span className="laptop__notes-title">{t("mockNotes")}</span>
          <span className="laptop__note">{t("mockNote")}</span>
        </div>
        <span className="tag tag--pro">{t("mockPro")}</span>
      </div>
      <div className="phone">
        <p className="phone__pos">
          {t("mockPositionN", {
            n: Math.min(shared + 1, 3),
            slot: slots[Math.min(shared, 2)]!,
          })}
        </p>
        <span className="phone__card" key={current}>
          <Image
            src={`/cards/demo-${current}.webp`}
            alt=""
            fill
            sizes="120px"
          />
        </span>
        <button
          type="button"
          className="phone__btn"
          onClick={() => setShared(done ? 0 : shared + 1)}
        >
          {done ? t("mockReset") : t("mockShare")}
        </button>
        <span className="phone__link">{t("mockReturn")}</span>
        {shared > 0 && (
          <span className="phone__shared" key={shared} role="status">
            {t("mockShared")}
          </span>
        )}
        <span className="tag tag--client">{t("mockClient")}</span>
      </div>
      <p className="room-mock__hint">{t("mockHint")}</p>
    </div>
  );
}

"use client";

import Image from "next/image";
import { motion } from "@svity/tokens";
import { Star4 } from "../icons";

export type RitualStage = "deck" | "waking" | "flipped";

type Props = {
  stage: RitualStage;
  front: { src: string; alt: string } | null;
  onDraw?: () => void;
  deckLabel: string;
  /** Shows the stack of cards under the top one (deck mode). */
  stacked?: boolean;
  /** For signed API URLs: they must not go through (or be cached by) the image optimizer. */
  unoptimized?: boolean;
};

const sparks = Array.from({ length: motion.ritual.sparks }, (_, i) => (360 / motion.ritual.sparks) * i + 15);

/**
 * The daily-card ritual from spec §6/§13: the star on the card back wakes up
 * (gold glow + sparks), then the card flips. Reused by the product in M1.
 */
export function RitualCard({ stage, front, onDraw, deckLabel, stacked = true, unoptimized = false }: Props) {
  const interactive = stage === "deck" && !!onDraw;
  return (
    <div className={`ritual ritual--${stage}`}>
      {stacked && <span className="ritual__under ritual__under--2" aria-hidden="true" />}
      {stacked && <span className="ritual__under ritual__under--1" aria-hidden="true" />}
      <button
        type="button"
        className="ritual__card"
        onClick={interactive ? onDraw : undefined}
        disabled={!interactive}
        aria-label={interactive ? deckLabel : front?.alt}
      >
        <span className="ritual__inner">
          <span className="ritual__face ritual__face--back">
            <Image src="/cards/back.webp" alt="" fill sizes="(max-width: 600px) 70vw, 300px" priority />
            <span className="ritual__glow" aria-hidden="true" />
          </span>
          <span className="ritual__face ritual__face--front">
            {front && <Image src={front.src} alt={front.alt} fill sizes="(max-width: 600px) 70vw, 300px" unoptimized={unoptimized} draggable={false} />}
          </span>
        </span>
      </button>
      <span className="ritual__sparks" aria-hidden="true">
        {sparks.map((a) => (
          <span key={a} className="spark" style={{ "--a": `${a}deg` } as React.CSSProperties}>
            <Star4 size={10} />
          </span>
        ))}
      </span>
    </div>
  );
}

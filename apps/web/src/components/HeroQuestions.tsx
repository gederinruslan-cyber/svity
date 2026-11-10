"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const CARDS = ["25", "21", "11", "6", "20", "12", "23", "22"] as const;

/** Real questions from the deck, fading in one after another under the hero title. */
export function HeroQuestions() {
  const tc = useTranslations("cards");
  const questions = CARDS.flatMap((n) => (tc.raw(n) as string[]).slice(0, 1));
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((x) => (x + 1) % questions.length), 4200);
    return () => clearInterval(id);
  }, [questions.length]);

  return (
    <p className="hero__q reveal" aria-hidden="true">
      <span key={i} className="hero__q-text">
        {questions[i]}
      </span>
    </p>
  );
}

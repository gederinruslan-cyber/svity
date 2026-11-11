"use client";

import { useEffect, useState } from "react";

// One feeling across the launch and coming languages (endonyms, not UI text).
const WORDS = [
  ["Спокій", "Українська"],
  ["Calm", "English"],
  ["Ruhe", "Deutsch"],
  ["Spokój", "Polski"],
  ["Klid", "Čeština"],
  ["Calma", "Italiano"],
  ["Calma", "Español"],
  ["Calme", "Français"],
] as const;

/** A slow carousel of the same word in each language. Decorative; still under reduced motion. */
export function LangWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((x) => (x + 1) % WORDS.length), 2400);
    return () => clearInterval(id);
  }, []);
  const [word, lang] = WORDS[i]!;
  return (
    <p className="lang-word" aria-hidden="true">
      <span key={i} className="lang-word__in">
        <span className="lang-word__w">{word}</span>
        <span className="lang-word__l">{lang}</span>
      </span>
    </p>
  );
}

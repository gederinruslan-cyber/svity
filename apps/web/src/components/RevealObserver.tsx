"use client";

import { useEffect } from "react";

/** Adds `is-in` to `.reveal` elements as they scroll into view (spec §13 "screen enter"). */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    // The class is page-wide: take it off when we leave the landing, or app pages
    // (e.g. the diary's mosaic, which shares classes with the landing's) stay hidden.
    return () => {
      io.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);
  return null;
}

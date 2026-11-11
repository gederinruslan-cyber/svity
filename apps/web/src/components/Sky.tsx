"use client";

import { useEffect, useRef } from "react";

// One "day" across the page: morning at the top, golden hour by the diary,
// night at the shadow cards, dawn by the psychologists' room, then day again.
type RGB = [number, number, number];
const hex = (h: string): RGB =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const SKY = {
  day: { top: hex("#D6E6F2"), bottom: hex("#F6F3EC") },
  golden: { top: hex("#EBD9C6"), bottom: hex("#F7EEE2") },
  dawn: { top: hex("#E4DCE6"), bottom: hex("#F6F0EA") },
  night: { top: hex("#33465F"), bottom: hex("#121A25") },
};

const mix = (a: RGB, b: RGB, t: number): RGB =>
  a.map((v, i) => Math.round(v + (b[i]! - v) * t)) as RGB;
const css = ([r, g, b]: RGB) => `rgb(${r} ${g} ${b})`;
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** 1 when the element's centre is at the viewport centre, fading to 0 as it leaves. */
function presence(el: Element | null, vh: number, reach = 1) {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const d =
    Math.abs(r.top + r.height / 2 - vh / 2) / ((r.height / 2 + vh / 2) * reach);
  return 1 - smooth(0.35, 1, d);
}

export function Sky() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sky = ref.current!;
    const root = document.documentElement;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const vh = window.innerHeight;
      const evening = root.dataset.theme === "evening";
      const night = evening
        ? 1
        : presence(document.querySelector(".shadow"), vh, 0.9);
      const golden = presence(document.querySelector(".diary"), vh, 1.4);
      const dawn = presence(document.getElementById("pros"), vh, 1.4);

      let top = mix(
        mix(SKY.day.top, SKY.golden.top, golden),
        SKY.dawn.top,
        dawn,
      );
      let bottom = mix(
        mix(SKY.day.bottom, SKY.golden.bottom, golden),
        SKY.dawn.bottom,
        dawn,
      );
      top = mix(top, SKY.night.top, night);
      bottom = mix(bottom, SKY.night.bottom, night);

      sky.style.setProperty("--sky-top", css(top));
      sky.style.setProperty("--sky-bottom", css(bottom));
      sky.style.setProperty("--night", String(night));
      sky.dataset.evening = evening ? "true" : "false";

      // Keep the header readable while the sky is dark.
      const header = document.querySelector<HTMLElement>(".site-header");
      if (header && !evening) {
        if (night > 0.55) header.dataset.theme = "evening";
        else delete header.dataset.theme;
      } else if (header) delete header.dataset.theme;
    };

    const request = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    // Theme switches change `data-theme` on <html>.
    const mo = new MutationObserver(request);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      mo.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className="sky" aria-hidden="true">
      <span className="sky__stars" />
    </div>
  );
}

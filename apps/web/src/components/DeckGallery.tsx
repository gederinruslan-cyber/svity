"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

// Cards with demo art; shadow candidates excluded.
const CARDS = ["21", "11", "25", "6", "20", "12", "23", "22"] as const;
// Three copies so the strip can loop endlessly; the middle one is "real".
const COPIES = 3;
const SPEED = 24; // px per second
const RESUME_AFTER = 2500; // ms after the last touch or wheel

/**
 * A quiet strip of card art inside the page width. It drifts on its own, pauses on
 * hover, and on touch screens can be swiped (native scrolling). Cards aren't
 * interactive; the one passing the centre lifts slightly.
 */
export function DeckGallery() {
  const t = useTranslations("deck");
  const track = useRef<HTMLDivElement>(null);
  const lastTouch = useRef(0);
  const hovering = useRef(false);

  useEffect(() => {
    const el = track.current!;
    const items = el.children as HTMLCollectionOf<HTMLElement>;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const setWidth = () => items[CARDS.length]!.offsetLeft - items[0]!.offsetLeft;
    let frame = 0;
    let drift = 0;
    let visible = false;
    let pos = 0;
    let last = 0;

    const paint = () => {
      frame = 0;
      // Keep the scroll position inside the middle copy.
      const w = setWidth();
      if (el.scrollLeft < w * 0.5) el.scrollLeft += w;
      else if (el.scrollLeft > w * 1.5) el.scrollLeft -= w;
      const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
      for (const card of items) {
        const r = card.getBoundingClientRect();
        const d = Math.min(1, Math.abs(r.left + r.width / 2 - mid) / (el.clientWidth / 2));
        card.style.setProperty("--lift", (1 - d * d).toFixed(3));
      }
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(64, now - last) : 0;
      last = now;
      if (hovering.current || performance.now() - lastTouch.current < RESUME_AFTER) pos = el.scrollLeft;
      else {
        // Track a float position; scrollLeft may round to whole pixels.
        if (Math.abs(pos - el.scrollLeft) > 2) pos = el.scrollLeft;
        pos += (SPEED * dt) / 1000;
        el.scrollLeft = pos;
      }
      drift = requestAnimationFrame(tick);
    };
    const start = () => {
      if (reduced || drift || !visible || document.hidden) return;
      last = 0;
      pos = el.scrollLeft;
      drift = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(drift);
      drift = 0;
    };

    el.scrollLeft = setWidth() + (setWidth() - el.clientWidth) / 2;
    paint();

    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(el);
    const onVisibility = () => (document.hidden ? stop() : start());
    const touched = () => (lastTouch.current = performance.now());
    const enter = (e: PointerEvent) => e.pointerType === "mouse" && (hovering.current = true);
    const leave = () => (hovering.current = false);

    el.addEventListener("scroll", request, { passive: true });
    el.addEventListener("touchstart", touched, { passive: true });
    el.addEventListener("touchmove", touched, { passive: true });
    el.addEventListener("wheel", touched, { passive: true });
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    window.addEventListener("resize", request);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      stop();
      io.disconnect();
      el.removeEventListener("scroll", request);
      el.removeEventListener("touchstart", touched);
      el.removeEventListener("touchmove", touched);
      el.removeEventListener("wheel", touched);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", request);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const all = Array.from({ length: COPIES }, () => CARDS).flat();

  return (
    <div className="container">
      <div className="gallery reveal">
        <div ref={track} className="gallery__track" role="list" aria-label={t("galleryLabel")}>
          {all.map((n, i) => (
            // Screen readers see each card once (the middle copy).
            <div key={i} role="listitem" className="gallery__item" aria-hidden={Math.floor(i / CARDS.length) !== 1 || undefined}>
              <span className="gcard">
                <span className="gcard__face">
                  <Image src={`/cards/demo-${n}.webp`} alt={t("cardLabel", { n })} fill sizes="180px" draggable={false} />
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// Only cards whose number (and so whose questions) we know; shadow candidates excluded.
const CARDS = ["21", "11", "25", "6", "20", "12", "23", "22"] as const;
// Three copies so the strip can loop endlessly in both directions; the middle one is "real".
const COPIES = 3;
const SPEED = 30; // px per second, about the pace of the old marquee
const RESUME_AFTER = 2500; // ms after the last touch, drag or wheel

/**
 * An endless strip of cards that drifts on its own, like a marquee, but you can
 * also swipe (touch), drag with momentum (mouse) or scroll it. It pauses while you
 * interact or while a card is flipped. Cards lift as they pass the centre; a tap
 * flips one to show its question.
 */
export function DeckGallery() {
  const t = useTranslations("deck");
  const tc = useTranslations("cards");
  const track = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState<number | null>(null);
  const flippedRef = useRef<number | null>(null);
  const dragged = useRef(false);
  const lastTouch = useRef(0);
  const hovering = useRef(false);

  useEffect(() => {
    flippedRef.current = flipped;
  }, [flipped]);

  // Lift near the centre, endless wrap, and the auto drift.
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
      const paused =
        hovering.current ||
        flippedRef.current !== null ||
        el.classList.contains("is-dragging") ||
        performance.now() - lastTouch.current < RESUME_AFTER;
      if (paused) pos = el.scrollLeft;
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
    el.addEventListener("focusin", touched);
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
      el.removeEventListener("focusin", touched);
      window.removeEventListener("resize", request);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Mouse drag with momentum (touch already swipes natively).
  useEffect(() => {
    const el = track.current!;
    let startX = 0;
    let startScroll = 0;
    let lastX = 0;
    let lastT = 0;
    let v = 0;
    let glide = 0;
    let down = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      cancelAnimationFrame(glide);
      down = true;
      dragged.current = false;
      startX = lastX = e.clientX;
      startScroll = el.scrollLeft;
      lastT = performance.now();
      v = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!dragged.current && Math.abs(dx) > 5) {
        dragged.current = true;
        el.classList.add("is-dragging");
        el.setPointerCapture(e.pointerId);
      }
      if (!dragged.current) return;
      el.scrollLeft = startScroll - dx;
      const now = performance.now();
      v = (e.clientX - lastX) / Math.max(1, now - lastT);
      lastX = e.clientX;
      lastT = now;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      el.classList.remove("is-dragging");
      if (!dragged.current) return;
      lastTouch.current = performance.now();
      let speed = v * 16; // px per frame
      const step = () => {
        speed *= 0.94;
        el.scrollLeft -= speed;
        lastTouch.current = performance.now();
        if (Math.abs(speed) > 0.5) glide = requestAnimationFrame(step);
      };
      glide = requestAnimationFrame(step);
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(glide);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const all = Array.from({ length: COPIES }, () => CARDS).flat();

  return (
    <div className="gallery reveal">
      <div ref={track} className="gallery__track" role="list" aria-label={t("galleryLabel")}>
        {all.map((n, i) => {
          const q = (tc.raw(n) as string[])[0]!;
          const isFlipped = flipped === i;
          // Screen readers and keyboard see each card once (the middle copy).
          const copy = Math.floor(i / CARDS.length) !== 1;
          return (
            <div key={i} role="listitem" className="gallery__item" aria-hidden={copy || undefined}>
              <button
                type="button"
                tabIndex={copy ? -1 : undefined}
                className={`gcard ${isFlipped ? "is-flipped" : ""}`}
                aria-label={isFlipped ? t("flipBack", { n, q }) : t("flipLabel", { n })}
                onClick={() => {
                  if (dragged.current) return;
                  lastTouch.current = performance.now();
                  setFlipped(isFlipped ? null : i);
                }}
              >
                <span className="gcard__inner">
                  <span className="gcard__face gcard__face--front">
                    <Image src={`/cards/demo-${n}.webp`} alt="" fill sizes="200px" draggable={false} />
                  </span>
                  <span className="gcard__face gcard__face--back">
                    <span className="gcard__n">{n}</span>
                    <span className="gcard__q">{q}</span>
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <p className="gallery__hint">{t("hint")}</p>
    </div>
  );
}

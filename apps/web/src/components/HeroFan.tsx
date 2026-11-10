"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

const MAX_TILT = 12; // degrees

/**
 * The hero card back tilts toward the pointer (or the phone's tilt on Android),
 * and a sheen moves across the gold foil. Tapping it leads to the demo.
 */
export function HeroFan({ label }: { label: string }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let target = { x: 0, y: 0 };

    const apply = () => {
      frame = 0;
      el.style.setProperty("--rx", `${(-target.y * MAX_TILT).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(target.x * MAX_TILT).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(50 + target.x * 45).toFixed(1)}%`);
      el.style.setProperty("--my", `${(50 + target.y * 45).toFixed(1)}%`);
    };
    const set = (x: number, y: number) => {
      target = {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      };
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      // Normalised to the card, but reacting across the whole hero.
      set(
        (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2),
        (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2),
      );
    };
    const onLeave = () => set(0, 0);
    // iOS needs a permission prompt for this; we only use it where it's free (Android).
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      set(e.gamma / 30, (e.beta - 45) / 30);
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("deviceorientation", onTilt);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, []);

  return (
    <a ref={ref} href="#try" className="hero__fan" aria-label={label}>
      <span className="hero__tilt">
        <span className="hero__fan-card hero__fan-card--l">
          <Image src="/cards/gallery-3.webp" alt="" fill sizes="220px" />
        </span>
        <span className="hero__fan-card hero__fan-card--r">
          <Image src="/cards/gallery-5.webp" alt="" fill sizes="220px" />
        </span>
        <span className="hero__back">
          <Image
            src="/cards/back.webp"
            alt=""
            fill
            sizes="(max-width: 700px) 60vw, 300px"
            priority
          />
          <span className="hero__back-glow" />
          <span className="hero__sheen" />
        </span>
      </span>
    </a>
  );
}

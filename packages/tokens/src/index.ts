// Design tokens from the product spec §13. Shared by web (CSS variables) and, later, mobile.

export const palette = {
  skyWhisper: "#D6E6F2",
  powderBlue: "#B7CCE3",
  dustyHorizon: "#87A8C6",
  oceanBreeze: "#5D7896",
  arcticMist: "#E9F1F7",
  pearlIvory: "#F6F3EC",
  silverSage: "#B9C6BE",
  deepInk: "#26364A",
  slate: "#4F5F74",
  link: "#4A6380",
  goldDay: "#B8964F",
  goldEvening: "#D9BC7E",
  night: "#18222F",
  nightTop: "#33465F",
  nightBottom: "#121A25",
  nightText: "#EEF2F6",
  nightTextMuted: "#B3C0CF",
} as const;

export const themes = {
  day: {
    bg: palette.pearlIvory,
    bgTop: palette.skyWhisper,
    bgMid: palette.arcticMist,
    text: palette.deepInk,
    textMuted: palette.slate,
    link: palette.link,
    accent: palette.oceanBreeze,
    accentText: "#FFFFFF",
    gold: palette.goldDay,
    glass: "rgba(255,255,255,0.55)",
    glassBorder: "rgba(255,255,255,0.7)",
    line: "rgba(38,54,74,0.12)",
    sage: palette.silverSage,
  },
  evening: {
    bg: palette.night,
    bgTop: palette.nightTop,
    bgMid: palette.night,
    text: palette.nightText,
    textMuted: palette.nightTextMuted,
    link: palette.powderBlue,
    accent: palette.powderBlue,
    accentText: palette.night,
    gold: palette.goldEvening,
    glass: "rgba(255,255,255,0.075)",
    glassBorder: "rgba(255,255,255,0.14)",
    line: "rgba(238,242,246,0.14)",
    sage: palette.silverSage,
  },
} as const;

export type ThemeName = keyof typeof themes;

export const radius = { card: 14, panel: 18, pill: 999 } as const;

export const motion = {
  enter: { distancePx: 8, durationMs: 450, staggerMs: 40 },
  press: { scale: 0.97, durationMs: 180 },
  deckHoverLiftPx: 4,
  flip: { durationMs: 900, easing: "cubic-bezier(.2,.75,.2,1)" },
  ritual: { durationMs: 1100, sparks: 6 },
  save: { durationMs: 900 },
  float: { durationMs: 6000 },
  haptic: { flipMs: 12 },
} as const;

export const blur = { day: 18, evening: 20 } as const;

function kebab(s: string) {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** CSS custom properties for one theme, e.g. `--text: #26364A;` */
export function themeCss(name: ThemeName): string {
  return Object.entries(themes[name])
    .map(([k, v]) => `--${kebab(k)}:${v};`)
    .join("");
}

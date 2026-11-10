// Thin-line icons (1.5px stroke) per spec §13. Decorative unless given a title.
type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

/** Four-pointed star from the card back. */
export function Star4({ size = 16, className }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      fill="currentColor"
      stroke="none"
    >
      <path d="M12 1.5c.6 5.4 2.1 8.4 10.5 10.5C14.1 14.1 12.6 17.1 12 22.5 11.4 17.1 9.9 14.1 1.5 12 9.9 9.9 11.4 6.9 12 1.5Z" />
    </svg>
  );
}

export function Lifebuoy({ size = 22, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="m5.6 5.6 3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6" />
    </svg>
  );
}

export function Leaf({ size = 22, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" />
      <path d="M5 19 13 11" />
    </svg>
  );
}

export function DoorClose({ size = 22, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M4 21h16M14 12h.01" />
    </svg>
  );
}

export function Check({ size = 16, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function Globe({ size = 18, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
    </svg>
  );
}

export function Sun({ size = 18, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function Moon({ size = 18, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export function Menu({ size = 22, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 8h16M4 16h16" />
    </svg>
  );
}

export function Close({ size = 22, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function Ornament({ className }: { className?: string }) {
  return (
    <span className={`orn ${className ?? ""}`} aria-hidden="true">
      <span className="orn-line" />
      <Star4 size={12} className="orn-star" />
      <span className="orn-line" />
    </span>
  );
}

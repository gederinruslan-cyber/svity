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

export function Heart({ size = 20, className, filled = false }: P & { filled?: boolean }) {
  return (
    <svg {...base(size)} className={className} fill={filled ? "currentColor" : "none"}>
      <path d="M12 20s-7.5-4.4-7.5-10A4.5 4.5 0 0 1 12 7.6 4.5 4.5 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z" />
    </svg>
  );
}

export function Share({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v6h14v-6" />
    </svg>
  );
}

export function Trash({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10.5 11v5.5M13.5 11v5.5" />
    </svg>
  );
}

export function ChevronLeft({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
    </svg>
  );
}

export function ChevronRight({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </svg>
  );
}

export function Lock({ size = 22, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function Mirror({ size = 22, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <ellipse cx="12" cy="10" rx="6" ry="7.5" />
      <path d="M12 17.5V22M9 22h6M9.5 6.5c-1 1-1.5 2.2-1.5 3.5" />
    </svg>
  );
}

export function Cards({ size = 22, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="8" y="3" width="11" height="16" rx="2" transform="rotate(8 13.5 11)" />
      <rect x="4.5" y="5" width="11" height="16" rx="2" />
    </svg>
  );
}

export function Pen({ size = 22, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

export function Calendar({ size = 22, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function Eye({ size = 22, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

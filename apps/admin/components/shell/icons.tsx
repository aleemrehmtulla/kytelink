import type { ReactElement, ReactNode } from "react";
import type { NavGlyphName } from "../../consts/nav";

export interface GlyphProps {
  className?: string;
}

function Svg({ className, children }: GlyphProps & { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function SearchGlyph({ className }: GlyphProps) {
  return (
    <Svg className={className}>
      <circle cx="7" cy="7" r="4.25" />
      <path d="M10.2 10.2 13.5 13.5" />
    </Svg>
  );
}

export function ChevronDownGlyph({ className }: GlyphProps) {
  return (
    <Svg className={className}>
      <path d="M4 6.5 8 10.5 12 6.5" />
    </Svg>
  );
}

export function SidebarGlyph({ className }: GlyphProps) {
  return (
    <Svg className={className}>
      <rect x="2" y="3" width="12" height="10" rx="2" />
      <path d="M6 3v10" />
    </Svg>
  );
}

export function ExternalGlyph({ className }: GlyphProps) {
  return (
    <Svg className={className}>
      <path d="M9 3h4v4" />
      <path d="M13 3 7.5 8.5" />
      <path d="M11 9.5V12a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 12V6.5A1.5 1.5 0 0 1 4 5h2.5" />
    </Svg>
  );
}

export function BookGlyph({ className }: GlyphProps) {
  return (
    <Svg className={className}>
      <path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h8v12H4a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M12 11.5H4a1.5 1.5 0 0 0-1.5 1.5" />
    </Svg>
  );
}

export function LogOutGlyph({ className }: GlyphProps) {
  return (
    <Svg className={className}>
      <path d="M6.5 13.5H4A1.5 1.5 0 0 1 2.5 12V4A1.5 1.5 0 0 1 4 2.5h2.5" />
      <path d="M10 11l3-3-3-3" />
      <path d="M13 8H6" />
    </Svg>
  );
}

const NAV_GLYPHS: Record<NavGlyphName, (props: GlyphProps) => ReactElement> = {
  gauge: ({ className }) => (
    <Svg className={className}>
      <path d="M2.5 11.5a5.5 5.5 0 1 1 11 0" />
      <path d="M8 11.5 10.5 6.5" />
      <circle cx="8" cy="11.5" r="0.9" />
    </Svg>
  ),
  pulse: ({ className }) => (
    <Svg className={className}>
      <path d="M1.5 8h2.8l1.4-3.5L8 12l1.9-5 1.1 2h2.5" />
    </Svg>
  ),
  chart: ({ className }) => (
    <Svg className={className}>
      <path d="M2 13.5V2.5" />
      <path d="M2 13.5h12" />
      <path d="M4.5 11 7 7l2.5 2.2L13.5 4" />
    </Svg>
  ),
  rocket: ({ className }) => (
    <Svg className={className}>
      <path d="M7 11 5 9c0-4 2.5-6.5 6.5-6.5C11.5 6.5 9 9 5 9z" />
      <path d="M6.2 9.8 2.5 13.5" />
      <path d="M4.4 12.2c-.7.7-.6 1.9-.6 1.9s1.2.1 1.9-.6" />
      <circle cx="9.4" cy="4.6" r="0.9" />
    </Svg>
  ),
  users: ({ className }) => (
    <Svg className={className}>
      <circle cx="6.2" cy="5.6" r="2.4" />
      <path d="M1.8 13.2c0-2.2 2-3.6 4.4-3.6s4.4 1.4 4.4 3.6" />
      <path d="M11 4.1a2.2 2.2 0 0 1 0 4.2" />
      <path d="M12 9.9c1.4.4 2.3 1.5 2.3 3.3" />
    </Svg>
  ),
  orgs: ({ className }) => (
    <Svg className={className}>
      <rect x="2" y="4" width="6" height="9.5" rx="1.2" />
      <rect x="8" y="6.5" width="6" height="7" rx="1.2" />
      <path d="M4.2 6.4h1.6M4.2 8.6h1.6M4.2 10.8h1.6M10.2 9h1.6M10.2 11.2h1.6" />
    </Svg>
  ),
  shield: ({ className }) => (
    <Svg className={className}>
      <path d="M8 2 13 3.8v4.1c0 3-2.1 5.3-5 6.1-2.9-.8-5-3.1-5-6.1V3.8z" />
      <path d="M5.9 8.1 7.4 9.6l2.8-2.9" />
    </Svg>
  ),
  storage: ({ className }) => (
    <Svg className={className}>
      <ellipse cx="8" cy="4" rx="5.2" ry="2" />
      <path d="M2.8 4v8c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2V4" />
      <path d="M2.8 8c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2" />
    </Svg>
  ),
  bell: ({ className }) => (
    <Svg className={className}>
      <path d="M4 7a4 4 0 0 1 8 0c0 2.4.6 3.5 1.2 4.2H2.8C3.4 10.5 4 9.4 4 7z" />
      <path d="M6.5 11.2a1.6 1.6 0 0 0 3 0" />
    </Svg>
  ),
  log: ({ className }) => (
    <Svg className={className}>
      <path d="M3.5 2.5h9v11h-9z" />
      <path d="M5.8 5.5h4.4M5.8 8h4.4M5.8 10.5h2.6" />
    </Svg>
  ),
};

export function NavGlyph({ name, className }: { name: NavGlyphName } & GlyphProps) {
  const Glyph = NAV_GLYPHS[name];
  return <Glyph className={className} />;
}

import type { CSSProperties } from "react";
import type { ThemeExtras } from "@kytelink/ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

// A theme preview is a phone-shaped mini of a real profile page — Kytes only ever
// render on phones, so a tall 9:19 mock reads truer than a square swatch. Every
// pixel is driven by the SAME ThemeExtras the public profile renders from
// (packages/ui), so nothing drifts: background, avatar fill, the text colors
// (name/description), and the link button style (fill, border, radius, blur).
// `background` overrides the theme's own background so a custom-background swatch
// can preview onto the selected theme's other styling.
export function ThemeSwatch({
  extras,
  name,
  selected,
  background,
  size = "sm",
}: {
  extras: ThemeExtras;
  name: string;
  selected: boolean;
  background?: string;
  size?: "sm" | "lg";
}) {
  const large = size === "lg";
  const linkCount = large ? 4 : 3;

  const s = large
    ? {
        frame: "rounded-[16px]",
        pad: "px-3 pt-5 pb-2.5",
        avatar: "size-8",
        name: "mt-2.5 h-[6px] w-1/2",
        desc: "mt-1.5 h-[5px] w-1/3",
        links: "mt-3.5 gap-1.5",
        linkBar: "h-[11px] w-[80%]",
        mark: "h-[3px] w-1/3",
        label: "text-[12px]",
        check: "size-4",
        checkIcon: "size-2.5",
      }
    : {
        frame: "rounded-[13px]",
        pad: "px-2.5 pt-4 pb-2",
        avatar: "size-5",
        name: "mt-2 h-[5px] w-1/2",
        desc: "mt-1 h-[4px] w-1/3",
        links: "mt-3 gap-1.5",
        linkBar: "h-[9px] w-[78%]",
        mark: "h-[3px] w-1/3",
        label: "text-[11px]",
        check: "size-[15px]",
        checkIcon: "size-2.5",
      };

  const avatarStyle: CSSProperties = {
    background: extras.placeholderStripeA,
  };

  const linkStyle: CSSProperties = {
    background: extras.link.background,
    border: extras.link.border,
    backdropFilter: extras.link.backdropFilter,
    WebkitBackdropFilter: extras.link.backdropFilter,
    borderRadius: extras.linkRadius,
  };

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="relative w-full">
        <div
          className={cn(
            // One uniform 2px border does the whole job — its thickness is even at
            // every corner (no padded-ring artifact) and it never animates on a
            // spring. Resting is a near-invisible hairline; selected is accent.
            "flex aspect-[9/19] w-full flex-col items-center overflow-hidden border-2 transition-colors",
            s.frame,
            s.pad,
            selected ? "border-accent" : "border-black/[0.06] hover:border-accent/40",
          )}
          style={{ background: background ?? extras.background }}
        >
          <span className={cn("shrink-0 rounded-full", s.avatar)} style={avatarStyle} />
          <span
            className={cn("shrink-0 rounded-full opacity-90", s.name)}
            style={{ background: extras.nameColor }}
          />
          <span
            className={cn("shrink-0 rounded-full opacity-70", s.desc)}
            style={{ background: extras.descriptionColor }}
          />

          <div className={cn("flex w-full flex-col items-center", s.links)}>
            {Array.from({ length: linkCount }).map((_, i) => (
              <span key={i} className={cn("shrink-0", s.linkBar)} style={linkStyle} />
            ))}
          </div>

          <span
            className={cn("mt-auto shrink-0 rounded-full opacity-70", s.mark)}
            style={{ background: extras.watermarkColor }}
          />
        </div>

        {selected ? (
          <span
            className={cn(
              "bg-accent border-card absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full border-2 text-white",
              s.check,
            )}
          >
            <Check className={s.checkIcon} strokeWidth={3} />
          </span>
        ) : null}
      </div>

      <span
        className={cn(
          s.label,
          selected ? "text-ink font-medium" : "text-tertiary",
        )}
      >
        {name}
      </span>
    </div>
  );
}

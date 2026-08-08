import { forwardRef, useMemo, type CSSProperties } from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/cn";

export const Avatar = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(function Avatar({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn("relative flex size-9 shrink-0 overflow-hidden rounded-full bg-muted", className)}
      {...props}
    />
  );
});

export const AvatarImage = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(function AvatarImage({ className, ...props }, ref) {
  return <AvatarPrimitive.Image ref={ref} className={cn("aspect-square size-full object-cover", className)} {...props} />;
});

function seededHue(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

// Deterministic, on-brand gradient anchored near Kyte violet (262°). The seed
// nudges the hue within a friendly band so every avatar looks designed and
// distinct without drifting into muddy colors.
function gradientFromSeed(seed: string): CSSProperties {
  const base = 210 + (seededHue(seed) % 110);
  const from = `hsl(${base} 70% 58%)`;
  const to = `hsl(${(base + 38) % 360} 72% 47%)`;
  return { backgroundImage: `linear-gradient(135deg, ${from}, ${to})` };
}

function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0]?.[0] ?? "";
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}

export interface AvatarFallbackProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {
  /** When set, renders deterministic on-brand initials + gradient. */
  name?: string | null;
}

export const AvatarFallback = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(function AvatarFallback({ className, name, style, children, ...props }, ref) {
  const seed = (name ?? "").trim();
  const gradient = useMemo(() => (seed ? gradientFromSeed(seed) : null), [seed]);
  const content = children ?? (seed ? initialsFromName(seed) || "K" : null);
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      style={gradient ? { ...gradient, ...style } : style}
      className={cn(
        "flex size-full items-center justify-center text-sm font-semibold",
        gradient ? "text-white" : "bg-muted font-medium text-muted-foreground",
        className,
      )}
      {...props}
    >
      {content}
    </AvatarPrimitive.Fallback>
  );
});

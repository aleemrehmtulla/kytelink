import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type Variant = "primary" | "ghost" | "outline";

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill px-6 py-3 text-sm font-medium transition-colors duration-150 outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:pointer-events-none";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  ghost: "text-secondary hover:bg-tint hover:text-ink",
  outline: "border border-border bg-white text-secondary hover:border-accent hover:text-accent",
};

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  children: ReactNode;
}

export function ButtonLink({ href, variant = "primary", className = "", children, ...rest }: ButtonLinkProps) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}

import type { ReactNode } from "react";
import { Container } from "./container";

export function Section({
  children,
  className = "",
  containerClassName = "",
  as = "section",
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  as?: "section" | "div";
}) {
  const Tag = as;
  return (
    <Tag className={`py-16 sm:py-24 ${className}`}>
      <Container className={containerClassName}>{children}</Container>
    </Tag>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-accent">{children}</p>
  );
}

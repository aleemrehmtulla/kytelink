import type { ReactNode } from "react";
import Link from "next/link";

interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  breadcrumbs?: Breadcrumb[];
}

export function PageHeader({ title, description, action, breadcrumbs }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-1.5">
            <ol className="text-tertiary flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px]">
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 ? (
                    <span className="text-ghost" aria-hidden="true">
                      /
                    </span>
                  ) : null}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-accent cursor-pointer truncate underline-offset-2 hover:underline"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1 className="text-ink text-[22px] font-bold tracking-[-0.02em] break-words">
          {title}
        </h1>
        {description ? (
          <div className="text-secondary mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-relaxed">
            {description}
          </div>
        ) : null}
      </div>
      {action ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{action}</div>
      ) : null}
    </header>
  );
}

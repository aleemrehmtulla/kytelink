import { useState } from "react";
import Link from "next/link";
import { FEATURES } from "../../consts/features";
import { USE_CASES } from "../../consts/use-cases";
import { LOGIN_URL, SIGNUP_URL, GITHUB_REPO_URL, DISCOVER_PATH } from "../../consts/site";
import { trackClickedGetStarted } from "../../lib/beacon";
import { GithubIcon } from "../ui/brand-icons";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="rounded-input text-ink flex h-11 w-11 cursor-pointer items-center justify-center outline-none"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 outline-none"
              aria-label="Kytelink"
            >
              <span className="text-[22px] leading-none" aria-hidden="true">
                🪁
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="rounded-input text-ink flex h-11 w-11 cursor-pointer items-center justify-center outline-none"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-6 overflow-y-auto">
            <div>
              <p className="text-tertiary text-xs font-semibold tracking-[0.06em] uppercase">
                Features
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {FEATURES.map((feature) => (
                  <li key={feature.slug}>
                    <Link
                      href={`/features/${feature.slug}`}
                      onClick={() => setOpen(false)}
                      className="rounded-input text-ink hover:bg-tint block cursor-pointer px-2 py-2.5 text-base"
                    >
                      {feature.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-tertiary text-xs font-semibold tracking-[0.06em] uppercase">
                Use cases
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {USE_CASES.map((useCase) => (
                  <li key={useCase.slug}>
                    <Link
                      href={`/use-cases/${useCase.slug}`}
                      onClick={() => setOpen(false)}
                      className="rounded-input text-ink hover:bg-tint block cursor-pointer px-2 py-2.5 text-base"
                    >
                      {useCase.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-1">
              <Link
                href={DISCOVER_PATH}
                onClick={() => setOpen(false)}
                className="rounded-input text-ink hover:bg-tint block cursor-pointer px-2 py-2.5 text-base font-semibold"
              >
                Discover
              </Link>
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="rounded-input text-ink hover:bg-tint block cursor-pointer px-2 py-2.5 text-base font-semibold"
              >
                Pricing
              </Link>
            </div>
          </nav>

          <div className="border-hairline mt-6 flex flex-col gap-3 border-t pt-6">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="rounded-pill border-border text-secondary hover:text-ink flex cursor-pointer items-center justify-center gap-2 border px-4 py-3 text-center text-sm"
            >
              <GithubIcon width={17} height={17} />
              Star on GitHub
            </a>
            <Link
              href={LOGIN_URL}
              onClick={() => setOpen(false)}
              className="rounded-pill text-secondary hover:bg-tint hover:text-ink cursor-pointer px-4 py-3 text-center text-sm font-medium"
            >
              Log in
            </Link>
            <Link
              href={SIGNUP_URL}
              onClick={() => {
                trackClickedGetStarted("mobile-nav");
                setOpen(false);
              }}
              className="rounded-pill bg-accent hover:bg-accent-hover cursor-pointer px-4 py-3 text-center text-sm font-medium text-white"
            >
              Create yours
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

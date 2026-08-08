import Link from "next/link";
import { FEATURES } from "../../consts/features";
import { USE_CASES, type UseCaseSlug } from "../../consts/use-cases";
import { LOGIN_URL, SIGNUP_URL, GITHUB_REPO_URL } from "../../consts/site";
import { trackClickedGetStarted } from "../../lib/beacon";
import { GithubIcon } from "../ui/brand-icons";
import { PrimaryNav } from "./nav-dropdown";
import { MobileNav } from "./mobile-nav";

const USE_CASE_TAGLINES: Record<UseCaseSlug, string> = {
  creators: "One page for every video, drop, and store.",
  musicians: "Queue releases — your page publishes itself.",
  agencies: "Every client's page from one login.",
};

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <div className="flex flex-1 basis-0 items-center">
          <Link href="/" className="flex items-center gap-2.5 outline-none" aria-label="Kytelink">
            <span className="text-[22px] leading-none" aria-hidden="true">
              🪁
            </span>
          </Link>
        </div>

        <nav className="hidden items-center sm:flex" aria-label="Primary">
          <PrimaryNav
            menus={[
              {
                id: "features",
                label: "Features",
                items: FEATURES.map((feature) => ({
                  label: feature.title,
                  href: `/features/${feature.slug}`,
                  description: feature.tagline,
                })),
              },
              {
                id: "use-cases",
                label: "Use cases",
                items: USE_CASES.map((useCase) => ({
                  label: useCase.title,
                  href: `/use-cases/${useCase.slug}`,
                  description: USE_CASE_TAGLINES[useCase.slug],
                })),
              },
            ]}
            links={[{ id: "pricing", label: "Pricing", href: "/pricing" }]}
          />
        </nav>

        <div className="flex flex-1 basis-0 items-center justify-end gap-3 sm:gap-6">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Kytelink on GitHub"
            className="hidden cursor-pointer items-center text-secondary outline-none transition-colors hover:text-ink sm:flex"
          >
            <GithubIcon width={20} height={20} />
          </a>
          <Link
            href={LOGIN_URL}
            className="hidden cursor-pointer text-sm text-secondary outline-none transition-colors hover:text-ink sm:block"
          >
            Log in
          </Link>
          <Link
            href={SIGNUP_URL}
            onClick={() => trackClickedGetStarted("header")}
            className="hidden cursor-pointer rounded-pill bg-accent px-[18px] py-[9px] text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover sm:block"
          >
            Create yours
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

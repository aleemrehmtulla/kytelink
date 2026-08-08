import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FEATURES } from "../../consts/features";
import { USE_CASES } from "../../consts/use-cases";
import { GITHUB_REPO_URL, ALEEM_TWITTER_URL, SELF_HOSTING_PATH } from "../../consts/site";
import { GithubIcon, XIcon } from "../ui/brand-icons";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: FEATURES.map((feature) => ({
      label: feature.title,
      href: `/features/${feature.slug}`,
    })),
  },
  {
    title: "Use cases",
    links: USE_CASES.map((useCase) => ({
      label: useCase.title,
      href: `/use-cases/${useCase.slug}`,
    })),
  },
  {
    title: "Company",
    links: [
      { label: "Self-hosting", href: SELF_HOSTING_PATH },
      { label: "GitHub", href: GITHUB_REPO_URL, external: true },
      { label: "Report abuse", href: "/report" },
      { label: "Appeal a suspension", href: "/appeal" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms-of-service" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Anti-phishing", href: "/anti-phishing" },
      { label: "Legal hub", href: "/legal" },
    ],
  },
];

function ColumnLink({ link }: { link: FooterLink }) {
  const className =
    "cursor-pointer text-[13px] text-tertiary outline-none transition-colors hover:text-ink";
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer" className={className}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export function SiteFooter() {
  const router = useRouter();

  function scrollToTopIfHome(event: MouseEvent<HTMLAnchorElement>) {
    if (router.pathname !== "/") return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer aria-label="Site footer" className="border-hairline border-t">
      <div className="mx-auto w-full max-w-7xl px-5 pt-12 pb-14 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link
              href="/"
              onClick={scrollToTopIfHome}
              className="flex items-center gap-2.5 outline-none"
              aria-label="Kytelink"
            >
              <span className="text-xl leading-none" aria-hidden="true">
                🪁
              </span>
              <span className="text-ink text-[15px] font-semibold">kytelink</span>
            </Link>
            <p className="text-tertiary mt-3.5 max-w-[220px] text-[13px] leading-relaxed">
              A simple, free, open-source link-in-bio. Made with love and caffeine.
            </p>
            <div className="mt-4 flex gap-4">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Kytelink on GitHub"
                className="text-faint hover:text-ink cursor-pointer transition-colors outline-none"
              >
                <GithubIcon width={17} height={17} />
              </a>
              <a
                href={ALEEM_TWITTER_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Kytelink on X"
                className="text-faint hover:text-ink cursor-pointer transition-colors outline-none"
              >
                <XIcon width={17} height={17} />
              </a>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <div className="text-ink text-xs font-semibold tracking-[0.06em] uppercase">
                {column.title}
              </div>
              {column.links.map((link) => (
                <ColumnLink key={link.label} link={link} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

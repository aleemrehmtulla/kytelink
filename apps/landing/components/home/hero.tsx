import Link from "next/link";
import { Container } from "../ui/container";
import { ProfileDemo } from "./profile-demo";
import { GithubIcon } from "../ui/brand-icons";
import { SIGNUP_URL, GITHUB_REPO_URL } from "../../consts/site";
import { trackClickedGetStarted } from "../../lib/beacon";

const BLURBS = [
  { icon: "🌐", title: "Custom domains", body: "Point your own domain at your page. Free, obviously." },
  { icon: "🎨", title: "12 themes", body: "Minimal looks that stay out of the way of your content." },
  { icon: "📈", title: "Detailed analytics", body: "Page views and link clicks, private to you." },
  { icon: "⚡", title: "Blazing fast", body: "Static, tiny, and cached at the edge." },
];

export function Hero() {
  return (
    <Container className="flex flex-col items-center pb-16 pt-16 sm:pb-24 sm:pt-32">
      <div className="flex flex-col items-center text-center">
        <h1 className="max-w-[820px] text-balance text-[40px] font-bold leading-[1.05] tracking-[-0.035em] text-ink sm:text-6xl lg:text-[72px]">
          A Simple Link-In-Bio.
          <br />
          Free and Opensource.
        </h1>
        <p className="mt-6 max-w-[520px] text-pretty text-[17px] leading-relaxed text-secondary sm:mt-7 sm:text-[19px]">
          A beautiful, minimal link-in-bio. Custom domains, themes, and analytics — with no paywall, no
          branding, no catch.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:mt-11 sm:flex-row sm:gap-4">
          <Link
            href={SIGNUP_URL}
            onClick={() => trackClickedGetStarted("hero")}
            className="inline-flex cursor-pointer items-center justify-center rounded-pill bg-accent px-8 py-4 text-base font-medium text-white shadow-cta outline-none transition-colors hover:bg-accent-hover"
          >
            Create your Kytelink
          </Link>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill border border-border bg-white px-6 py-4 text-base text-secondary outline-none transition-colors hover:border-accent hover:text-accent"
          >
            <GithubIcon width={18} height={18} />
            Star on GitHub
          </a>
        </div>
        <div className="mt-5 text-[13px] text-faint">
          kytelink.com/<span className="text-ink">yourname</span> — claimed in 30 seconds
        </div>
      </div>

      <div className="mt-16 flex w-full max-w-[960px] flex-col items-center gap-10 overflow-hidden rounded-panel bg-hero-wash px-6 pt-12 sm:mt-20 sm:flex-row sm:items-end sm:justify-center sm:gap-12 sm:px-14 sm:pt-14">
        <ProfileDemo />
        <div className="flex flex-col gap-7 pb-12 sm:max-w-[340px] sm:pb-14">
          {BLURBS.map((blurb) => (
            <div key={blurb.title} className="flex items-start gap-3.5">
              <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] border border-border bg-white text-[15px]">
                {blurb.icon}
              </div>
              <div>
                <div className="text-sm font-semibold text-ink">{blurb.title}</div>
                <div className="mt-0.5 text-[13px] leading-normal text-secondary">{blurb.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}

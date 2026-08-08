import Link from "next/link";
import { Container } from "../ui/container";
import { GithubIcon } from "../ui/brand-icons";
import { GITHUB_REPO_URL, SELF_HOSTING_PATH } from "../../consts/site";

export function OpenSourceBand({ stars }: { stars: number }) {
  return (
    <Container className="pb-16 sm:pb-24">
      <div className="mx-auto flex w-full max-w-[960px] flex-col items-center gap-10 rounded-panel bg-dark-bg p-8 sm:p-14 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-[440px]">
          <div className="flex items-center gap-2.5 text-accent-on-dark">
            <GithubIcon width={20} height={20} />
            <span className="text-[13px] font-medium uppercase tracking-[0.04em]">Open source · MIT</span>
          </div>
          <h2 className="mt-4 text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-white sm:text-[34px]">
            Free because it&apos;s yours.
          </h2>
          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-dark-text">
            No plans, no upsells, no lock-in. Read every line of code, self-host it on your own box, or use
            ours — either way it costs nothing.
          </p>
          <div className="mt-7 flex flex-wrap gap-3.5">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex cursor-pointer items-center gap-2 rounded-pill bg-white px-[22px] py-2.5 text-sm font-medium text-dark-bg outline-none transition-opacity hover:opacity-90"
            >
              <GithubIcon width={16} height={16} />
              Star on GitHub{stars > 0 ? ` · ${stars.toLocaleString()}` : ""}
            </a>
            <Link
              href={SELF_HOSTING_PATH}
              className="inline-flex cursor-pointer items-center rounded-pill border border-dark-border-btn px-[18px] py-2.5 text-sm text-dark-text-strong outline-none transition-colors hover:text-white"
            >
              Self-hosting guide
            </Link>
          </div>
        </div>

        <div className="w-full max-w-[340px] rounded-menu border border-dark-border bg-dark-card p-5 font-mono text-[13px] leading-[2] text-dark-text">
          <div className="mb-3 flex gap-1.5" aria-hidden="true">
            <span className="h-[9px] w-[9px] rounded-pill bg-dark-dot" />
            <span className="h-[9px] w-[9px] rounded-pill bg-dark-dot" />
            <span className="h-[9px] w-[9px] rounded-pill bg-dark-dot" />
          </div>
          <div>
            <span className="text-dark-muted">$</span> git clone kytelink/kytelink
          </div>
          <div>
            <span className="text-dark-muted">$</span> pnpm run setup
          </div>
          <div>
            <span className="text-dark-muted">$</span> pnpm dev
          </div>
          <div className="text-accent-on-dark">→ live at localhost:3000 🪁</div>
        </div>
      </div>
    </Container>
  );
}

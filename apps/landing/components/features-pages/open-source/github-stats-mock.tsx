import { ButtonLink } from "../../ui/button-link";
import { GITHUB_REPO_URL } from "../../../consts/site";

export function GithubStatsMock({ stars }: { stars: number }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-cardline bg-card p-8 text-center sm:p-10">
      <span className="text-[28px] font-bold tracking-tight text-ink">
        {stars > 0 ? stars.toLocaleString() : "—"}
      </span>
      <p className="text-[13px] text-tertiary">stars on GitHub</p>
      <ButtonLink href={GITHUB_REPO_URL} variant="outline" target="_blank" rel="noreferrer">
        View the source
      </ButtonLink>
    </div>
  );
}

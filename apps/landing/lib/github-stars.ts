import { GITHUB_OWNER, GITHUB_REPO } from "../consts/site";

const FALLBACK_STARS = 0;

// Fetched at build time only (getStaticProps) — landing ships fully static,
// no runtime data fetching (12-landing.md).
export async function fetchGithubStars(): Promise<number> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return FALLBACK_STARS;
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "stargazers_count" in data &&
      typeof (data as { stargazers_count: unknown }).stargazers_count === "number"
    ) {
      return (data as { stargazers_count: number }).stargazers_count;
    }
    return FALLBACK_STARS;
  } catch {
    return FALLBACK_STARS;
  }
}

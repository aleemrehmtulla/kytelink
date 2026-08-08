export const GITHUB_OWNER = "aleemrehmtulla";
export const GITHUB_REPO = "kytelink";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
export const SELF_HOSTING_PATH = "/self-hosting";
export const ALEEM_TWITTER_URL = "https://twitter.com/aleemrehmtulla";
export const ALEEM_GITHUB_URL = "https://github.com/aleemrehmtulla";

// Absolute links into the web zone — landing never mounts auth screens itself.
// Server-only WEB_BASE_URL isn't reachable from the browser, and in production
// kytelink.com resolves these paths via the multi-zone rewrite either way.
const WEB_BASE_URL =
  process.env.NEXT_PUBLIC_WEB_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://kytelink.com"
    : "http://localhost:3000");
export const SIGNUP_URL = `${WEB_BASE_URL}/signup`;
export const LOGIN_URL = `${WEB_BASE_URL}/login`;

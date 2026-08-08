function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export const API_URL = trimTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3003",
);

export const WEB_APP_URL = trimTrailingSlash(
  process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
);

const LANDING_URL = trimTrailingSlash(
  process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3001",
);

export const WEB_LOGIN_URL = `${WEB_APP_URL}/login`;
export const SELF_HOSTING_URL = `${LANDING_URL}/self-hosting`;

export const BUILD_VERSION: string | null =
  process.env.NEXT_PUBLIC_COMMIT_SHA?.trim().slice(0, 7) || null;

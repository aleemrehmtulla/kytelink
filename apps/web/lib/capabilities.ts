export interface WebCapabilities {
  analytics: boolean;
  uploads: boolean;
  oauthGoogle: boolean;
  oauthGithub: boolean;
  domains: boolean;
}

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

export function getCapabilities(): WebCapabilities {
  return {
    analytics: flag(process.env.NEXT_PUBLIC_CAP_ANALYTICS, true),
    uploads: flag(process.env.NEXT_PUBLIC_CAP_UPLOADS, true),
    oauthGoogle: flag(process.env.NEXT_PUBLIC_CAP_GOOGLE, true),
    oauthGithub: flag(process.env.NEXT_PUBLIC_CAP_GITHUB, true),
    domains: flag(process.env.NEXT_PUBLIC_CAP_DOMAINS, false),
  };
}

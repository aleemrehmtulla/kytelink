import { NextResponse, type NextRequest } from "next/server";
import { prefersMarkdown } from "@kytelink/schemas/markdown-negotiation";
import { MARKETING_ROUTE_PREFIXES, LANDING_ORIGIN } from "./consts/landing-routes";
import { signedInternalGet } from "./lib/api/internal-hmac";
import {
  PRIMARY_HOSTS,
  decideForeignHost,
  isVanityHost,
  normalizeHost,
  type HostLookup,
} from "./lib/host-routing";

function landingZoneUrl(): string {
  return process.env.LANDING_ZONE_URL ?? "http://localhost:3001";
}

function isMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const segment = pathname.split("/")[1] ?? "";
  return MARKETING_ROUTE_PREFIXES.includes(
    segment as (typeof MARKETING_ROUTE_PREFIXES)[number],
  );
}

const hostOwnerCache = new Map<string, string>();

async function resolveHostOwner(host: string): Promise<HostLookup> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_API === "true")
    return { ok: true, username: null };
  try {
    const response = await signedInternalGet(`/internal/domains/${encodeURIComponent(host)}`);
    if (!response.ok) return { ok: false };
    const data = (await response.json()) as { username: string | null };
    return { ok: true, username: data.username };
  } catch {
    return { ok: false };
  }
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, search } = request.nextUrl;

  if (PRIMARY_HOSTS.has(host)) {
    const isAssetPath = pathname.startsWith("/landing-assets");
    if (isMarketingPath(pathname) || isAssetPath) {
      if (!isAssetPath && prefersMarkdown(request.headers.get("accept"))) {
        const markdownTarget = new URL(`${landingZoneUrl()}/api/markdown`);
        markdownTarget.searchParams.set("path", pathname);
        return NextResponse.rewrite(markdownTarget);
      }
      const target = new URL(`${landingZoneUrl()}${pathname}${search}`);
      // The proxying rewrite only works against production builds, where the
      // landing app serves its assets under /landing-assets (next.config.js
      // assetPrefix). In `next dev` the landing HTML references bare /_next/*
      // paths that would resolve against THIS app and white-screen the page —
      // so dev sends the browser to the standalone landing port instead.
      if (process.env.NODE_ENV === "development") {
        return NextResponse.redirect(target);
      }
      return NextResponse.rewrite(target);
    }
    return NextResponse.next();
  }

  // Vanity hosts are a fixed alias set — never hit the owner-lookup API.
  const lookup: HostLookup = isVanityHost(host)
    ? { ok: true, username: null }
    : await resolveHostOwner(host);

  const normHost = normalizeHost(host);
  if (lookup.ok && lookup.username) {
    hostOwnerCache.set(normHost, lookup.username);
  } else if (lookup.ok) {
    hostOwnerCache.delete(normHost);
  }

  const decision = decideForeignHost({
    host,
    isRoot: pathname === "/",
    lookup,
    cachedUsername: hostOwnerCache.get(normHost) ?? null,
  });

  switch (decision.kind) {
    case "serve-path":
      return NextResponse.next();
    case "rewrite-profile":
      return NextResponse.rewrite(new URL(`/${decision.username}`, request.url));
    case "redirect-landing":
    default:
      return NextResponse.redirect(LANDING_ORIGIN);
  }
}

export const config = {
  matcher: [
    // Landing zone assets (/_next/static, /_next/data, fonts) are dotted paths,
    // so they must be matched explicitly — the host-routing matcher below
    // excludes anything with a dot.
    "/landing-assets/:path*",
    "/((?!_next/|api/|t/|p/|edit|login|signup|auth/|invites|account|onboarding|.*\\.).*)",
  ],
};

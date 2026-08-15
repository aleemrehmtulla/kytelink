import Link from "next/link";

export function kytePreviewHref(kyteId: string): string {
  return `/moderation/kytes/${kyteId}/preview`;
}

export interface ViewPageLinkProps {
  kyteId: string;
  username?: string | null;
}

/**
 * The one route that renders a suspended page's real content. Every moderation
 * row carries it, because the public URL of anything in these lists serves a
 * blocked shell — clicking through to the live site tells a reviewer nothing.
 */
export function ViewPageLink({ kyteId, username }: ViewPageLinkProps) {
  return (
    <Link
      href={kytePreviewHref(kyteId)}
      title={username ? `See @${username} as it was published` : "See this page as it was published"}
      className="rounded-pill border-border bg-card text-secondary hover:bg-tint cursor-pointer border px-3 py-1 text-[12px] font-medium"
    >
      View page
    </Link>
  );
}

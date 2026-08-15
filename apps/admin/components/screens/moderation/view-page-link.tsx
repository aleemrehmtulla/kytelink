import { ButtonLink } from "../../ui/button";
import { EyeGlyph } from "../../shell/icons";

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
    <ButtonLink
      href={kytePreviewHref(kyteId)}
      size="sm"
      icon={<EyeGlyph className="h-3.5 w-3.5" />}
      title={
        username
          ? `See @${username} as it was published`
          : "See this page as it was published"
      }
    >
      View page
    </ButtonLink>
  );
}

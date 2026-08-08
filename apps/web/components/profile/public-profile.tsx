import { useEffect } from "react";
// Deep import, not the @kytelink/ui barrel: the barrel re-exports ./motion and
// the six analytics charts, which the public profile never renders but would
// otherwise ship to every visitor.
import { ProfileView } from "@kytelink/ui/profile-view";
import type { Icon, Link, ProfileContent } from "@kytelink/schemas";
import { sendEventBeacon, sendLinkBeacon, sendPageBeacon } from "../../lib/beacons";

export interface PublicProfileProps {
  content: ProfileContent;
  username: string;
  kyteId: string | null;
}

export function PublicProfile({ content, username, kyteId }: PublicProfileProps) {
  useEffect(() => {
    if (!kyteId) return;
    const referrer = typeof document !== "undefined" ? document.referrer : undefined;
    sendPageBeacon({ kyteId, username, referrer });
  }, [kyteId, username]);

  function onLinkClick(link: Link) {
    if (!kyteId) return;
    const referrer = typeof document !== "undefined" ? document.referrer : undefined;
    sendLinkBeacon({ kyteId, username, referrer, linkUrl: link.link, linkTitle: link.title });
  }

  function onIconClick(icon: Icon) {
    if (!kyteId) return;
    const referrer = typeof document !== "undefined" ? document.referrer : undefined;
    sendLinkBeacon({
      kyteId,
      username,
      referrer,
      linkUrl: icon.url ?? "",
      linkTitle: icon.name,
    });
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("[data-kytelink-watermark]")) {
      sendEventBeacon("watermark_click", { username });
    }
  }

  return (
    <div className="relative min-h-screen" onClickCapture={onClickCapture}>
      <ProfileView
        content={content}
        username={username}
        onLinkClick={onLinkClick}
        onIconClick={onIconClick}
      />
    </div>
  );
}

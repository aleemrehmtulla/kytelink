import { getCdnUrl } from "@kytelink/ui";
import { buildFounderProfileContent } from "../../lib/mock-profile-content";

const content = buildFounderProfileContent();
const links = content.links.slice(0, 3);

export function ProfileDemo() {
  return (
    <div className="flex w-[300px] max-w-full flex-col items-center rounded-t-[28px] bg-white px-7 pb-8 pt-10 shadow-[0_-8px_40px_rgba(20,18,40,0.10)]">
      {content.avatar?.url ? (
        <img
          src={getCdnUrl(content.avatar.url)}
          alt=""
          width={78}
          height={78}
          className="h-[78px] w-[78px] rounded-full object-cover"
        />
      ) : (
        <div className="h-[78px] w-[78px] rounded-full bg-accent-soft" />
      )}
      <div className="mt-4 text-center text-[17px] font-semibold text-ink">{content.displayName}</div>
      <div className="mt-1 text-center text-[13px] text-tertiary">{content.description}</div>
      <div className="mt-3 flex w-full flex-col gap-2.5">
        {links.map((link) => (
          <div
            key={link.title}
            className="flex h-11 items-center justify-center rounded-[12px] border border-border bg-white text-[13px] font-medium text-ink"
          >
            {link.title}
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import type { DirectoryEntry } from "@kytelink/schemas";
import { profileUrl } from "../../consts/site";

const AVATAR_SIZE = 72;

// The design system's empty-state avatar: 45° stripes, initials over the top.
// Matches ProfileView's own fallback so a page looks the same here as it does
// when you open it.
const PLACEHOLDER_STRIPES =
  "repeating-linear-gradient(45deg, #E9E7F4, #E9E7F4 7px, #F2F0FA 7px, #F2F0FA 14px)";

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

function Avatar({ entry, eager }: { entry: DirectoryEntry; eager: boolean }) {
  const name = entry.displayName ?? entry.username;

  if (!entry.avatarUrl) {
    return (
      <div
        aria-hidden="true"
        className="rounded-pill text-ghost flex h-[72px] w-[72px] items-center justify-center text-xl font-bold select-none"
        style={{ background: PLACEHOLDER_STRIPES }}
      >
        {initialsOf(name)}
      </div>
    );
  }

  return (
    <img
      src={entry.avatarUrl}
      alt=""
      width={AVATAR_SIZE}
      height={AVATAR_SIZE}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className="rounded-pill bg-tint h-[72px] w-[72px] object-cover"
      style={
        entry.lqipUrl
          ? {
              backgroundImage: `url("${entry.lqipUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    />
  );
}

export function ProfileCard({ entry, eager }: { entry: DirectoryEntry; eager: boolean }) {
  const name = entry.displayName ?? entry.username;

  return (
    <Link
      href={profileUrl(entry.username)}
      className="border-hairline bg-canvas hover:border-accent-border flex h-full cursor-pointer flex-col items-center rounded-[18px] border px-4 py-6 text-center transition-colors outline-none"
    >
      <Avatar entry={entry} eager={eager} />
      <span className="text-ink mt-4 line-clamp-2 text-[15px] leading-snug font-semibold tracking-tight">
        {name}
      </span>
      <span className="text-tertiary mt-1 w-full truncate text-[13px]">
        @{entry.username}
      </span>
    </Link>
  );
}

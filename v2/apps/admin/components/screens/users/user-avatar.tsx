import { personLabel } from "../../../lib/format";

export interface UserAvatarProps {
  name: string | null;
  email: string;
  size?: "sm" | "lg";
}

const SIZE_CLASSES = {
  sm: "h-7 w-7 text-[12px]",
  lg: "h-10 w-10 text-[15px]",
} as const;

export function UserAvatar({ name, email, size = "sm" }: UserAvatarProps) {
  const source = personLabel(name, email);
  const initial = source.length > 0 ? source[0]?.toUpperCase() : "?";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-pill bg-tint font-semibold text-secondary ${SIZE_CLASSES[size]}`}
    >
      {initial}
    </span>
  );
}

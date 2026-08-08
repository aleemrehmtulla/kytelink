import { useApp } from "@/lib/app-context";
import { UserMenu } from "./user-menu";

export function AccountMenu() {
  const { session } = useApp();
  const initial = session?.email?.[0]?.toUpperCase() ?? "K";

  return (
    <UserMenu
      trigger={
        <button
          type="button"
          className="flex size-8 cursor-pointer items-center justify-center rounded-pill bg-accent-soft text-[13px] font-semibold text-accent outline-none transition-opacity hover:opacity-90"
          aria-label="Account menu"
        >
          {initial}
        </button>
      }
    />
  );
}

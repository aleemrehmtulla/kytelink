import { useState } from "react";
import { Dropdown, type DropdownProps } from "../ui/dropdown";
import { useToast } from "../ui/toast";
import { useAdminMe } from "../../hooks/use-admin-me";
import { leaveForLogin, signOutAdmin } from "../../lib/sign-out";
import { BUILD_VERSION, SELF_HOSTING_URL, WEB_APP_URL } from "../../lib/urls";
import { BookGlyph, ChevronDownGlyph, ExternalGlyph, LogOutGlyph } from "./icons";

function initial(name: string | null, email: string): string {
  const source = name?.trim() || email;
  return (source.charAt(0) || "?").toUpperCase();
}

export function AccountMenu() {
  const me = useAdminMe();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function logOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signOutAdmin();
    } catch {
      toast("Couldn't reach sign-out — clearing this session anyway.", {
        tone: "danger",
      });
    }
    leaveForLogin();
  }

  const items: DropdownProps["items"] = [
    {
      key: "identity",
      label: me.name?.trim() || "Admin",
      hint: BUILD_VERSION ? `${me.email} · build ${BUILD_VERSION}` : me.email,
      disabled: true,
      onSelect: () => undefined,
    },
    { key: "sep-1", separator: true },
    {
      key: "app",
      label: "Back to app",
      icon: <ExternalGlyph />,
      onSelect: () => {
        window.location.href = WEB_APP_URL;
      },
    },
    {
      key: "docs",
      label: "Self-hosting docs",
      icon: <BookGlyph />,
      onSelect: () => {
        window.open(SELF_HOSTING_URL, "_blank", "noopener,noreferrer");
      },
    },
    { key: "sep-2", separator: true },
    {
      key: "log-out",
      label: "Log out",
      icon: <LogOutGlyph />,
      tone: "danger",
      disabled: busy,
      onSelect: () => {
        void logOut();
      },
    },
  ];

  return (
    <Dropdown
      align="end"
      label={`Account menu for ${me.email}`}
      items={items}
      trigger={
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="rounded-pill bg-accent-soft text-accent flex h-8 w-8 shrink-0 items-center justify-center text-[13px] font-semibold"
          >
            {initial(me.name, me.email)}
          </span>
          <span className="text-secondary hidden max-w-[180px] truncate text-[13px] sm:inline">
            {me.email}
          </span>
          <ChevronDownGlyph className="text-faint hidden shrink-0 sm:block" />
        </span>
      }
    />
  );
}

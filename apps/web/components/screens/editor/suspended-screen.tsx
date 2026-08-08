import Link from "next/link";
import { useRouter } from "next/router";
import { Lock, LogOut } from "lucide-react";
import { useApp } from "../../../lib/app-context";
import { KyteSwitcher } from "./kyte-switcher";
import { EditorProvider } from "../../../lib/editor/editor-context";
import { SUPPORT_URL } from "../../../consts/brand";
import { appealUrl } from "../../../consts/appeal";
import { Button } from "../../ui/button";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import type { KyteGet, OrgSummary } from "../../../lib/api/types";

export interface SuspendedScreenProps {
  kyte: KyteGet;
  orgs: OrgSummary[];
  onSwitch: (kyteId: string) => void;
}

export function SuspendedScreen({ kyte, orgs, onSwitch }: SuspendedScreenProps) {
  const router = useRouter();
  const { signOut } = useApp();

  return (
    <div className="min-h-dvh overscroll-y-none bg-canvas">
      <header className="flex h-16 items-center justify-between border-b border-hairline bg-card px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/home" className="flex shrink-0 items-center" aria-label="Kytelink">
            <span className="text-[22px] leading-none" aria-hidden>
              🪁
            </span>
          </Link>
          <span className="shrink-0 text-base font-light text-border" aria-hidden>
            /
          </span>
          <EditorProvider orgs={orgs} initialKyte={kyte}>
            <KyteSwitcher onSwitchKyte={onSwitch} />
          </EditorProvider>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded-full outline-none hover:opacity-90" aria-label="Account menu">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {kyte.username?.[0]?.toUpperCase() ?? "K"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              destructive
              onSelect={() => {
                signOut();
                void router.push("/login");
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-card border border-danger-border bg-card p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-[12px] bg-danger-subtle text-danger">
            <Lock className="size-5" />
          </div>
          <h1 className="text-xl font-semibold text-ink">This page is suspended</h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            It broke the Kytelink rules, so it&apos;s offline and locked for editing. Nothing is
            deleted — your links, design, and analytics are all still here.
          </p>
          {kyte.suspensionReason ? (
            <div className="mt-5 rounded-input border border-hairline bg-tint px-4 py-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-tertiary">
                Reason
              </p>
              <p className="mt-1 text-[13px] leading-relaxed break-words text-secondary">
                {kyte.suspensionReason}
              </p>
            </div>
          ) : null}
          <p className="mt-5 text-sm leading-relaxed text-tertiary">
            Think this is a mistake? Appeals are quick — we fix mistakes fast.
          </p>
          <Button variant="accent" size="lg" block asChild className="mt-5">
            <a href={appealUrl("kyte", kyte.username)}>Appeal this suspension</a>
          </Button>
          <p className="mt-4 text-xs text-faint">
            Still stuck?{" "}
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer text-tertiary underline underline-offset-2 outline-none hover:text-ink"
            >
              Contact support
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

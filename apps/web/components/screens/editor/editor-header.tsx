import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ChevronDown,
  Check,
  Copy,
  Eye,
  Rocket,
  RotateCcw,
  Share2,
} from "lucide-react";
import { useApp } from "../../../lib/app-context";
import { useEditor, SAVE_LABELS } from "../../../lib/editor/editor-context";
import { KyteSwitcher } from "./kyte-switcher";
import { SchedulePanel } from "./schedule-panel";
import { PreviewLinkPanel } from "./preview-link-panel";
import { RevertModal } from "./revert-modal";
import { ShareModal } from "./share-modal";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Spinner } from "../../ui/spinner";
import { AccountMenu } from "../../shared/account-menu";
import { publicWebUrl } from "../../../lib/env";
import { useCopied } from "../../../hooks/use-copied";

export interface EditorHeaderProps {
  onSwitchKyte: (kyteId: string) => void;
}

export function EditorHeader({ onSwitchKyte }: EditorHeaderProps) {
  const { api, toast } = useApp();
  const { kyte, draft, saveState, publish, allows } = useEditor();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { copied, copy } = useCopied(1500);

  const canPublish = allows("publish");
  const canSchedule = allows("schedule");
  const dirty = saveState === "dirty";
  const publishing = saveState === "saving";
  const username = kyte.username;
  const publishTitle = canPublish ? undefined : "A manager reviews and ships changes.";

  useEffect(() => {
    let active = true;
    api.schedule
      .list({ kyteId: kyte.id })
      .then((result) => {
        if (active) setPendingCount(result.schedules.filter((s) => s.status === "PENDING").length);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api, kyte.id, scheduleOpen]);

  async function copyUrl() {
    if (!username) return;
    if (await copy(`${publicWebUrl()}/${username}`)) {
      toast("Link copied", "success");
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-hairline bg-card px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link href="/home" className="flex shrink-0 items-center" aria-label="Kytelink">
          <span className="text-[22px] leading-none" aria-hidden>
            🪁
          </span>
        </Link>
        <span className="shrink-0 text-base font-light text-border" aria-hidden>
          /
        </span>
        <KyteSwitcher onSwitchKyte={onSwitchKyte} />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {username ? (
          <button
            type="button"
            onClick={copyUrl}
            title={SAVE_LABELS[saveState]}
            className="hidden items-center gap-2 rounded-pill bg-tint px-3.5 py-1.5 text-[13px] text-secondary transition-colors hover:bg-tint-hover sm:flex"
          >
            <span
              className={cn("size-[7px] rounded-full", dirty ? "bg-faint" : "bg-success")}
              aria-hidden
            />
            kytelink.com/{username}
            {copied ? (
              <Check className="size-3.5 text-success" />
            ) : (
              <Copy className="size-3.5 text-faint" />
            )}
          </button>
        ) : null}

        {username ? (
          <button
            type="button"
            onClick={copyUrl}
            aria-label="Copy profile link"
            className="flex size-8 items-center justify-center rounded-pill bg-tint text-faint transition-colors hover:bg-tint-hover sm:hidden"
          >
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          </button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={publishing}
              aria-busy={publishing || undefined}
              className="relative flex cursor-pointer items-center gap-2 rounded-pill bg-accent px-4 py-2 text-[13px] font-medium text-accent-foreground outline-none transition-colors not-disabled:hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:px-[18px]"
            >
              {publishing ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Spinner size={14} className="border-current/30 border-t-current" />
                </span>
              ) : null}
              <span className={cn("contents", publishing && "invisible")}>
                Publish
                <ChevronDown className="size-3 opacity-75" />
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[248px]">
            <DropdownMenuItem
              disabled={!canPublish || saveState === "saved"}
              title={publishTitle}
              onSelect={() => void publish()}
            >
              <Rocket />
              <span className="flex flex-col">
                <span className="font-medium text-ink">Publish now</span>
                <span className="text-[11px] text-faint">Live in seconds</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canSchedule} onSelect={() => setScheduleOpen(true)}>
              <CalendarClock />
              <span className="flex flex-col">
                <span className="font-medium text-ink">Schedule…</span>
                <span className="text-[11px] text-faint">Pick a date &amp; time</span>
              </span>
              {pendingCount > 0 ? (
                <span className="ml-auto text-xs text-tertiary">{pendingCount}</span>
              ) : null}
            </DropdownMenuItem>
            {kyte.published && allows("edit_draft") ? (
              <DropdownMenuItem disabled={!dirty} onSelect={() => setRevertOpen(true)}>
                <RotateCcw />
                <span className="flex flex-col">
                  <span className="font-medium text-ink">Revert to published</span>
                  <span className="text-[11px] text-faint">Discard draft changes</span>
                </span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            {username ? (
              <DropdownMenuItem onSelect={() => setShareOpen(true)}>
                <Share2 />
                <span className="flex flex-col">
                  <span className="font-medium text-ink">Share link</span>
                  <span className="text-[11px] text-faint">Copy kytelink.com/{username}</span>
                </span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => setPreviewOpen(true)}>
              <Eye />
              <span className="flex flex-col">
                <span className="font-medium text-ink">Preview link</span>
                <span className="text-[11px] text-faint">Share your draft privately</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AccountMenu />
      </div>

      <SchedulePanel open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
      <PreviewLinkPanel open={previewOpen} onClose={() => setPreviewOpen(false)} />
      <RevertModal open={revertOpen} onClose={() => setRevertOpen(false)} />
      {username ? (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          username={username}
          displayName={draft.displayName ?? null}
        />
      ) : null}
    </header>
  );
}

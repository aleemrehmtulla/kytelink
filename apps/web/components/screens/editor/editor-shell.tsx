import { useState } from "react";
import { useRouter } from "next/router";
import { Eye } from "lucide-react";
import { useApp } from "../../../lib/app-context";
import { useEditor } from "../../../lib/editor/editor-context";
import { EditorHeader } from "./editor-header";
import { PreviewFrame } from "./preview-frame";
import { Sheet } from "../../ui/sheet";
import { cn } from "@/lib/cn";
import { EDITOR_TABS, TAB_LABELS, type EditorTab } from "./tabs";
import { LinksTab } from "./tabs/links-tab";
import { DesignTab } from "./tabs/design-tab";
import { SettingsTab } from "./tabs/settings-tab";
import { AnalyticsTab } from "./tabs/analytics-tab";

export interface EditorShellProps {
  tab: EditorTab;
  onSwitchKyte: (kyteId: string) => void;
}

export function EditorShell({ tab, onSwitchKyte }: EditorShellProps) {
  const router = useRouter();
  const { capabilities } = useApp();
  const { allows } = useEditor();
  const [mobilePreview, setMobilePreview] = useState(false);

  const visibleTabs = EDITOR_TABS.filter((candidate) => {
    if (candidate === "analytics") return allows("view_analytics") && capabilities.analytics;
    return true;
  });

  const activeTab = visibleTabs.includes(tab) ? tab : "links";

  function goTo(next: EditorTab) {
    void router.push(`/edit/${next}`, undefined, { shallow: true });
  }

  return (
    <div className="flex min-h-dvh flex-col overscroll-y-none bg-background">
      <EditorHeader onSwitchKyte={onSwitchKyte} />

      <div className="flex min-h-0 flex-1 lg:items-stretch">
        <aside className="hidden shrink-0 border-r border-hairline lg:sticky lg:top-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:w-[480px] lg:items-center lg:justify-center xl:w-[520px]">
          <PreviewFrame />
        </aside>

        <main className="min-w-0 flex-1 px-5 py-7 sm:px-8 sm:py-9 lg:px-12">
          <div className="w-full max-w-[640px]">
            <nav className="flex gap-6 overflow-x-auto border-b border-cardline sm:gap-[30px]">
              {visibleTabs.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => goTo(candidate)}
                  aria-current={candidate === activeTab ? "page" : undefined}
                  className={cn(
                    "-mb-px cursor-pointer whitespace-nowrap border-b-2 px-0.5 pb-[13px] text-sm font-medium outline-none transition-colors",
                    candidate === activeTab
                      ? "border-accent text-ink"
                      : "border-transparent text-tertiary hover:text-ink",
                  )}
                >
                  {TAB_LABELS[candidate]}
                </button>
              ))}
            </nav>

            <div className="pt-7">
              {activeTab === "links" ? <LinksTab /> : null}
              {activeTab === "design" ? <DesignTab /> : null}
              {activeTab === "settings" ? <SettingsTab /> : null}
              {activeTab === "analytics" ? <AnalyticsTab /> : null}
            </div>
          </div>
        </main>
      </div>

      <button
        type="button"
        onClick={() => setMobilePreview(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-pill bg-accent px-5 py-3 text-sm font-medium text-accent-foreground shadow-cta transition-colors hover:bg-accent-hover lg:hidden"
      >
        <Eye className="size-4" />
        Preview
      </button>

      <Sheet open={mobilePreview} onClose={() => setMobilePreview(false)} title="Preview" side="bottom">
        <div className="flex justify-center py-2">
          <PreviewFrame />
        </div>
      </Sheet>
    </div>
  );
}

import { TriangleAlert } from "lucide-react";
import { useEditor } from "../../../lib/editor/editor-context";
import { Button } from "../../ui/button";

export function DraftConflictBanner() {
  const { conflicted, resolvingConflict, resolveConflict } = useEditor();
  if (!conflicted) return null;

  return (
    <div className="sticky top-16 z-20 bg-background">
      <div
        role="status"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-warning/20 bg-warning/10 px-4 py-2 text-[13px] leading-relaxed text-warning"
      >
        <span className="inline-flex items-center gap-2">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">This draft changed somewhere else</span> — maybe another
            tab or a teammate. Load the latest version, or keep yours.
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={() => void resolveConflict("latest")}
            disabled={resolvingConflict}
            className="h-7 bg-warning px-3 text-white not-disabled:hover:bg-warning/90"
          >
            Load latest
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void resolveConflict("mine")}
            loading={resolvingConflict}
            className="h-7 px-3 text-warning not-disabled:hover:bg-warning/15"
          >
            Keep my version
          </Button>
        </span>
      </div>
    </div>
  );
}

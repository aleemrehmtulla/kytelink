import { ProfileView } from "@kytelink/ui";
import { useEditor } from "../../../lib/editor/editor-context";

export function PreviewFrame() {
  const { draft } = useEditor();
  return (
    <div className="mx-auto flex h-[580px] w-[280px] max-w-full flex-col overflow-hidden rounded-[36px] border border-border bg-card shadow-phone">
      <div className="h-full overflow-y-auto overscroll-y-none">
        <ProfileView content={draft} isPreview />
      </div>
    </div>
  );
}

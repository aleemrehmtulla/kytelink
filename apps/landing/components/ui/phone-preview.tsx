import type { ProfileContent, ThemeKey } from "@kytelink/schemas";
import { ProfileView } from "@kytelink/ui";

// A full profile at preview scale needs ~530px of height before the watermark;
// the fixed frame is sized to hold that whole page so nothing is ever clipped.
export function PhonePreview({
  content,
  themeOverride,
}: {
  content: ProfileContent;
  themeOverride?: ThemeKey;
}) {
  return (
    <div className="mx-auto w-[340px] max-w-full overflow-hidden rounded-[32px] border border-border bg-card shadow-phone">
      <div className="h-[548px] overflow-hidden [&_[data-kytelink-watermark]]:hidden">
        <ProfileView content={content} isPreview themeOverride={themeOverride} />
      </div>
    </div>
  );
}

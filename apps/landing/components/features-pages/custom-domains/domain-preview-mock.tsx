import { PhonePreview } from "../../ui/phone-preview";
import { buildCreatorProfileContent } from "../../../lib/mock-profile-content";

const content = buildCreatorProfileContent();

export function DomainPreviewMock() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <figure className="m-0 flex flex-col items-center gap-4">
        <figcaption className="max-w-full truncate rounded-pill bg-tint px-3 py-1.5 font-mono text-xs text-secondary">
          kytelink.com/linky
        </figcaption>
        <PhonePreview content={content} themeOverride="default" />
      </figure>
      <figure className="m-0 flex flex-col items-center gap-4">
        <figcaption className="max-w-full truncate rounded-pill bg-accent-soft px-3 py-1.5 font-mono text-xs text-accent">
          linky.example
        </figcaption>
        <PhonePreview content={content} themeOverride="paper" />
      </figure>
    </div>
  );
}

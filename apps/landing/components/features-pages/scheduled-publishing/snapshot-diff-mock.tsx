import { PhonePreview } from "../../ui/phone-preview";
import { buildMusicianProfileContent } from "../../../lib/mock-profile-content";

const live = buildMusicianProfileContent();
const scheduled = buildMusicianProfileContent({
  links: [
    { title: "Pre-save the album", link: "https://example.com/presave" },
    { title: "Stream “Late Bloom”", link: "https://example.com/late-bloom" },
    { title: "Tour dates", link: "https://example.com/tour" },
  ],
});

export function SnapshotDiffMock() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <figure className="m-0 flex flex-col items-center gap-4">
        <figcaption className="inline-flex items-center gap-2 rounded-pill bg-tint px-3 py-1.5 text-xs font-medium text-secondary">
          <span className="h-1.5 w-1.5 rounded-pill bg-success" aria-hidden="true" />
          Live now
        </figcaption>
        <PhonePreview content={live} />
      </figure>
      <figure className="m-0 flex flex-col items-center gap-4">
        <figcaption className="inline-flex items-center gap-2 rounded-pill bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent">
          <span className="h-1.5 w-1.5 rounded-pill bg-accent" aria-hidden="true" />
          Publishes Aug 5, 12:00 AM
        </figcaption>
        <PhonePreview content={scheduled} />
      </figure>
    </div>
  );
}

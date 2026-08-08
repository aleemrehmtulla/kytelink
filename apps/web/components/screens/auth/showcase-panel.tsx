import { ProfileView } from "@kytelink/ui";
import { emptyProfileContent } from "@kytelink/schemas";

// Sample data only — an illustrated character and placeholder links, never a
// real person or a real page.
const DEMO = {
  ...emptyProfileContent(),
  displayName: "Mr Kyte",
  description: "Example kyte · this is what yours could look like",
  avatar: { url: "characters/kite.svg", lqip: null },
  links: [
    { title: "Latest project", link: "https://example.com", emoji: "🚀" },
    { title: "Newsletter", link: "https://example.com/news", emoji: "📮" },
    { title: "Say hi", link: "mailto:hi@example.com", emoji: "👋" },
  ],
  icons: [{ name: "Twitter" }, { name: "Instagram" }],
};

export function ShowcasePanel() {
  return (
    <div className="relative hidden h-full flex-col items-center justify-center gap-8 overflow-hidden bg-hero-wash p-10 lg:flex">
      <div className="w-[300px] overflow-hidden rounded-[36px] border border-border bg-card shadow-phone">
        <div className="h-[536px] overflow-hidden [&_[data-kytelink-watermark]]:hidden [&>[data-kytelink-profile-view]]:-mt-6">
          <ProfileView content={DEMO} isPreview themeOverride="default" />
        </div>
      </div>
      <p className="max-w-sm text-center text-lg font-medium tracking-tight text-ink text-balance">
        One link for everything you are. Free, open source, and yours.
      </p>
    </div>
  );
}

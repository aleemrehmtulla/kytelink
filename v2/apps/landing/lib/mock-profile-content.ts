import type { ProfileContent } from "@kytelink/schemas";
import { emptyProfileContent } from "@kytelink/schemas";

// Landing demos only — fed into the real <ProfileView> from @kytelink/ui so
// the hero and feature mockups can never drift from the product. Every demo
// except the founder's own uses an illustrated character, never a real person.
const KITE_CHARACTER = "characters/kite.svg";
const GLOBE_CHARACTER = "characters/globe.svg";

function buildProfileContent(overrides: Partial<ProfileContent> = {}): ProfileContent {
  return {
    ...emptyProfileContent(),
    theme: "default",
    icons: [{ name: "Instagram" }, { name: "TikTok" }, { name: "Youtube" }],
    ...overrides,
  };
}

export function buildFounderProfileContent(
  overrides: Partial<ProfileContent> = {},
): ProfileContent {
  return buildProfileContent({
    displayName: "Aleem's Example",
    description: "always building and breaking things",
    avatar: { url: "brand/aleem.png", lqip: null },
    icons: [{ name: "Twitter" }, { name: "Github" }, { name: "Instagram" }],
    links: [
      { title: "aleemrehmtulla.com", link: "https://aleemrehmtulla.com" },
      { title: "kytelink on github", link: "https://github.com/aleemrehmtulla/kytelink" },
      { title: "plz star", link: "https://github.com/aleemrehmtulla/kytelink" },
    ],
    ...overrides,
  });
}

export function buildMusicianProfileContent(
  overrides: Partial<ProfileContent> = {},
): ProfileContent {
  return buildProfileContent({
    displayName: "Mr Kyte",
    description: "Example kyte · new album out now",
    avatar: { url: KITE_CHARACTER, lqip: null },
    icons: [{ name: "Instagram" }, { name: "Youtube" }, { name: "Twitch" }],
    links: [
      { title: "Stream “Late Bloom”", link: "https://example.com/late-bloom" },
      { title: "Tour dates", link: "https://example.com/tour" },
      { title: "Vinyl pre-order", link: "https://example.com/vinyl" },
    ],
    ...overrides,
  });
}

export function buildCreatorProfileContent(
  overrides: Partial<ProfileContent> = {},
): ProfileContent {
  return buildProfileContent({
    displayName: "Linky",
    description: "Example kyte · links, maps, and mixtapes",
    avatar: { url: GLOBE_CHARACTER, lqip: null },
    icons: [{ name: "Twitter" }, { name: "Youtube" }, { name: "Instagram" }],
    links: [
      { title: "Latest video", link: "https://example.com/video" },
      { title: "Newsletter", link: "https://example.com/newsletter" },
      { title: "My gear", link: "https://example.com/gear" },
    ],
    ...overrides,
  });
}

import { z } from "zod";
import { linkSchema } from "./link";
import { iconSchema } from "./icon";
import { themeKeySchema } from "./themes";
import { fontKeySchema } from "./fonts";
import {
  safeWebUrlSchema,
  safeCssColorSchema,
  descriptionSchema,
  displayNameSchema,
  seoDescriptionSchema,
  seoTitleSchema,
} from "./content-policy";

// Hard caps on content collections. These are the real DoS backstop (Phase 4 H3);
// the editor's own MAX_ICONS picker limit (5) is only a client-side nicety.
export const MAX_PROFILE_LINKS = 100;
export const MAX_PROFILE_ICONS = 50;

export const avatarSchema = z
  .object({
    url: z.string(),
    lqip: z.string().nullable(),
  })
  .nullable();

export type Avatar = z.infer<typeof avatarSchema>;

// The ONE definition of a kyte's content. Kyte drafts, PublishedKyte, and
// scheduled-publish snapshots all derive their content fields from this schema
// so the three representations can never drift (03-database.md, 04-organizations.md).
export const profileContentSchema = z.object({
  displayName: displayNameSchema.nullable(),
  description: descriptionSchema.nullable(),
  theme: themeKeySchema,
  customFont: fontKeySchema.nullable(),
  // Any safe CSS color (hex from the picker, or a legacy Chakra token / preset).
  // safeCssColorSchema is a strict superset of the old COLOR_KEYS enum, so every
  // previously stored customColor still validates.
  customColor: safeCssColorSchema.nullable(),
  // Optional solid background layered over the chosen theme's own background.
  // null = use the theme's background. Same safe-color policy as customColor.
  customBackground: safeCssColorSchema.nullable(),
  seoTitle: seoTitleSchema.nullable(),
  seoDescription: seoDescriptionSchema.nullable(),
  redirectUrl: safeWebUrlSchema.nullable(),
  shouldRedirect: z.boolean(),
  // Stored profiles predate the watermark toggle, so absent = shown.
  hideWatermark: z.boolean().default(false),
  // Listing-only opt-out: drops the kyte from /discover and the sitemap, never
  // from the profile page itself. Stored profiles predate it, so absent = listed.
  hideFromDiscover: z.boolean().default(false),
  links: z.array(linkSchema).max(MAX_PROFILE_LINKS),
  icons: z.array(iconSchema).max(MAX_PROFILE_ICONS),
  avatar: avatarSchema,
});

export type ProfileContent = z.infer<typeof profileContentSchema>;

export const PROFILE_CONTENT_FIELDS = Object.keys(
  profileContentSchema.shape,
) as (keyof ProfileContent)[];

// The ONE mapping ProfileContent field -> Prisma content column. `satisfies
// Record<keyof ProfileContent, string>` forces every ProfileContent field to
// appear here, so adding a field breaks compilation until it is mapped. avatar
// is a PROJECTION: ProfileContent.avatar {url,lqip} is resolved from the
// `avatarAssetId` column + its Asset row, not stored 1:1.
export const PROFILE_CONTENT_FIELD_TO_COLUMN = {
  displayName: "displayName",
  description: "description",
  theme: "theme",
  customFont: "customFont",
  customColor: "customColor",
  customBackground: "customBackground",
  seoTitle: "seoTitle",
  seoDescription: "seoDescription",
  redirectUrl: "redirectUrl",
  shouldRedirect: "shouldRedirect",
  hideWatermark: "hideWatermark",
  hideFromDiscover: "hideFromDiscover",
  links: "links",
  icons: "icons",
  avatar: "avatarAssetId",
} as const satisfies Record<keyof ProfileContent, string>;

export type ProfileContentColumn =
  (typeof PROFILE_CONTENT_FIELD_TO_COLUMN)[keyof typeof PROFILE_CONTENT_FIELD_TO_COLUMN];

export const PROFILE_CONTENT_COLUMNS = Object.values(
  PROFILE_CONTENT_FIELD_TO_COLUMN,
) as ProfileContentColumn[];

export function emptyProfileContent(): ProfileContent {
  return {
    displayName: null,
    description: null,
    theme: "default",
    customFont: null,
    customColor: null,
    customBackground: null,
    seoTitle: null,
    seoDescription: null,
    redirectUrl: null,
    shouldRedirect: false,
    hideWatermark: false,
    hideFromDiscover: false,
    links: [],
    icons: [],
    avatar: null,
  };
}

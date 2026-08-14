import {
  type ProfileContent,
  profileContentSchema,
  type ThemeKey,
  themeKeySchema,
} from "@kytelink/schemas";

interface ContentColumns {
  displayName: string | null;
  description: string | null;
  theme: string;
  customFont: string | null;
  customColor: string | null;
  customBackground: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  redirectUrl: string | null;
  shouldRedirect: boolean;
  hideWatermark: boolean;
  hideFromDiscover: boolean;
  links: unknown;
  icons: unknown;
}

function safeTheme(theme: string): ThemeKey {
  const parsed = themeKeySchema.safeParse(theme);
  return parsed.success ? parsed.data : "default";
}

export function columnsToContent(row: ContentColumns): ProfileContent {
  const candidate = {
    displayName: row.displayName,
    description: row.description,
    theme: safeTheme(row.theme),
    customFont: row.customFont,
    customColor: row.customColor,
    customBackground: row.customBackground,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    redirectUrl: row.redirectUrl,
    shouldRedirect: row.shouldRedirect,
    hideWatermark: row.hideWatermark,
    hideFromDiscover: row.hideFromDiscover,
    links: Array.isArray(row.links) ? row.links : [],
    icons: Array.isArray(row.icons) ? row.icons : [],
    avatar: null,
  };
  const parsed = profileContentSchema.safeParse(candidate);
  return parsed.success ? parsed.data : profileContentSchema.parse({ ...candidate, links: [], icons: [] });
}

export function contentToColumns(content: ProfileContent): {
  displayName: string | null;
  description: string | null;
  theme: string;
  customFont: string | null;
  customColor: string | null;
  customBackground: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  redirectUrl: string | null;
  shouldRedirect: boolean;
  hideWatermark: boolean;
  hideFromDiscover: boolean;
  links: ProfileContent["links"];
  icons: ProfileContent["icons"];
} {
  return {
    displayName: content.displayName,
    description: content.description,
    theme: content.theme,
    customFont: content.customFont,
    customColor: content.customColor,
    customBackground: content.customBackground,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
    redirectUrl: content.redirectUrl,
    shouldRedirect: content.shouldRedirect,
    hideWatermark: content.hideWatermark,
    hideFromDiscover: content.hideFromDiscover,
    links: content.links,
    icons: content.icons,
  };
}

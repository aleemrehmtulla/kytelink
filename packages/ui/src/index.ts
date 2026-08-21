export { ProfileView, type ProfileViewProps } from "./components/profile-view";

export { ErrorPage, type ErrorPageProps } from "./components/error-page";

export { THEME_EXTRAS, type ThemeExtras } from "./theme-extras";

export { StatTile, type StatTileProps } from "./components/charts/stat-tile";
export {
  TimeSeriesChart,
  type TimeSeriesChartProps,
  type TimeSeriesPoint,
} from "./components/charts/time-series-chart";
export {
  TopLinksBarList,
  type TopLinkDatum,
  type TopLinksBarListProps,
} from "./components/charts/top-links-bar-list";
export {
  ReferrersList,
  type ReferrerDatum,
  type ReferrersListProps,
} from "./components/charts/referrers-list";
export {
  DeviceSplit,
  type DeviceDatum,
  type DeviceSplitProps,
} from "./components/charts/device-split";
export {
  CountrySplit,
  type CountryDatum,
  type CountrySplitProps,
} from "./components/charts/country-split";

export * from "./motion";
export {
  buildProfileSeo,
  defaultSeoConfig,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_REPO_URL,
  KYTELINK_ORIGIN,
  type ProfileSeoInput,
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_TITLE,
  SEO_TITLE_TEMPLATE,
} from "./seo";

export {
  ACCENT,
  BRAND_TAGLINE,
  CHART_NEUTRAL,
  CHART_SERIES_COLORS,
  NEUTRAL,
  RADIUS,
  STATUS,
} from "./tokens";

export { getCdnUrl, getLqipUrl } from "@kytelink/cdn";

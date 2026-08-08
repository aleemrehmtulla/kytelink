import type {
  CountryDatum,
  DeviceDatum,
  ReferrerDatum,
  TimeSeriesPoint,
  TopLinkDatum,
} from "@kytelink/ui";

// Mock data fed into the real @kytelink/ui chart components the editor's
// Analytics tab renders, so the marketing screenshots can never drift.
export const MOCK_TIME_SERIES: TimeSeriesPoint[] = [
  { date: "Mon", views: 412 },
  { date: "Tue", views: 388 },
  { date: "Wed", views: 501 },
  { date: "Thu", views: 476 },
  { date: "Fri", views: 612 },
  { date: "Sat", views: 803 },
  { date: "Sun", views: 745 },
];

export const MOCK_TOP_LINKS: TopLinkDatum[] = [
  { linkUrl: "https://example.com/single", linkTitle: "Listen to the new single", clicks: 892 },
  { linkUrl: "https://example.com/tour", linkTitle: "Tour dates", clicks: 611 },
  { linkUrl: "https://example.com/merch", linkTitle: "Merch store", clicks: 347 },
  { linkUrl: "https://example.com/list", linkTitle: "Join the mailing list", clicks: 129 },
];

export const MOCK_REFERRERS: ReferrerDatum[] = [
  { refDomain: "instagram.com", views: 1204 },
  { refDomain: "tiktok.com", views: 968 },
  { refDomain: "", views: 511 },
  { refDomain: "twitter.com", views: 289 },
];

export const MOCK_DEVICES: DeviceDatum[] = [
  { device: "MOBILE", views: 2380 },
  { device: "DESKTOP", views: 512 },
  { device: "TABLET", views: 96 },
];

export const MOCK_COUNTRIES: CountryDatum[] = [
  { country: "US", views: 1340 },
  { country: "GB", views: 402 },
  { country: "CA", views: 318 },
  { country: "DE", views: 190 },
  { country: "IN", views: 154 },
];

export const MOCK_STATS = {
  totalViews: { label: "Profile views", value: "3,988", delta: 18, hint: "last 7 days" },
  linkClicks: { label: "Link clicks", value: "1,979", delta: 9, hint: "last 7 days" },
  clickRate: { label: "Click-through rate", value: "49.6%", delta: 3, hint: "last 7 days" },
  uniqueVisitors: { label: "Unique visitors", value: "2,614", delta: 12, hint: "last 7 days" },
};

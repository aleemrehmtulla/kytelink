import type { DeviceType } from "@kytelink/schemas";

export interface AnalyticsWindow {
  kyteId: string;
  days: number;
}

export interface OverviewResult {
  totalViews: number;
  totalClicks: number;
}

export interface TimeSeriesPoint {
  date: string;
  views: number;
}

export interface TopLinkRow {
  linkUrl: string;
  linkTitle: string;
  clicks: number;
}

export interface ReferrerRow {
  refDomain: string;
  views: number;
}

export interface DeviceRow {
  device: DeviceType;
  views: number;
}

export interface CountryRow {
  country: string;
  views: number;
}

export interface PlatformSeriesPoint {
  date: string;
  views: number;
  clicks: number;
  uniqKytes: number;
}

export interface PlatformWindow {
  days: number;
}

export interface TopKytesArgs {
  days: number;
  limit: number;
}

export interface TopKyteRow {
  kyteId: string;
  views: number;
}

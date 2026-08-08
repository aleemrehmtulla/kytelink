import type { DeviceType, ProductEvent } from "@kytelink/schemas";

export type BotFlag = 0 | 1;

export interface PageHitRow {
  ts: string;
  kyte_id: string;
  username: string;
  referrer: string;
  ref_domain: string;
  country: string;
  device: DeviceType;
  ip_hash: string;
  is_bot: BotFlag;
}

export interface LinkHitRow extends PageHitRow {
  link_url: string;
  link_title: string;
}

export interface ProductEventRow {
  ts: string;
  event: ProductEvent;
  user_id: string;
  kyte_id: string;
  anonymous_id: string;
  properties: string;
}

export function formatClickhouseTimestamp(date: Date): string {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 23)}`;
}

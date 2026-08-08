import { z } from "zod";

export const ASSET_KINDS = ["AVATAR", "LINK_IMAGE", "OG_IMAGE"] as const;
export const assetKindSchema = z.enum(ASSET_KINDS);
export type AssetKind = (typeof ASSET_KINDS)[number];

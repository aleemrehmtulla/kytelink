import { z } from "zod";
import { FONT_KEYS } from "./fonts-data";

export * from "./fonts-data";

export const fontKeySchema = z.enum(FONT_KEYS);

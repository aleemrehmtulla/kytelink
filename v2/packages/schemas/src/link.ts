import { z } from "zod";
import {
  linkEmojiSchema,
  linkTitleSchema,
  safeCssColorSchema,
  safeWebUrlSchema,
} from "./content-policy";

export const linkSchema = z.object({
  title: linkTitleSchema,
  link: safeWebUrlSchema,
  emoji: linkEmojiSchema.optional(),
  color: safeCssColorSchema.optional(),
});

export type Link = z.infer<typeof linkSchema>;

export * from "./link-data";

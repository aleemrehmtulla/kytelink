import { z } from "zod";
import { linkSchema } from "./link";
import { iconSchema } from "./icon";
import { safeWebUrlSchema, MAX_DESCRIPTION_LENGTH, MAX_DISPLAY_NAME_LENGTH } from "./content-policy";

export const IMPORT_MAX_LINKS = 50;

export const importProposalSchema = z.object({
  displayName: z.string().max(MAX_DISPLAY_NAME_LENGTH).optional(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  avatarUrl: safeWebUrlSchema.optional(),
  links: z.array(linkSchema).max(IMPORT_MAX_LINKS),
  icons: z.array(iconSchema),
});

export type ImportProposal = z.infer<typeof importProposalSchema>;

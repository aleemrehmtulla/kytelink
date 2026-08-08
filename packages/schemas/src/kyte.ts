import { z } from "zod";
import { themeKeySchema } from "./themes";
import { usernameSchema } from "./username";
import { MAX_DISPLAY_NAME_LENGTH } from "./content-policy";

export const kyteSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  username: usernameSchema.nullable(),
  displayName: z.string().max(MAX_DISPLAY_NAME_LENGTH).nullable(),
  theme: themeKeySchema,
  published: z.boolean(),
});

export type Kyte = z.infer<typeof kyteSchema>;

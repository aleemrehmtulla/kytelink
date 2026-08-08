import { z } from "zod";

export * from "./icon-data";

export const iconSchema = z.object({
  name: z.string(),
  url: z.string().nullish(),
});

export type Icon = z.infer<typeof iconSchema>;

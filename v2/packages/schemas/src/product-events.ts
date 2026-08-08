import { z } from "zod";

export const PRODUCT_EVENTS = [
  "signup_completed",
  "login",
  "onboarding_step_1",
  "onboarding_step_2",
  "onboarding_step_3",
  "onboarding_step_4",
  "onboarding_skipped_links",
  "signup_to_live_ms",
  "kyte_created",
  "profile_published",
  "publish_scheduled",
  "link_added",
  "links_imported",
  "avatar_updated",
  "username_updated",
  "invite_sent",
  "invite_accepted",
  "limit_hit",
  "watermark_click",
  "hit_landing",
  "hit_auth",
  "hit_edit",
  "clicked_get_started",
] as const;

export const productEventSchema = z.enum(PRODUCT_EVENTS);
export type ProductEvent = (typeof PRODUCT_EVENTS)[number];

const emptyProps = z.object({}).strict();

// Where a "Create yours" button was pressed. A closed set, because the whole
// point is comparing one CTA placement against another — a free-form string
// would fragment the same button across spellings.
export const GET_STARTED_SURFACES = [
  "header",
  "mobile-nav",
  "hero",
  "cta-band",
  "feature-hero",
  "use-case-hero",
  "pricing",
] as const;

export const getStartedSurfaceSchema = z.enum(GET_STARTED_SURFACES);
export type GetStartedSurface = (typeof GET_STARTED_SURFACES)[number];

export const productEventPropsSchemas = {
  signup_completed: z.object({ ref: z.string().optional() }),
  login: emptyProps,
  onboarding_step_1: emptyProps,
  onboarding_step_2: emptyProps,
  onboarding_step_3: emptyProps,
  onboarding_step_4: emptyProps,
  onboarding_skipped_links: emptyProps,
  signup_to_live_ms: z.object({ ms: z.number().nonnegative() }),
  kyte_created: emptyProps,
  profile_published: emptyProps,
  publish_scheduled: z.object({ scheduledFor: z.string() }),
  link_added: emptyProps,
  links_imported: z.object({ source: z.string(), count: z.number().int().nonnegative() }),
  avatar_updated: emptyProps,
  username_updated: emptyProps,
  invite_sent: emptyProps,
  invite_accepted: emptyProps,
  limit_hit: z.object({ limit: z.string() }),
  watermark_click: z.object({ username: z.string() }),
  hit_landing: z.object({ path: z.string().max(200).optional(), ref: z.string().optional() }),
  hit_auth: emptyProps,
  hit_edit: emptyProps,
  clicked_get_started: z.object({ surface: getStartedSurfaceSchema.optional() }),
} satisfies Record<ProductEvent, z.ZodType>;

export type ProductEventProps<E extends ProductEvent> = z.input<
  (typeof productEventPropsSchemas)[E]
>;

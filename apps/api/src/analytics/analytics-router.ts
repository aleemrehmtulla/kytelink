import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type Redis from "ioredis";
import { deviceTypeSchema } from "@kytelink/schemas";
import { featureDisabled, router } from "@kytelink/trpc";
import type { Clickhouse } from "@kytelink/clickhouse";
import type { KyteEnvContext } from "../trpc/context-ext";
import { kyte } from "../trpc/procedures";
import { assertCan } from "../trpc/permissions";
import { analyticsWindowInput } from "../routers/shapes";
import { analyticsQueryCacheKey, withQueryCache } from "./query-cache";

function requireKyteId(kyteRowId: string | undefined): string {
  if (!kyteRowId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Kyte not found." });
  }
  return kyteRowId;
}

/**
 * When analytics is off the ClickHouse client is a Noop that silently returns
 * zeros; surface FEATURE_DISABLED instead so the client renders the disabled
 * state, consistent with the admin + assets routers (SH4).
 */
function assertAnalyticsEnabled(ctx: KyteEnvContext): void {
  assertCan(ctx.access.effectiveRole, "view_analytics");
  if (!ctx.config.capabilities.analytics) throw featureDisabled("Analytics is disabled.");
}

async function cachedQuery<T>(
  redis: Pick<Redis, "get" | "set">,
  kyteId: string,
  query: string,
  args: unknown,
  compute: () => Promise<T>,
): Promise<T> {
  const key = analyticsQueryCacheKey(kyteId, query, args);
  return withQueryCache(redis, key, compute);
}

export interface AnalyticsRouterDeps {
  redis: Pick<Redis, "get" | "set">;
}

export function createAnalyticsRouter(deps: AnalyticsRouterDeps) {
  return router({
    overview: kyte
      .input(analyticsWindowInput)
      .output(z.object({ totalViews: z.number(), totalClicks: z.number() }))
      .query(({ ctx, input }) => {
        assertAnalyticsEnabled(ctx);
        const kyteId = requireKyteId(ctx.access.kyte?.id);
        const ch: Clickhouse = ctx.ch;
        return cachedQuery(deps.redis, kyteId, "overview", input, () => ch.overview({ kyteId, days: input.days }));
      }),

    timeSeries: kyte
      .input(analyticsWindowInput)
      .output(z.object({ points: z.array(z.object({ date: z.string(), views: z.number() })) }))
      .query(async ({ ctx, input }) => {
        assertAnalyticsEnabled(ctx);
        const kyteId = requireKyteId(ctx.access.kyte?.id);
        const ch: Clickhouse = ctx.ch;
        const points = await cachedQuery(deps.redis, kyteId, "timeSeries", input, () =>
          ch.timeSeries({ kyteId, days: input.days }),
        );
        return { points };
      }),

    topLinks: kyte
      .input(analyticsWindowInput)
      .output(
        z.object({
          links: z.array(z.object({ linkUrl: z.string(), linkTitle: z.string(), clicks: z.number() })),
        }),
      )
      .query(async ({ ctx, input }) => {
        assertAnalyticsEnabled(ctx);
        const kyteId = requireKyteId(ctx.access.kyte?.id);
        const ch: Clickhouse = ctx.ch;
        const links = await cachedQuery(deps.redis, kyteId, "topLinks", input, () =>
          ch.topLinks({ kyteId, days: input.days }),
        );
        return { links };
      }),

    referrers: kyte
      .input(analyticsWindowInput)
      .output(z.object({ referrers: z.array(z.object({ refDomain: z.string(), views: z.number() })) }))
      .query(async ({ ctx, input }) => {
        assertAnalyticsEnabled(ctx);
        const kyteId = requireKyteId(ctx.access.kyte?.id);
        const ch: Clickhouse = ctx.ch;
        const referrers = await cachedQuery(deps.redis, kyteId, "referrers", input, () =>
          ch.referrers({ kyteId, days: input.days }),
        );
        return { referrers };
      }),

    devices: kyte
      .input(analyticsWindowInput)
      .output(z.object({ devices: z.array(z.object({ device: deviceTypeSchema, views: z.number() })) }))
      .query(async ({ ctx, input }) => {
        assertAnalyticsEnabled(ctx);
        const kyteId = requireKyteId(ctx.access.kyte?.id);
        const ch: Clickhouse = ctx.ch;
        const devices = await cachedQuery(deps.redis, kyteId, "devices", input, () =>
          ch.devices({ kyteId, days: input.days }),
        );
        return { devices };
      }),

    countries: kyte
      .input(analyticsWindowInput)
      .output(z.object({ countries: z.array(z.object({ country: z.string(), views: z.number() })) }))
      .query(async ({ ctx, input }) => {
        assertAnalyticsEnabled(ctx);
        const kyteId = requireKyteId(ctx.access.kyte?.id);
        const ch: Clickhouse = ctx.ch;
        const countries = await cachedQuery(deps.redis, kyteId, "countries", input, () =>
          ch.countries({ kyteId, days: input.days }),
        );
        return { countries };
      }),
  });
}

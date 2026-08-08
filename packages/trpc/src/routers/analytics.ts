import { z } from "zod";
import { deviceTypeSchema } from "@kytelink/schemas";
import { kyteProcedure, router } from "../trpc";
import { notImplemented } from "../errors";
import { analyticsWindowInput } from "../shapes";

export const analyticsRouter = router({
  overview: kyteProcedure
    .input(analyticsWindowInput)
    .output(z.object({ totalViews: z.number(), totalClicks: z.number() }))
    .query(() => {
      throw notImplemented("analytics.overview");
    }),

  timeSeries: kyteProcedure
    .input(analyticsWindowInput)
    .output(
      z.object({ points: z.array(z.object({ date: z.string(), views: z.number() })) }),
    )
    .query(() => {
      throw notImplemented("analytics.timeSeries");
    }),

  topLinks: kyteProcedure
    .input(analyticsWindowInput)
    .output(
      z.object({
        links: z.array(
          z.object({ linkUrl: z.string(), linkTitle: z.string(), clicks: z.number() }),
        ),
      }),
    )
    .query(() => {
      throw notImplemented("analytics.topLinks");
    }),

  referrers: kyteProcedure
    .input(analyticsWindowInput)
    .output(
      z.object({
        referrers: z.array(z.object({ refDomain: z.string(), views: z.number() })),
      }),
    )
    .query(() => {
      throw notImplemented("analytics.referrers");
    }),

  devices: kyteProcedure
    .input(analyticsWindowInput)
    .output(
      z.object({ devices: z.array(z.object({ device: deviceTypeSchema, views: z.number() })) }),
    )
    .query(() => {
      throw notImplemented("analytics.devices");
    }),

  countries: kyteProcedure
    .input(analyticsWindowInput)
    .output(
      z.object({ countries: z.array(z.object({ country: z.string(), views: z.number() })) }),
    )
    .query(() => {
      throw notImplemented("analytics.countries");
    }),
});

import { z } from "zod";
import {
  isScheduleLeadValid,
  profileContentSchema,
  schedulePublishInputSchema,
  scheduleStatusSchema,
} from "@kytelink/schemas";
import { router } from "@kytelink/trpc";
import { TRPCError } from "@trpc/server";
import { kyte } from "../trpc/procedures";
import { assertCan } from "../trpc/permissions";
import { assertCountLimit } from "../trpc/limits";
import { assertRedirectDoesNotLoop } from "../trpc/redirect-loop";
import { kyteIdInput, okSchema } from "./shapes";

const scheduleSchema = z.object({
  id: z.string(),
  kyteId: z.string(),
  scheduledFor: z.string(),
  timezone: z.string(),
  status: scheduleStatusSchema,
  snapshot: profileContentSchema,
  createdAt: z.string(),
});

export const scheduleRouter = router({
  list: kyte
    .input(kyteIdInput)
    .output(z.object({ schedules: z.array(scheduleSchema) }))
    .query(async ({ ctx }) => {
      assertCan(ctx.access.effectiveRole, "view_editor");
      const k = ctx.access.kyte!;
      const schedules = (await ctx.store.listSchedules(k.id)).map((s) => ({
        id: s.id,
        kyteId: s.kyteId,
        scheduledFor: s.scheduledFor.toISOString(),
        timezone: s.timezone,
        status: s.status,
        snapshot: s.snapshot,
        createdAt: s.createdAt.toISOString(),
      }));
      return { schedules };
    }),

  create: kyte
    .input(kyteIdInput.and(schedulePublishInputSchema))
    .output(z.object({ scheduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.effectiveRole, "schedule");
      const k = ctx.access.kyte!;
      if (!isScheduleLeadValid(input.scheduledFor)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Scheduled time is outside the allowed window." });
      }
      const pending = await ctx.store.countPendingSchedules(k.id);
      assertCountLimit(pending, ctx.access.org, "schedulesPerKyte");
      await assertRedirectDoesNotLoop(ctx.store, k, k.draft);
      return ctx.store.createSchedule({
        kyteId: k.id,
        scheduledFor: input.scheduledFor,
        timezone: input.timezone,
        snapshot: structuredClone(k.draft),
        actorUserId: ctx.user.id,
      });
    }),

  updateSnapshot: kyte
    .input(z.object({ scheduleId: z.string().min(1) }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.effectiveRole, "schedule");
      const k = ctx.access.kyte!;
      const schedule = await ctx.store.getSchedule(input.scheduleId);
      if (schedule && schedule.kyteId === k.id && schedule.status === "PENDING") {
        await assertRedirectDoesNotLoop(ctx.store, k, k.draft);
        await ctx.store.refreshScheduleSnapshot(schedule.id, structuredClone(k.draft));
      }
      return { ok: true } as const;
    }),

  reschedule: kyte
    .input(z.object({ scheduleId: z.string().min(1) }).and(schedulePublishInputSchema))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.effectiveRole, "schedule");
      const k = ctx.access.kyte!;
      const schedule = await ctx.store.getSchedule(input.scheduleId);
      if (!schedule || schedule.kyteId !== k.id || schedule.status !== "PENDING") {
        return { ok: true } as const;
      }
      if (!isScheduleLeadValid(input.scheduledFor)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Scheduled time is outside the allowed window." });
      }
      await ctx.store.reschedule(schedule.id, input.scheduledFor, input.timezone);
      return { ok: true } as const;
    }),

  cancel: kyte
    .input(z.object({ scheduleId: z.string().min(1) }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.effectiveRole, "cancel_schedule");
      const k = ctx.access.kyte!;
      const schedule = await ctx.store.getSchedule(input.scheduleId);
      if (schedule && schedule.kyteId === k.id) {
        await ctx.store.cancelSchedule({ scheduleId: schedule.id, actorUserId: ctx.user.id });
      }
      return { ok: true } as const;
    }),
});

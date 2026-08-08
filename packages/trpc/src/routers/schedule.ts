import { z } from "zod";
import {
  profileContentSchema,
  schedulePublishInputSchema,
  scheduleStatusSchema,
} from "@kytelink/schemas";
import { kyteProcedure, router } from "../trpc";
import { notImplemented } from "../errors";
import { kyteIdInput, okSchema } from "../shapes";

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
  list: kyteProcedure
    .input(kyteIdInput)
    .output(z.object({ schedules: z.array(scheduleSchema) }))
    .query(() => {
      throw notImplemented("schedule.list");
    }),

  create: kyteProcedure
    .input(kyteIdInput.and(schedulePublishInputSchema))
    .output(z.object({ scheduleId: z.string() }))
    .mutation(() => {
      throw notImplemented("schedule.create");
    }),

  updateSnapshot: kyteProcedure
    .input(z.object({ scheduleId: z.string().min(1) }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("schedule.updateSnapshot");
    }),

  reschedule: kyteProcedure
    .input(z.object({ scheduleId: z.string().min(1) }).and(schedulePublishInputSchema))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("schedule.reschedule");
    }),

  cancel: kyteProcedure
    .input(z.object({ scheduleId: z.string().min(1) }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("schedule.cancel");
    }),
});

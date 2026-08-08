import type { ScheduleStatus } from "@kytelink/schemas";
import { NEUTRAL, STATUS } from "@kytelink/ui";

const STATUS_COLOR: Record<ScheduleStatus, string> = {
  PENDING: STATUS.warning,
  PUBLISHED: STATUS.success,
  CANCELED: NEUTRAL[400],
  FAILED: STATUS.danger,
};

const SCHEDULE: { title: string; when: string; status: ScheduleStatus }[] = [
  { title: "“Late Bloom” single", when: "Aug 1, 12:00 AM EST", status: "PUBLISHED" },
  { title: "Full album — “Static Season”", when: "Aug 5, 12:00 AM EST", status: "PENDING" },
  { title: "Tour dates update", when: "Aug 12, 9:00 AM EST", status: "PENDING" },
];

export function ScheduleTimelineMock() {
  return (
    <div className="rounded-card border border-cardline bg-card p-5 sm:p-6">
      <h3 className="text-[13px] font-semibold text-ink">Upcoming publishes</h3>
      <ol className="mt-5 flex flex-col gap-4">
        {SCHEDULE.map((item) => (
          <li
            key={item.title}
            className="flex items-start gap-3 rounded-input border border-hairline bg-canvas px-4 py-3"
          >
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-pill"
              style={{ backgroundColor: STATUS_COLOR[item.status] }}
              aria-hidden="true"
            />
            <div>
              <p className="text-[13px] font-semibold text-ink">{item.title}</p>
              <p className="mt-0.5 text-xs text-tertiary">
                {item.when} · {item.status === "PUBLISHED" ? "Went live" : "Scheduled"}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

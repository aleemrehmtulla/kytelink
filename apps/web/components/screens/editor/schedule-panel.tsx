import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ProfileView } from "@kytelink/ui";
import { classifyScheduleLead, type ScheduleLead } from "@kytelink/schemas";
import { useApp } from "../../../lib/app-context";
import { useEditor } from "../../../lib/editor/editor-context";
import { sendEventBeacon } from "../../../lib/beacons";
import { Modal } from "../../ui/modal";
import { Button } from "../../ui/button";
import type { ScheduleSummary } from "../../../lib/api/types";

function formatWhen(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

const CONFIRM_COPY: Record<"past" | "too-soon", string> = {
  past: "That time has already passed.",
  "too-soon": "That's less than 5 minutes from now.",
};

export function SchedulePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { api, toast, handleError } = useApp();
  const { kyte, publish, saveState } = useEditor();
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmNow, setConfirmNow] = useState<"past" | "too-soon" | null>(null);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const publishing = saveState === "saving";

  const load = useCallback(async () => {
    const result = await api.schedule.list({ kyteId: kyte.id });
    setSchedules(result.schedules.filter((schedule) => schedule.status === "PENDING"));
  }, [api, kyte.id]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmNow(null);
    void load();
  }, [open, load]);

  function changeWhen(next: string) {
    setWhen(next);
    setError(null);
    setConfirmNow(null);
  }

  // A time in the past isn't an error, it's an instruction: the user wants this
  // live. Ask once, then publish — never bounce them off a validation message.
  async function submit() {
    if (!when) return;
    const at = new Date(when);
    if (Number.isNaN(at.getTime())) {
      setError("Pick a date and time.");
      return;
    }
    const lead: ScheduleLead = classifyScheduleLead(at);
    if (lead === "too-far") {
      setError("Pick a time within the next year.");
      return;
    }
    if (lead !== "ok") {
      setConfirmNow(lead);
      return;
    }
    try {
      await api.schedule.create({ kyteId: kyte.id, scheduledFor: at.toISOString(), timezone });
      sendEventBeacon("publish_scheduled", { scheduledFor: when });
      setWhen("");
      toast("Publish scheduled", "success");
      await load();
    } catch (err) {
      handleError(err);
    }
  }

  async function publishNow() {
    await publish();
    setWhen("");
    setConfirmNow(null);
    onClose();
  }

  async function act(action: "cancel" | "updateSnapshot", scheduleId: string) {
    try {
      if (action === "cancel") await api.schedule.cancel({ scheduleId });
      else await api.schedule.updateSnapshot({ scheduleId });
      toast(action === "cancel" ? "Schedule canceled" : "Snapshot updated", "success");
      await load();
    } catch (err) {
      handleError(err);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Scheduled publishes" maxWidth={560}>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border p-4">
          <p className="mb-2 text-sm font-medium text-foreground">Schedule a publish</p>
          <p className="mb-3 text-xs text-muted-foreground">
            This will replace whatever is live at that time. Draft as it looks now is frozen.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="datetime-local"
              value={when}
              onChange={(event) => changeWhen(event.target.value)}
              className="h-10 flex-1 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none"
            />
            <Button onClick={submit} disabled={!when || confirmNow !== null}>
              Schedule
            </Button>
          </div>
          <p className="mt-1 text-xs text-subtle-foreground">Timezone: {timezone}</p>
          {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

          {confirmNow ? (
            <div className="mt-3 flex gap-3 rounded-lg border border-warning/25 bg-warning/10 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-sm text-foreground">
                  {`${CONFIRM_COPY[confirmNow]} Confirm and we'll publish your draft right now instead.`}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" loading={publishing} onClick={publishNow}>
                    Publish now
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmNow(null)}>
                    Pick another time
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {schedules.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No scheduled publishes yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="flex gap-3 rounded-lg border border-border p-3">
                <div className="h-24 w-14 shrink-0 overflow-hidden rounded-md border border-border">
                  <div className="scale-[0.22] origin-top-left" style={{ width: 320, height: 480 }}>
                    <ProfileView content={schedule.snapshot} isPreview />
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatWhen(schedule.scheduledFor, schedule.timezone)}
                    </p>
                    <p className="text-xs text-subtle-foreground">by {schedule.createdBy}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => act("updateSnapshot", schedule.id)}>
                      Update snapshot
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => act("cancel", schedule.id)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-subtle-foreground">Up to 3 pending publishes. Uses your draft right now.</p>
      </div>
    </Modal>
  );
}

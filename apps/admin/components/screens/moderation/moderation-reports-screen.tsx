import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { ModerationFrame } from "./moderation-frame";
import { ReportsTab, type ReportFocus } from "./reports-tab";
import { useModerationCounts } from "./use-moderation-counts";

export function ModerationReportsScreen() {
  const router = useRouter();
  const counts = useModerationCounts();
  const [generation, setGeneration] = useState(0);
  const bump = useCallback(() => setGeneration((value) => value + 1), []);

  // A case opened from the frame lands here with its username in the URL, so
  // the report it just created is the only thing on screen.
  const username = typeof router.query.focus === "string" ? router.query.focus : null;
  const focus: ReportFocus | null = username ? { username, reportId: "" } : null;

  return (
    <ModerationFrame
      title="Abuse reports"
      description="What people reported, grouped by the page it's about. Acting on a group closes every open report in it."
      onCaseOpened={bump}
    >
      <ReportsTab
        key={`${generation}:${username ?? ""}`}
        onActed={() => {
          bump();
          counts.reload();
        }}
        focus={focus}
        openCount={counts.data?.openReports ?? 0}
      />
    </ModerationFrame>
  );
}

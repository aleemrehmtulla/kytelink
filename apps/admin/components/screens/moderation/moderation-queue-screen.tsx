import { useCallback, useState } from "react";
import { ModerationFrame } from "./moderation-frame";
import { SuspendedTab } from "./suspended-tab";

export function ModerationQueueScreen() {
  // The suspended list refetches after the frame opens a case, and after the
  // list itself restores something.
  const [generation, setGeneration] = useState(0);
  const bump = useCallback(() => setGeneration((value) => value + 1), []);

  return (
    <ModerationFrame
      title="Moderation queue"
      description="Pages offline right now — suspended on their own, or down with their org."
      onCaseOpened={bump}
    >
      <SuspendedTab key={generation} onActed={bump} />
    </ModerationFrame>
  );
}

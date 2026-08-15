import { useCallback, useState } from "react";
import { ButtonLink } from "../../ui/button";
import { CardsGlyph } from "../../shell/icons";
import { ModerationFrame } from "./moderation-frame";
import { SuspendedTab } from "./suspended-tab";
import { SweepAllCard } from "./sweep-all-card";

export function ModerationQueueScreen() {
  // The suspended list refetches after the frame opens a case, after the
  // list itself restores something, and after a full sweep finishes.
  const [generation, setGeneration] = useState(0);
  const bump = useCallback(() => setGeneration((value) => value + 1), []);

  return (
    <ModerationFrame
      title="Moderation queue"
      description="Pages offline right now — suspended on their own, or down with their org."
      actions={
        <ButtonLink
          href="/moderation/review"
          icon={<CardsGlyph className="h-3.5 w-3.5" />}
        >
          Review mode
        </ButtonLink>
      }
      onCaseOpened={bump}
    >
      <div className="flex flex-col gap-4">
        <SweepAllCard onFinished={bump} />
        <SuspendedTab key={generation} onActed={bump} />
      </div>
    </ModerationFrame>
  );
}

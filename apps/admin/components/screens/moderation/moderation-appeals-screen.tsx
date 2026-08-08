import { useCallback, useState } from "react";
import { AppealsTab } from "./appeals-tab";
import { ModerationFrame } from "./moderation-frame";

export function ModerationAppealsScreen() {
  const [generation, setGeneration] = useState(0);
  const bump = useCallback(() => setGeneration((value) => value + 1), []);

  return (
    <ModerationFrame
      title="Appeals"
      description="People asking us to look again. Appealing is easy on purpose — read it, act, then close it."
      onCaseOpened={bump}
    >
      <AppealsTab key={generation} onActed={bump} />
    </ModerationFrame>
  );
}

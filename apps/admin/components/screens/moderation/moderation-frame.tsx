import { useRouter } from "next/router";
import { useCallback, type ReactNode } from "react";
import { Button } from "../../ui/button";
import { PageHeader } from "../../ui/page-header";
import { ModerationCaseModal, type ModerationCaseResult } from "./moderation-case-modal";
import { QueueHealth } from "./queue-health";
import { useModerationCounts } from "./use-moderation-counts";

export interface ModerationFrameProps {
  title: string;
  description: string;
  /** Rendered with the queue counts the frame already fetched. */
  children: ReactNode;
  onCaseOpened?: () => void;
}

/**
 * The queue numbers and the "Open case" entry point belong to the section, not
 * to one page inside it — every moderation page wears them so moving between
 * Queue, Reports, Appeals and Patterns doesn't change the chrome.
 */
export function ModerationFrame({
  title,
  description,
  children,
  onCaseOpened,
}: ModerationFrameProps) {
  const router = useRouter();
  const counts = useModerationCounts();
  const caseOpen = router.query.case === "new";

  const setCaseParam = useCallback(
    (open: boolean) => {
      const query = { ...router.query };
      if (open) query.case = "new";
      else delete query.case;
      void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    },
    [router],
  );

  const handleOpened = useCallback(
    (result: ModerationCaseResult) => {
      counts.reload();
      onCaseOpened?.();
      // The case lands as a report, so the reports page is where it can be
      // read and closed — carry the username so it's already filtered.
      void router.push(`/moderation/reports?focus=${encodeURIComponent(result.username)}`);
    },
    [counts, onCaseOpened, router],
  );

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button tone="primary" onClick={() => setCaseParam(true)}>
            Open case
          </Button>
        }
      />

      <QueueHealth counts={counts.data} status={counts.status} />

      {children}

      {caseOpen ? (
        <ModerationCaseModal onClose={() => setCaseParam(false)} onOpened={handleOpened} />
      ) : null}
    </>
  );
}

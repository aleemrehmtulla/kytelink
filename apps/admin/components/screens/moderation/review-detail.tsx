import { formatDateTimeFull, formatPercent, formatRelativeTime } from "../../../lib/format";
import type { KyteReviewDetail, SuspendedRow } from "../../../lib/admin-source";
import { SUSPENSION_SOURCE_LABELS } from "./moderation-copy";

export type ReviewVerdict = KyteReviewDetail["verdict"];

export interface ReviewMetaProps {
  verdict: ReviewVerdict | null;
  provider: string | null;
  confidence: number | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  source?: SuspendedRow["source"];
}

const VERDICT_LABELS: Record<ReviewVerdict, string> = {
  APPROVE: "Approved",
  SUSPEND: "Suspended",
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-faint text-[11px] tracking-[0.06em] uppercase">{label}</span>
      <span className="text-secondary">{value}</span>
    </span>
  );
}

/**
 * The provenance of a verdict, spelled out. A row that shows only "suspended"
 * gives a reviewer nothing to judge — which engine ran, how sure it was, who
 * signed off and when are the facts an appeal turns on.
 */
export function ReviewMeta({
  verdict,
  provider,
  confidence,
  reviewedBy,
  reviewedAt,
  source,
}: ReviewMetaProps) {
  // Every field comes from the same ModerationReview row, so a missing verdict
  // means there is no review at all — not that the review was uninformative.
  if (!verdict && !provider && !reviewedBy && !reviewedAt) {
    return (
      <p className="text-faint text-[12px]">
        No moderation review recorded — taken down without an automated verdict.
      </p>
    );
  }

  return (
    <div className="text-tertiary flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px]">
      {verdict ? <Fact label="Verdict" value={VERDICT_LABELS[verdict]} /> : null}
      {provider ? <Fact label="Engine" value={provider} /> : null}
      {confidence !== null ? <Fact label="Confidence" value={formatPercent(confidence)} /> : null}
      <Fact
        label="By"
        value={
          reviewedBy
            ? source
              ? `${reviewedBy} (${SUSPENSION_SOURCE_LABELS[source]})`
              : reviewedBy
            : "automated — no admin signed off"
        }
      />
      {reviewedAt ? (
        <span title={formatDateTimeFull(reviewedAt)}>
          <Fact label="Ran" value={formatRelativeTime(reviewedAt)} />
        </span>
      ) : null}
    </div>
  );
}

export interface ReviewCardProps {
  review: KyteReviewDetail;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="border-hairline flex flex-col gap-2 border-b py-3 last:border-b-0 last:pb-0 first:pt-0">
      <ReviewMeta
        verdict={review.verdict}
        provider={review.provider}
        confidence={review.confidence}
        reviewedBy={review.reviewedBy}
        reviewedAt={review.createdAt}
      />
      <p className="text-secondary text-[13px] leading-relaxed break-words">{review.reason}</p>
    </div>
  );
}

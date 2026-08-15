import Link from "next/link";
import { useCallback } from "react";
// Deep import, not the @kytelink/ui barrel: the barrel re-exports ./motion and
// the analytics charts, which this page never renders.
import { ProfileView } from "@kytelink/ui/profile-view";
import { ButtonLink } from "../../ui/button";
import { ExternalGlyph } from "../../shell/icons";
import { CopyId } from "../../ui/copy-id";
import { ErrorState } from "../../ui/error-state";
import { LoadingState } from "../../ui/loading-state";
import { PageHeader } from "../../ui/page-header";
import { Section } from "../../ui/section";
import { StatusPill } from "../../ui/status-pill";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import { formatDateTimeFull, formatRelativeTime } from "../../../lib/format";
import type { KytePublishedSnapshot } from "../../../lib/admin-source";
import { LinkDestinations, SignalPills } from "./evidence";
import { ReviewCard, ReviewMeta } from "./review-detail";

export interface KytePreviewScreenProps {
  kyteId: string;
}

// Matches ProfileView's own CONTENT_MAX_WIDTH so the column here is the width
// the public page renders at, not an admin-invented one.
const PROFILE_WIDTH = 420;

function statusOf(snapshot: KytePublishedSnapshot): {
  label: string;
  suspended: boolean;
} {
  if (snapshot.moderationStatus === "SUSPENDED")
    return { label: "Suspended", suspended: true };
  if (snapshot.orgSuspended) return { label: "Suspended with its org", suspended: true };
  return { label: "Approved", suspended: false };
}

export function KytePreviewScreen({ kyteId }: KytePreviewScreenProps) {
  const source = useAdminSource();
  const fetchSnapshot = useCallback(
    () => source.kytePublishedSnapshot(kyteId),
    [source, kyteId],
  );
  const { data, status, error, reload } = useAsync(fetchSnapshot);

  if (status === "loading") return <LoadingState rows={6} />;
  if (status === "error") {
    return (
      <ErrorState
        message="Couldn't load this page's published content."
        detail={error instanceof Error ? error.message : undefined}
        onRetry={reload}
      />
    );
  }
  if (!data) {
    return (
      <ErrorState
        message="This kyte has never been published."
        detail="There is no published snapshot to review — only a draft the owner hasn't shipped."
      />
    );
  }

  const state = statusOf(data);
  const handle = data.username ? `@${data.username}` : "Kyte without a username";

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Moderation", href: "/moderation" },
          { label: "Queue", href: "/moderation" },
          { label: handle },
        ]}
        title={`${handle} — page as published`}
        description={
          <>
            <span>
              Published {formatRelativeTime(data.publishedAt)} (v{data.publishSeq})
            </span>
            <CopyId value={data.kyteId} label="Kyte ID" />
          </>
        }
        action={
          <>
            <ButtonLink href={`/orgs/${data.orgId}/${data.kyteId}`}>Open kyte</ButtonLink>
            {data.publicUrl ? (
              <ButtonLink
                href={data.publicUrl}
                external
                icon={<ExternalGlyph className="h-3.5 w-3.5" />}
              >
                Live URL
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <div className="rounded-card border-cardline bg-card mb-4 flex flex-col gap-2 border p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusPill
            label={state.label}
            tone={state.suspended ? "warning" : "success"}
          />
          <span className="text-tertiary text-[12px]">
            {state.suspended
              ? "The public URL serves a blocked shell — this is the content behind it."
              : "This is what visitors see right now."}
          </span>
          <span className="grow" />
          <Link
            href="/moderation"
            className="text-accent hover:text-accent-hover cursor-pointer text-[12px] font-medium"
          >
            Back to queue
          </Link>
        </div>

        {data.suspensionReason ? (
          <p className="text-secondary text-[13px] leading-relaxed break-words">
            {data.suspensionReason}
          </p>
        ) : null}

        <ReviewMeta
          verdict={data.latestReview?.verdict ?? null}
          provider={data.latestReview?.provider ?? null}
          confidence={data.latestReview?.confidence ?? null}
          reviewedBy={data.latestReview?.reviewedBy ?? null}
          reviewedAt={data.latestReview?.createdAt ?? null}
        />

        {data.latestReview ? <SignalPills signals={data.latestReview.signals} /> : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 lg:grow">
          <Section
            title="Page as published"
            description="The real renderer, fed the stored published row. Links are inert here so a review never visits what it is reviewing."
          >
            <div
              className="rounded-card border-cardline mx-auto overflow-hidden border"
              style={{ maxWidth: PROFILE_WIDTH }}
            >
              <ProfileView
                content={data.content}
                username={data.username ?? undefined}
                isPreview
              />
            </div>
          </Section>
        </div>

        <div className="flex w-full min-w-0 shrink-0 flex-col gap-4 lg:w-[380px]">
          <Section
            title="Link destinations"
            description="Where every button on that page actually points."
          >
            <LinkDestinations content={data.content} showTitles />
          </Section>

          <Section
            title="Review history"
            description={`Every moderation verdict recorded for this kyte, newest first. Published ${formatDateTimeFull(data.publishedAt)}.`}
          >
            {data.reviewHistory.length === 0 ? (
              <p className="text-faint text-[12px]">
                No moderation review has ever run on this kyte.
              </p>
            ) : (
              <div className="flex flex-col">
                {data.reviewHistory.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

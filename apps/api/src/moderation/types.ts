import type { ModerationStatus, ModerationVerdict } from "@kytelink/schemas";

interface ReviewLink {
  title: string;
  url: string;
}

interface ReviewIcon {
  url: string | null;
}

export interface ModerationKyteSnapshot {
  kyteId: string;
  orgId: string;
  username: string | null;
  displayName: string | null;
  description: string | null;
  links: ReviewLink[];
  icons: ReviewIcon[];
  avatarAssetId: string | null;
  avatarUrl: string | null;
  redirectUrl: string | null;
  ownerEmailDomain: string | null;
  publishSeq: number;
  moderationStatus: ModerationStatus;
  contentHash: string | null;
}

export interface SusLinkSignal {
  url: string;
  pattern: string;
}

interface SusNameSignal {
  field: "username" | "displayName" | "description" | "linkTitle";
  value: string;
  keyword: string;
}

interface SusRedirectSignal {
  url: string;
  pattern: string;
}

interface SusEmailSignal {
  domain: string;
  reason: string;
}

interface NsfwSignal {
  reason: string;
  confidence?: number;
}

export interface ModerationSignals {
  publishSeq: number;
  sus_link?: SusLinkSignal[];
  sus_name?: SusNameSignal;
  sus_redirect?: SusRedirectSignal;
  sus_email?: SusEmailSignal;
  nsfw_image?: NsfwSignal;
  nsfw_text?: NsfwSignal;
}

type ModerationProviderName = "none" | "openai" | "deterministic";

export interface ModerationVerdictResult {
  verdict: ModerationVerdict;
  categories: string[];
  confidence: number;
  reason: string;
  provider: ModerationProviderName;
  signals: ModerationSignals;
}

export interface ModerationReviewInput {
  kyteId: string;
  contentHash: string;
  verdict: ModerationVerdict;
  categories: string[];
  reason: string;
  provider: ModerationProviderName;
  confidence: number | null;
  signals: ModerationSignals;
  reviewedBy: string | null;
}

export interface SetModerationStatusResult {
  applied: boolean;
  currentPublishSeq: number;
}

export interface ModerationStore {
  loadKyteForReview(kyteId: string): Promise<ModerationKyteSnapshot | null>;
  saveContentHash(kyteId: string, contentHash: string): Promise<void>;
  findReviewByHash(kyteId: string, contentHash: string): Promise<{ verdict: ModerationVerdict } | null>;
  writeReview(review: ModerationReviewInput): Promise<void>;
  setModerationStatus(
    kyteId: string,
    status: ModerationStatus,
    opts: { ifPublishSeqAtMost: number },
  ): Promise<SetModerationStatusResult>;
  forceSetModerationStatus(kyteId: string, status: ModerationStatus): Promise<void>;
  quarantineAssets(kyteId: string): Promise<void>;
  unquarantineAssets(kyteId: string): Promise<void>;
  requestRevalidate(kyteId: string, username: string | null): Promise<void>;
  notifySuspendedOwners(kyteId: string, username: string | null, reason: string): Promise<void>;
  adminAlert(kind: string, message: string, meta?: Record<string, unknown>): Promise<void>;
  listAllPublishedForSweep(): Promise<ModerationKyteSnapshot[]>;
}

export interface ModerationProvider {
  readonly name: ModerationProviderName;
  review(snapshot: ModerationKyteSnapshot): Promise<ProviderReviewOutcome>;
}

export interface ProviderReviewOutcome {
  verdict: ModerationVerdict;
  categories: string[];
  confidence: number;
  reason: string;
  signals: Pick<ModerationSignals, "sus_link" | "sus_redirect" | "nsfw_image" | "nsfw_text">;
}

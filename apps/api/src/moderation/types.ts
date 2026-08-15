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

export type SusNameField = "username" | "displayName" | "description" | "linkTitle";

interface SusNameSignal {
  field: SusNameField;
  value: string;
  keyword: string;
}

export type AdvisorySignalKey =
  | "brand_claim"
  | "brand_mention"
  | "support_language"
  | "url_shortener"
  | "high_abuse_tld"
  | "punycode_host"
  | "free_mail_owner";

/**
 * Context for the AI reviewer and the admin case file. An advisory signal never
 * decides a verdict on its own — every one of these fires on ordinary profiles.
 */
export interface AdvisorySignal {
  key: AdvisorySignalKey;
  detail: string;
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
  advisory?: AdvisorySignal[];
}

/**
 * A page claiming to be a big company's support desk. Never a verdict on its
 * own — the company may genuinely be here — so it routes to the AI, which
 * compares the destinations against the brand's official domains.
 */
export interface BrandClaim {
  brand: string;
  sector: string;
  claim: string;
  field: SusNameField;
  value: string;
  officialDomains: string[];
  offBrandDestinations: SusLinkSignal[];
}

export type DeterministicRule = "ip_logger" | "brand_lookalike";

/**
 * A high-precision pattern match. It forces an escalated AI review and is
 * rendered into the prompt as evidence, but it never suspends by itself —
 * no automated ban is issued without the model agreeing to it.
 */
export interface DeterministicHit {
  rule: DeterministicRule;
  pattern: string;
  url: string;
  kind: "link" | "redirect";
  brand?: string;
  decodedHost?: string;
}

export interface ModerationReviewContext {
  advisory?: AdvisorySignal[];
  brandClaim?: BrandClaim | null;
  deterministicHits?: DeterministicHit[];
  minSuspendConfidence?: number;
}

type ModerationProviderName = "none" | "openai" | "deterministic";

export interface ModerationVerdictResult {
  verdict: ModerationVerdict;
  categories: string[];
  confidence: number;
  reason: string;
  provider: ModerationProviderName;
  signals: ModerationSignals;
  model?: string;
  escalation?: string;
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
  notifyRestoredOwners(kyteId: string, username: string | null): Promise<void>;
  adminAlert(kind: string, message: string, meta?: Record<string, unknown>): Promise<void>;
  listAllPublishedForSweep(): Promise<ModerationKyteSnapshot[]>;
}

export interface ModerationProvider {
  readonly name: ModerationProviderName;
  review(
    snapshot: ModerationKyteSnapshot,
    context?: ModerationReviewContext,
  ): Promise<ProviderReviewOutcome>;
}

export interface ProviderReviewOutcome {
  verdict: ModerationVerdict;
  categories: string[];
  confidence: number;
  reason: string;
  signals: Pick<ModerationSignals, "sus_link" | "sus_redirect" | "nsfw_image" | "nsfw_text">;
  model?: string;
  escalation?: string;
}

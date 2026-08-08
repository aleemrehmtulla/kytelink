import { CornerDownRight } from "lucide-react";

interface FlowStep {
  step: string;
  label: string;
  title: string;
  body: string;
  inputs?: string[];
  branch?: string;
  tone: "auto" | "human";
}

const PIPELINE: FlowStep[] = [
  {
    step: "1",
    label: "Trigger",
    title: "A page is published",
    body: "Every publish starts a review — the first one and every one after it, whether it was published by hand, released on a schedule, or re-checked by an admin.",
    tone: "auto",
  },
  {
    step: "2",
    label: "Fingerprint",
    title: "The content is fingerprinted",
    body: "A hash of the username, display name, bio, every link title and URL, icon URLs, avatar, and redirect target. Reviewing is cheap enough to do on every publish because identical content is never re-reviewed.",
    branch: "Fingerprint unchanged and already reviewed → the stored verdict is reused. A reused verdict can never lift a suspension.",
    tone: "auto",
  },
  {
    step: "3",
    label: "Automated · stage one",
    title: "Deterministic checks run first",
    body: "Pattern checks that cost nothing and run in milliseconds. They catch the highest-confidence phishing signatures before any model is involved.",
    inputs: [
      "Brand impersonation keywords",
      "Lookalike & punycode domains",
      "URL blocklist",
      "Shorteners & high-abuse TLDs",
      "Account signals",
    ],
    branch: "Match → suspended immediately at full confidence, no model call, signals recorded.",
    tone: "auto",
  },
  {
    step: "4",
    label: "Automated · stage two",
    title: "AI review of everything that got through",
    body: "One multimodal call returns a structured verdict — approve or suspend, plus categories, a confidence score, a written reason, and exactly which signals fired.",
    inputs: ["Profile text", "Every link URL", "Redirect target", "Avatar image"],
    branch: "Ambiguous, low-confidence, or the provider errored → approved and logged for a human. We under-block on purpose.",
    tone: "auto",
  },
];

const OUTCOMES = [
  {
    verdict: "Approved",
    tone: "success" as const,
    body: "The page stays live. The verdict, its confidence, and every signal that was evaluated are recorded against that exact version of the content.",
  },
  {
    verdict: "Suspended",
    tone: "danger" as const,
    body: "The public page is replaced by a notice and de-indexed, images are pulled off the CDN, the page goes read-only, pending schedules are held, and the owner is emailed the reason and the appeal link. Nothing is deleted.",
  },
];

const HUMAN_GATE: FlowStep[] = [
  {
    step: "5",
    label: "Human gate",
    title: "A person reviews every suspension",
    body: "Each suspension opens a case carrying the verdict, the confidence, the written reason, and the signals that fired. A reviewer restores the page or upholds the suspension. Nothing is automated here.",
    branch: "A suspension stays until a person reviews it, and it is never lifted automatically.",
    tone: "human",
  },
  {
    step: "6",
    label: "Appeal",
    title: "You can always reach a human",
    body: "The suspended page, the editor banner, and the email all carry the same appeal path: the form at kytelink.com/appeal. No account needed. If we got it wrong, the page is restored with its content intact.",
    tone: "human",
  },
];

function Connector() {
  return (
    <div aria-hidden="true" className="flex justify-center py-2">
      <span className="block h-5 w-px bg-border" />
    </div>
  );
}

function StepCard({ item }: { item: FlowStep }) {
  const badge = item.tone === "human" ? "bg-ink text-white" : "bg-accent text-accent-fg";
  return (
    <div className="rounded-card border border-cardline bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-pill text-[11px] font-semibold ${badge}`}
        >
          {item.step}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-tertiary">
          {item.label}
        </span>
      </div>
      <p className="mt-3 text-[15px] font-semibold tracking-tight text-ink">{item.title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">{item.body}</p>
      {item.inputs ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {item.inputs.map((input) => (
            <li
              key={input}
              className="rounded-pill border border-hairline bg-tint px-2.5 py-1 text-[11px] text-tertiary"
            >
              {input}
            </li>
          ))}
        </ul>
      ) : null}
      {item.branch ? (
        <p className="mt-3 flex gap-2 border-t border-hairline pt-3 text-[12px] leading-relaxed text-tertiary">
          <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
          <span>{item.branch}</span>
        </p>
      ) : null}
    </div>
  );
}

export function AntiPhishingFlow() {
  return (
    <figure className="m-0 rounded-panel border border-cardline bg-canvas p-4 sm:p-6">
      <figcaption className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent">
          Review pipeline
        </p>
        <p className="mt-1.5 text-[15px] font-semibold tracking-tight text-ink">
          How every Kytelink page is reviewed before and after it goes live
        </p>
      </figcaption>

      <ol className="flex flex-col">
        {PIPELINE.map((item, index) => (
          <li key={item.step}>
            <StepCard item={item} />
            {index < PIPELINE.length - 1 ? <Connector /> : null}
          </li>
        ))}

        <Connector />

        <li>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-tertiary">
            Verdict
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {OUTCOMES.map((outcome) => (
              <li
                key={outcome.verdict}
                className={`rounded-card border p-4 ${
                  outcome.tone === "success"
                    ? "border-success-border bg-success-soft"
                    : "border-danger-border bg-danger-soft"
                }`}
              >
                <p
                  className={`text-[13px] font-semibold ${
                    outcome.tone === "success" ? "text-success" : "text-danger"
                  }`}
                >
                  {outcome.verdict}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">{outcome.body}</p>
              </li>
            ))}
          </ul>
        </li>

        <Connector />

        {HUMAN_GATE.map((item, index) => (
          <li key={item.step}>
            <StepCard item={item} />
            {index < HUMAN_GATE.length - 1 ? <Connector /> : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AbuseReportReason } from "@kytelink/schemas";
import { API_ORIGIN } from "../../lib/env";

const REASONS: { value: AbuseReportReason; label: string }[] = [
  { value: "impersonation", label: "Impersonation or scam" },
  { value: "nsfw", label: "NSFW content" },
  { value: "other", label: "Other" },
];

type Status = "idle" | "submitting" | "done";
type SubmitError = "rate-limited" | "failed";

const SUBMIT_ERROR_COPY: Record<SubmitError, string> = {
  "rate-limited": "You've sent a few reports today — we have them. Try again tomorrow.",
  failed: "That didn't send. Check your connection and try again — nothing was lost.",
};

const FIELD_BASE =
  "rounded-input border px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none";

export function ReportForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [usernameOrUrl, setUsernameOrUrl] = useState("");
  const [reason, setReason] = useState<AbuseReportReason>("impersonation");
  const [details, setDetails] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const targetRef = useRef<HTMLInputElement>(null);
  const refocusRef = useRef(false);

  const isDone = status === "done";
  const isSubmitting = status === "submitting";

  // Focus has to wait for the re-render that clears `inert`, otherwise the
  // click that reset the form leaves focus stranded on the body.
  useEffect(() => {
    if (status === "idle" && refocusRef.current) {
      refocusRef.current = false;
      targetRef.current?.focus({ preventScroll: true });
    }
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!usernameOrUrl.trim()) {
      setFieldError("Add the profile URL or username you're reporting.");
      targetRef.current?.focus({ preventScroll: true });
      return;
    }

    setFieldError(null);
    setSubmitError(null);
    setStatus("submitting");

    try {
      // The API answers 202 whether or not the username resolves, so surfacing a
      // transport failure here still never confirms that a handle exists.
      const response = await fetch(`${API_ORIGIN}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrUrl,
          reason,
          details: details.trim() ? details.trim() : undefined,
        }),
      });

      if (!response.ok) {
        setSubmitError(response.status === 429 ? "rate-limited" : "failed");
        setStatus("idle");
        return;
      }
    } catch {
      setSubmitError("failed");
      setStatus("idle");
      return;
    }

    setStatus("done");
  }

  function handleReportAnother() {
    setUsernameOrUrl("");
    setReason("impersonation");
    setDetails("");
    setFieldError(null);
    setSubmitError(null);
    refocusRef.current = true;
    setStatus("idle");
  }

  return (
    <div className="rounded-menu border border-cardline bg-card p-6 sm:p-7">
      {/* Both states share one grid cell so the card keeps the form's height and
          the page never reflows when the result replaces it. */}
      <div className="grid">
        <form
          onSubmit={handleSubmit}
          noValidate
          inert={isDone}
          aria-hidden={isDone || undefined}
          className={`col-start-1 row-start-1 flex flex-col gap-5 ${isDone ? "invisible" : ""}`}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="usernameOrUrl" className="text-sm font-medium text-ink">
              Profile URL or username
            </label>
            <input
              id="usernameOrUrl"
              name="usernameOrUrl"
              type="text"
              ref={targetRef}
              value={usernameOrUrl}
              onChange={(event) => {
                setUsernameOrUrl(event.target.value);
                if (fieldError) setFieldError(null);
              }}
              placeholder="kytelink.com/username"
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? "usernameOrUrl-error" : undefined}
              className={`${FIELD_BASE} ${fieldError ? "border-danger" : "border-border"}`}
            />
            {fieldError ? (
              <p id="usernameOrUrl-error" className="text-xs leading-relaxed text-danger">
                {fieldError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reason" className="text-sm font-medium text-ink">
              Reason
            </label>
            <select
              id="reason"
              name="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value as AbuseReportReason)}
              className={`${FIELD_BASE} cursor-pointer border-border`}
            >
              {REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="details" className="text-sm font-medium text-ink">
              Details <span className="font-normal text-faint">(optional)</span>
            </label>
            <textarea
              id="details"
              name="details"
              rows={4}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="What's wrong with this page?"
              className={`${FIELD_BASE} resize-none border-border`}
            />
          </div>

          {submitError ? (
            <p
              role="alert"
              className="rounded-input border border-danger-border bg-danger-soft px-3.5 py-3 text-sm leading-relaxed text-danger"
            >
              {SUBMIT_ERROR_COPY[submitError]}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting || undefined}
            className="relative cursor-pointer rounded-pill bg-accent px-6 py-3 text-sm font-medium text-white outline-none transition-colors not-disabled:hover:bg-accent-hover disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 3a9 9 0 1 0 9 9" />
                </svg>
              </span>
            ) : null}
            <span className={`contents ${isSubmitting ? "invisible" : ""}`}>Send report</span>
          </button>
        </form>

        {isDone ? (
          <div
            role="status"
            className="col-start-1 row-start-1 flex flex-col items-center justify-center text-center [animation:report-rise_0.25s_ease_both]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 stroke-success"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <p className="mt-5 text-lg font-semibold tracking-tight text-ink">Report sent</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-secondary">
              A person reads every report. If this page breaks the rules, it comes down — usually
              within a day.
            </p>
            <button
              type="button"
              onClick={handleReportAnother}
              className="mt-6 cursor-pointer rounded-pill border border-border px-5 py-2.5 text-sm font-medium text-secondary outline-none transition-colors hover:border-accent hover:text-accent"
            >
              Report another page
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

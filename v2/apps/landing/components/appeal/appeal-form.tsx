import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AppealKind } from "@kytelink/schemas";
import { API_ORIGIN } from "../../lib/env";

const KINDS: { value: AppealKind; label: string }[] = [
  { value: "kyte", label: "My page" },
  { value: "org", label: "My organization" },
  { value: "user", label: "My account" },
];

const HANDLE_LABEL: Record<AppealKind, string> = {
  kyte: "Username of the suspended page",
  org: "Name of the suspended organization",
  user: "Username you go by",
};

const HANDLE_PLACEHOLDER: Record<AppealKind, string> = {
  kyte: "yourname",
  org: "Acme Agency",
  user: "yourname",
};

type Status = "idle" | "submitting" | "done";
type SubmitError = "rate-limited" | "failed";

const SUBMIT_ERROR_COPY: Record<SubmitError, string> = {
  "rate-limited": "You've sent a few appeals today — we have them. Try again tomorrow if you have more to add.",
  failed: "That didn't send. Check your connection and try again — nothing was lost.",
};

const FIELD_BASE =
  "rounded-input border px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none";

const MIN_MESSAGE = 10;

export interface AppealFormProps {
  initialKind: AppealKind;
  initialHandle: string;
}

export function AppealForm({ initialKind, initialHandle }: AppealFormProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [kind, setKind] = useState<AppealKind>(initialKind);
  const [handle, setHandle] = useState(initialHandle);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [fieldError, setFieldError] = useState<{ field: string; text: string } | null>(null);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const handleRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const refocusRef = useRef(false);

  const isDone = status === "done";
  const isSubmitting = status === "submitting";
  // An account appeal can come from someone who has lost the handle entirely,
  // so only the email is truly required there.
  const handleOptional = kind === "user";

  // Focus has to wait for the re-render that clears `inert`, otherwise the
  // click that reset the form leaves focus stranded on the body.
  useEffect(() => {
    if (status === "idle" && refocusRef.current) {
      refocusRef.current = false;
      handleRef.current?.focus({ preventScroll: true });
    }
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!handleOptional && !handle.trim()) {
      setFieldError({ field: "handle", text: "Tell us which one you're appealing for." });
      handleRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!email.trim()) {
      setFieldError({ field: "email", text: "We need an email to reply to." });
      emailRef.current?.focus({ preventScroll: true });
      return;
    }
    if (message.trim().length < MIN_MESSAGE) {
      setFieldError({ field: "message", text: "A sentence or two about what happened, please." });
      messageRef.current?.focus({ preventScroll: true });
      return;
    }

    setFieldError(null);
    setSubmitError(null);
    setStatus("submitting");

    try {
      // 202 no matter what, so a transport failure here is the only thing worth
      // surfacing — the response never confirms that a handle exists.
      const response = await fetch(`${API_ORIGIN}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          handle: handle.trim() || email.trim(),
          email: email.trim(),
          message: message.trim(),
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

  function handleAppealAnother() {
    setKind(initialKind);
    setHandle("");
    setEmail("");
    setMessage("");
    setFieldError(null);
    setSubmitError(null);
    refocusRef.current = true;
    setStatus("idle");
  }

  function errorFor(field: string): string | null {
    return fieldError?.field === field ? fieldError.text : null;
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
            <label htmlFor="kind" className="text-sm font-medium text-ink">
              What was suspended?
            </label>
            <select
              id="kind"
              name="kind"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as AppealKind);
                setFieldError(null);
              }}
              className={`${FIELD_BASE} cursor-pointer border-border`}
            >
              {KINDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="handle" className="text-sm font-medium text-ink">
              {HANDLE_LABEL[kind]}{" "}
              {handleOptional ? <span className="font-normal text-faint">(optional)</span> : null}
            </label>
            <input
              id="handle"
              name="handle"
              type="text"
              ref={handleRef}
              value={handle}
              onChange={(event) => {
                setHandle(event.target.value);
                setFieldError(null);
              }}
              placeholder={HANDLE_PLACEHOLDER[kind]}
              aria-invalid={errorFor("handle") ? true : undefined}
              aria-describedby={errorFor("handle") ? "handle-error" : undefined}
              className={`${FIELD_BASE} ${errorFor("handle") ? "border-danger" : "border-border"}`}
            />
            {errorFor("handle") ? (
              <p id="handle-error" className="text-xs leading-relaxed text-danger">
                {errorFor("handle")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Email we can reply to
            </label>
            <input
              id="email"
              name="email"
              type="email"
              ref={emailRef}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldError(null);
              }}
              placeholder="you@example.com"
              aria-invalid={errorFor("email") ? true : undefined}
              aria-describedby={errorFor("email") ? "email-error" : undefined}
              className={`${FIELD_BASE} ${errorFor("email") ? "border-danger" : "border-border"}`}
            />
            {errorFor("email") ? (
              <p id="email-error" className="text-xs leading-relaxed text-danger">
                {errorFor("email")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="message" className="text-sm font-medium text-ink">
              Why we should take another look
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              ref={messageRef}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setFieldError(null);
              }}
              placeholder="What's on the page, and why you think the suspension was wrong."
              aria-invalid={errorFor("message") ? true : undefined}
              aria-describedby={errorFor("message") ? "message-error" : undefined}
              className={`${FIELD_BASE} resize-none ${
                errorFor("message") ? "border-danger" : "border-border"
              }`}
            />
            {errorFor("message") ? (
              <p id="message-error" className="text-xs leading-relaxed text-danger">
                {errorFor("message")}
              </p>
            ) : null}
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
            <span className={`contents ${isSubmitting ? "invisible" : ""}`}>Send appeal</span>
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
            <p className="mt-5 text-lg font-semibold tracking-tight text-ink">Appeal received</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-secondary">
              We review these fast. A person reads every appeal, and if we got it wrong the page
              comes back exactly as it was — content, links, and analytics intact.
            </p>
            <button
              type="button"
              onClick={handleAppealAnother}
              className="mt-6 cursor-pointer rounded-pill border border-border px-5 py-2.5 text-sm font-medium text-secondary outline-none transition-colors hover:border-accent hover:text-accent"
            >
              Send another appeal
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

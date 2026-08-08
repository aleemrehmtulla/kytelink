export interface ErrorStateProps {
  message?: string;
  detail?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong loading this.",
  detail,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-card border-danger-border bg-danger-soft flex flex-col items-center gap-2 border px-5 py-12 text-center">
      <p className="text-danger text-[13px] font-medium">{message}</p>
      {detail ? (
        <p className="text-danger/75 max-w-md text-[12px] leading-relaxed break-words">
          {detail}
        </p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-pill border-danger-border text-danger hover:bg-card mt-1 cursor-pointer border px-3.5 py-1.5 text-[12px] font-medium"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

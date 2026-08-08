export interface LoadingStateProps {
  rows?: number;
}

const STRIPE_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(45deg, #E9E7F4, #E9E7F4 6px, #F2F0FA 6px, #F2F0FA 12px)",
} as const;

export function LoadingState({ rows = 4 }: LoadingStateProps) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-input h-10" style={STRIPE_STYLE} />
      ))}
    </div>
  );
}

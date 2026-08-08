import { formatDateTimeFull, formatRelativeTime } from "../../../lib/format";

export interface RelativeTimeProps {
  iso: string;
  className?: string;
}

export function RelativeTime({ iso, className = "" }: RelativeTimeProps) {
  return (
    <time dateTime={iso} title={formatDateTimeFull(iso)} className={className}>
      {formatRelativeTime(iso)}
    </time>
  );
}

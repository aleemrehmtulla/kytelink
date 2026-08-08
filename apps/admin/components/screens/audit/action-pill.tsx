import { auditActionLabel, auditActionShortLabel } from "./audit-actions";

export interface ActionPillProps {
  action: string;
  isAdminAction: boolean;
}

export function ActionPill({ action, isAdminAction }: ActionPillProps) {
  return (
    <span
      title={auditActionLabel(action)}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-0.5 text-[12px] font-medium ${
        isAdminAction ? "bg-accent-soft text-accent" : "bg-tint text-secondary"
      }`}
    >
      {isAdminAction ? (
        <>
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-pill bg-accent" />
          <span className="sr-only">Admin action: </span>
        </>
      ) : null}
      {isAdminAction ? auditActionShortLabel(action) : auditActionLabel(action)}
    </span>
  );
}

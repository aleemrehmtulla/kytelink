import { Check } from "lucide-react";
import type { Action } from "@kytelink/schemas";
import { ACTION_MIN_ROLE, ROLES, can } from "@kytelink/schemas";

const SHOWN_ACTIONS: readonly Action[] = [
  "view_analytics",
  "edit_draft",
  "publish",
  "manage_domains",
  "manage_members",
  "delete_kyte",
];

const ACTION_LABELS: Record<string, string> = {
  view_analytics: "View analytics",
  edit_draft: "Edit the draft",
  publish: "Publish",
  manage_domains: "Manage domains",
  manage_members: "Manage members",
  delete_kyte: "Delete a kyte",
};

// Pulled straight from packages/schemas' can()/ACTION_MIN_ROLE — the one
// permission table in the product (roles.ts) — so this mockup can never drift
// from what the app actually enforces.
export function RolesSheetMock() {
  const rows = SHOWN_ACTIONS;

  return (
    <div className="rounded-card border border-cardline bg-card p-5 sm:p-6">
      <h3 className="text-[13px] font-semibold text-ink">Who can do what</h3>
      <div className="mt-4 flex flex-col sm:hidden">
        {rows.map((action) => (
          <div
            key={action}
            className="flex items-center justify-between gap-3 border-t border-hairline py-3 first:border-t-0"
          >
            <span className="text-[13px] text-secondary">{ACTION_LABELS[action]}</span>
            <span className="whitespace-nowrap rounded-pill bg-tint px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-tertiary">
              min {ACTION_MIN_ROLE[action]}
            </span>
          </div>
        ))}
      </div>
      <table className="mt-5 hidden w-full text-left text-sm sm:table">
        <thead className="text-[11px] uppercase tracking-wide text-tertiary">
          <tr>
            <th className="py-2.5 pr-3 font-medium">Action</th>
            {ROLES.map((role) => (
              <th key={role} className="px-2 py-2.5 text-center font-medium">
                {role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((action) => (
            <tr key={action} className="border-t border-hairline">
              <td className="py-3 pr-3 text-[13px] text-secondary">
                {ACTION_LABELS[action]}
                <span className="ml-2 text-[11px] text-faint">min {ACTION_MIN_ROLE[action]}</span>
              </td>
              {ROLES.map((role) => (
                <td key={role} className="px-2 py-3 text-center">
                  {can(role, action) ? (
                    <span className="inline-flex justify-center" aria-label="Allowed">
                      <Check className="size-4 text-accent" aria-hidden="true" />
                    </span>
                  ) : (
                    <span className="text-ghost" aria-label="Not allowed">
                      —
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

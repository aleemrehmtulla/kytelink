import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "../../ui/data-table";
import { Section } from "../../ui/section";
import { StatusPill, type StatusPillProps } from "../../ui/status-pill";
import type { UserDetail } from "../../../lib/admin-source";

type UserKyteRow = UserDetail["kytes"][number];

function statePill(row: UserKyteRow): StatusPillProps {
  if (row.moderationStatus === "SUSPENDED") return { label: "Suspended", tone: "warning" };
  if (row.orgSuspended && row.published) {
    return { label: "Suspended with org", tone: "warning" };
  }
  if (!row.published) return { label: "Draft", tone: "neutral" };
  return { label: "Live", tone: "success" };
}

export function UserKytesCard({ kytes }: { kytes: UserKyteRow[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rows = useMemo(
    () => kytes.slice((page - 1) * pageSize, page * pageSize),
    [kytes, page, pageSize],
  );

  const columns: Column<UserKyteRow>[] = [
    {
      key: "kyte",
      header: "Kyte",
      mobile: "title",
      cell: (row) => (
        <span className="flex min-w-0 flex-col">
          <span className="text-ink truncate font-medium">
            {row.username ? `@${row.username}` : "No username yet"}
          </span>
          {row.displayName ? (
            <span className="text-tertiary truncate text-[12px]">{row.displayName}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "org",
      header: "Org",
      mobile: "meta",
      cell: (row) => (
        <Link
          href={`/orgs/${row.orgId}`}
          className="text-accent hover:text-accent-hover truncate"
        >
          {row.orgName}
        </Link>
      ),
    },
    {
      key: "state",
      header: "State",
      mobile: "detail",
      width: "170px",
      cell: (row) => {
        const pill = statePill(row);
        return <StatusPill label={pill.label} tone={pill.tone} />;
      },
    },
  ];

  return (
    <div id="kytes">
      <Section
        title="Their kytes"
        description="Every kyte in every org this account belongs to, with whether it's live right now. Click one to open it."
      >
        <DataTable<UserKyteRow>
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          status="success"
          caption="Kytes this account can touch, with their moderation state"
          unit="kytes"
          href={(row) => `/orgs/${row.orgId}/${row.id}`}
          empty={{
            title: "No kytes yet.",
            description: "None of their orgs holds a kyte.",
          }}
          pagination={{
            page,
            pageSize,
            total: kytes.length,
            onPageChange: setPage,
            onPageSizeChange: (next) => {
              setPageSize(next);
              setPage(1);
            },
          }}
        />
      </Section>
    </div>
  );
}

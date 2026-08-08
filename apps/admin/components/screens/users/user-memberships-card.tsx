import { useMemo, useState } from "react";
import type { Role } from "@kytelink/schemas";
import { DataTable, type Column } from "../../ui/data-table";
import { Section } from "../../ui/section";
import { formatBytes, formatNumber } from "../../../lib/format";
import type { UserOrgMembership } from "../../../lib/admin-source";

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

export interface UserMembershipsCardProps {
  memberships: UserOrgMembership[];
}

export function UserMembershipsCard({ memberships }: UserMembershipsCardProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const rows = useMemo(
    () => memberships.slice((page - 1) * pageSize, page * pageSize),
    [memberships, page, pageSize],
  );

  const columns: Column<UserOrgMembership>[] = [
    {
      key: "org",
      header: "Org",
      width: "40%",
      mobile: "title",
      cell: (row) => <span className="text-[13.5px] font-medium text-ink">{row.orgName}</span>,
    },
    {
      key: "role",
      header: "Role",
      width: "16%",
      mobile: "meta",
      cell: (row) => <span className="text-secondary">{ROLE_LABELS[row.role]}</span>,
    },
    {
      key: "effectiveRole",
      header: "Effective role",
      width: "18%",
      mobile: "detail",
      cell: (row) => <span className="text-secondary">{ROLE_LABELS[row.effectiveRole]}</span>,
    },
    {
      key: "kyteCount",
      header: "Kytes",
      align: "right",
      width: "12%",
      mobile: "detail",
      cell: (row) => <span className="tabular-nums">{formatNumber(row.kyteCount)}</span>,
    },
    {
      key: "storageBytes",
      header: "Storage",
      align: "right",
      width: "14%",
      mobile: "detail",
      cell: (row) => <span className="tabular-nums">{formatBytes(row.storageBytes)}</span>,
    },
  ];

  return (
    <Section
      title="Org memberships"
      description="Role is what this account was granted in the org; effective role is what it actually gets once ownership and per-kyte access are applied."
    >
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.orgId}
        status="success"
        caption="Orgs this account belongs to, with granted and effective roles"
        unit="memberships"
        href={(row) => `/orgs/${row.orgId}`}
        empty={{
          title: "No org memberships",
          description: "This account doesn't belong to any org yet.",
        }}
        pagination={{
          page,
          pageSize,
          total: memberships.length,
          onPageChange: setPage,
          onPageSizeChange: (next) => {
            setPageSize(next);
            setPage(1);
          },
        }}
      />
    </Section>
  );
}

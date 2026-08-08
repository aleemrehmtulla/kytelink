import { useCallback, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { DataTable, type Column } from "../../ui/data-table";
import { ExportDialog } from "../../ui/export-dialog";
import { Section } from "../../ui/section";
import { UserStatusPill } from "../../ui/status-pill";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import { usePagedQuery } from "../../../hooks/use-paged-query";
import {
  formatDateTimeFull,
  formatNumber,
  formatRelativeTime,
  personLabel,
} from "../../../lib/format";
import type { OrgMemberRow, OrgMembersInput } from "../../../lib/admin-source";
import { ROLE_LABELS } from "./labels";
import { TableSearch, Toolbar } from "./table-toolbar";

type MembersQuery = Required<Pick<OrgMembersInput, "orgId" | "query" | "page" | "pageSize">>;

export interface OrgMembersTableProps {
  orgId: string;
}

export function OrgMembersTable({ orgId }: OrgMembersTableProps) {
  const source = useAdminSource();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rawQuery, setRawQuery] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const query = useDebouncedValue(rawQuery, 250);

  const run = useCallback((next: MembersQuery) => source.orgMembers(next), [source]);
  const input = useMemo<MembersQuery>(
    () => ({ orgId, query, page, pageSize }),
    [orgId, query, page, pageSize],
  );
  const { data, status, reload } = usePagedQuery(run, input);
  const total = data?.total ?? 0;

  const columns = useMemo<Column<OrgMemberRow>[]>(
    () => [
      {
        key: "member",
        header: "Member",
        width: "40%",
        mobile: "title",
        cell: (member) => (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium text-ink">{personLabel(member.name, member.email)}</span>
            {member.name ? (
              <span className="truncate text-[12px] text-tertiary">{member.email}</span>
            ) : null}
          </span>
        ),
      },
      {
        key: "role",
        header: "Role",
        mobile: "meta",
        cell: (member) => <span className="text-secondary">{ROLE_LABELS[member.role]}</span>,
      },
      {
        key: "status",
        header: "Account",
        mobile: "detail",
        headerHint: "The person's platform account, not their access to this org",
        cell: (member) => <UserStatusPill status={member.userStatus} />,
      },
      {
        key: "joinedAt",
        header: "Joined",
        align: "right",
        mobile: "detail",
        cell: (member) => (
          <span className="text-tertiary" title={formatDateTimeFull(member.joinedAt)}>
            {formatRelativeTime(member.joinedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <Section
      title="Members"
      description="Everyone with access to this workspace. A suspended account still counts against the org's people limit."
      action={
        <Button tone="secondary" size="sm" onClick={() => setExportOpen(true)}>
          Export
        </Button>
      }
    >
      <DataTable<OrgMemberRow>
        caption="Org members"
        unit="members"
        rows={data?.rows ?? []}
        columns={columns}
        rowKey={(member) => member.membershipId}
        status={status}
        onRetry={reload}
        href={(member) => `/users/${member.userId}`}
        empty={{
          title: rawQuery ? "No members match that search." : "No members yet.",
          description: rawQuery ? "Search by name or email address." : undefined,
        }}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
          onPageSizeChange: (next) => {
            setPageSize(next);
            setPage(1);
          },
        }}
        toolbar={
          <Toolbar>
            <TableSearch
              id={`members-search-${orgId}`}
              value={rawQuery}
              onChange={(next) => {
                setRawQuery(next);
                setPage(1);
              }}
              placeholder="Search members by name or email"
              label="Search members"
            />
          </Toolbar>
        }
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        dataset="orgMembers"
        filters={{ orgId, query }}
        title="Export members"
        scopeDescription={`${formatNumber(total)} members in this org`}
      />
    </Section>
  );
}

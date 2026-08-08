import { useRouter } from "next/router";
import { Check, ChevronDown, Building2, LayoutGrid } from "lucide-react";
import { useEditor } from "../../../lib/editor/editor-context";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Badge } from "../../ui/badge";

export interface KyteSwitcherProps {
  onSwitchKyte: (kyteId: string) => void;
}

type KyteRow = {
  id: string;
  username: string | null;
  displayName: string | null;
  moderationStatus: string;
  effectiveRole: string | null;
};

const STRIPE =
  "repeating-linear-gradient(45deg, #e9e7f4, #e9e7f4 5px, #f2f0fa 5px, #f2f0fa 10px)";

function StripeTile({ size, radius }: { size: number; radius: number }) {
  return (
    <span
      aria-hidden
      className="shrink-0"
      style={{ width: size, height: size, borderRadius: radius, background: STRIPE }}
    />
  );
}

export function KyteSwitcher({ onSwitchKyte }: KyteSwitcherProps) {
  const router = useRouter();
  const { orgs, kyte } = useEditor();

  const multiOrg = orgs.length > 1;
  const current = orgs.flatMap((org) => org.kytes).find((k) => k.id === kyte.id);
  const currentOrg =
    orgs.find((org) => org.id === kyte.orgId) ??
    orgs.find((org) => org.personal) ??
    orgs[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-input text-ink hover:bg-tint flex min-w-0 cursor-pointer items-center gap-2 px-2 py-1.5 text-sm font-medium transition-colors outline-none"
        >
          <StripeTile size={24} radius={8} />
          <span className="max-w-[7rem] truncate sm:max-w-[12rem]">
            {current?.displayName ||
              (current?.username ? `@${current.username}` : "Untitled")}
          </span>
          <ChevronDown className="text-faint size-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[264px]">
        <DropdownMenuLabel>Switch Kytelink</DropdownMenuLabel>
        {(multiOrg ? orgs : [currentOrg].filter(Boolean)).map((org) => (
          <div key={org!.id}>
            {multiOrg ? (
              <div className="text-tertiary flex items-center gap-1.5 px-2.5 pt-1.5 pb-0.5 text-[11px] font-medium">
                {org!.personal ? null : <Building2 className="size-3" />}
                {org!.name}
              </div>
            ) : null}
            {org!.kytes.map((k: KyteRow) => (
              <DropdownMenuItem
                key={k.id}
                onSelect={() => onSwitchKyte(k.id)}
                className={cn("gap-2.5", k.id === kyte.id && "bg-tint")}
              >
                <StripeTile size={26} radius={org!.personal ? 99 : 8} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-ink truncate text-[13px] font-medium">
                    {k.displayName || (k.username ? `@${k.username}` : "Untitled")}
                  </span>
                  <span className="text-faint truncate text-[11px]">
                    {k.username ? `kytelink.com/${k.username}` : "unpublished"}
                    {org!.personal ? " · personal" : ""}
                  </span>
                </span>
                {k.moderationStatus !== "APPROVED" ? (
                  <Badge variant="danger">{k.moderationStatus.toLowerCase()}</Badge>
                ) : null}
                {k.effectiveRole && k.effectiveRole !== "OWNER" ? (
                  <Badge variant="neutral">{k.effectiveRole.toLowerCase()}</Badge>
                ) : null}
                {k.id === kyte.id ? (
                  <Check className="text-accent size-4 shrink-0" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void router.push("/home")}>
          <LayoutGrid />
          All my Kytelinks
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

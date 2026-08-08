import { LIMIT_DEFAULTS } from "@kytelink/schemas";
import { LimitEditor } from "../../limit-editor";
import { DetailList } from "../../ui/detail-list";
import { Modal } from "../../ui/modal";
import { useToast } from "../../ui/toast";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { formatBytes, formatNumber } from "../../../lib/format";

const MEGABYTE = 1024 * 1024;
const DEFAULT_MB = LIMIT_DEFAULTS.storageBytesPerOrg / MEGABYTE;

export interface RaiseLimitModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  orgName: string;
  usedBytes: number;
  limitBytes: number | null;
  onSaved: () => void;
}

export function RaiseLimitModal({
  open,
  onClose,
  orgId,
  orgName,
  usedBytes,
  limitBytes,
  onSaved,
}: RaiseLimitModalProps) {
  const source = useAdminSource();
  const { toast } = useToast();
  const effectiveLimit = limitBytes ?? LIMIT_DEFAULTS.storageBytesPerOrg;

  async function handleSave(values: Record<string, number | null>) {
    const megabytes = values.storageBytesPerOrg ?? null;
    await source.setOrgLimits({
      orgId,
      overrides: [
        { key: "storageBytesPerOrg", value: megabytes === null ? null : megabytes * MEGABYTE },
      ],
    });
    toast(megabytes === null ? "Storage limit reset to the default." : "Storage limit updated.");
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raise storage limit"
      description={`Overrides the default storage limit for ${orgName}. An admin can change or clear it again at any time.`}
      size="md"
    >
      <div className="flex flex-col gap-4">
        <DetailList
          items={[
            { label: "Currently using", value: formatBytes(usedBytes) },
            {
              label: "Current limit",
              value: `${formatBytes(effectiveLimit)}${limitBytes === null ? " (default)" : ""}`,
              hint:
                limitBytes === null
                  ? `${formatNumber(DEFAULT_MB)} MB — no override set`
                  : `${formatNumber(Math.round(limitBytes / MEGABYTE))} MB · ${formatNumber(limitBytes)} bytes`,
            },
          ]}
        />

        <LimitEditor
          fields={[
            {
              key: "storageBytesPerOrg",
              label: "Storage limit (MB)",
              defaultValue: DEFAULT_MB,
              value: limitBytes === null ? null : Math.round(limitBytes / MEGABYTE),
            },
          ]}
          onSave={handleSave}
        />

        <p className="text-[12px] leading-relaxed text-tertiary">
          Whole megabytes — 1,024 MB is 1 GB. Leave it blank to fall back to the default of{" "}
          {formatBytes(LIMIT_DEFAULTS.storageBytesPerOrg)}. Uploads are rejected once an org is over
          its limit; raising it takes effect immediately.
        </p>
      </div>
    </Modal>
  );
}

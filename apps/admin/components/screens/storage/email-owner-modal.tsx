import { useState } from "react";
import { LIMIT_DEFAULTS } from "@kytelink/schemas";
import { Button } from "../../ui/button";
import { copyText } from "../../ui/clipboard";
import { Modal } from "../../ui/modal";
import { useToast } from "../../ui/toast";
import { formatBytes, formatNumber } from "../../../lib/format";

export interface EmailOwnerFile {
  label: string;
  sizeBytes: number;
}

export interface EmailOwnerModalProps {
  open: boolean;
  onClose: () => void;
  ownerEmail: string;
  orgName: string;
  totalBytes: number;
  limitBytes: number | null;
  assetCount: number;
  largestFiles?: EmailOwnerFile[];
}

const BODY_WARN_LENGTH = 1800;
const DEFAULT_SUBJECT = "About your Kytelink storage usage";

function buildBody(props: {
  orgName: string;
  totalBytes: number;
  limitBytes: number | null;
  assetCount: number;
  largestFiles: EmailOwnerFile[];
}): string {
  const limit = props.limitBytes ?? LIMIT_DEFAULTS.storageBytesPerOrg;
  const limitLine =
    props.limitBytes === null
      ? `The standard storage limit for an organization is ${formatBytes(limit)}.`
      : `The storage limit on this organization is ${formatBytes(limit)}.`;
  const lines = [
    "Hi,",
    "",
    `Your Kytelink organization "${props.orgName}" is currently using ${formatBytes(props.totalBytes)} across ${formatNumber(props.assetCount)} ${props.assetCount === 1 ? "file" : "files"}. ${limitLine}`,
  ];
  if (props.largestFiles.length > 0) {
    lines.push("", "The largest uploads right now:");
    props.largestFiles.forEach((file, index) => {
      lines.push(`${index + 1}. ${file.label} — ${formatBytes(file.sizeBytes)}`);
    });
  }
  lines.push(
    "",
    "Could you take a look and remove anything you no longer need? If you still need the space, reply to this message and an admin can raise the limit for your organization.",
    "",
    "Thanks,",
    "Kytelink admin",
  );
  return lines.join("\n");
}

function buildMailtoUrl(to: string, subject: string, body: string): string {
  // RFC 6068: the address keeps a literal "@" (several desktop clients mishandle
  // %40), and line breaks have to travel as CRLF.
  const address = encodeURIComponent(to).replace(/%40/g, "@");
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body.replace(/\r?\n/g, "\r\n"));
  return `mailto:${address}?subject=${encodedSubject}&body=${encodedBody}`;
}

export function EmailOwnerModal({
  open,
  onClose,
  ownerEmail,
  orgName,
  totalBytes,
  limitBytes,
  assetCount,
  largestFiles = [],
}: EmailOwnerModalProps) {
  const { toast } = useToast();
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState("");
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSubject(DEFAULT_SUBJECT);
      setBody(buildBody({ orgName, totalBytes, limitBytes, assetCount, largestFiles }));
    }
  }

  const mailtoUrl = buildMailtoUrl(ownerEmail, subject, body);
  const tooLong = body.length > BODY_WARN_LENGTH;

  async function copyMessage() {
    const ok = await copyText(`To: ${ownerEmail}\nSubject: ${subject}\n\n${body}`);
    toast(ok ? "Message copied." : "Couldn’t copy the message.", {
      tone: ok ? "success" : "danger",
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Email owner"
      description="Kytelink doesn’t send admin mail — this hands the draft to your own email client."
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button tone={tooLong ? "primary" : "secondary"} size="sm" onClick={() => void copyMessage()}>
            Copy message
          </Button>
          <Button
            tone={tooLong ? "secondary" : "primary"}
            size="sm"
            onClick={() => {
              window.location.href = mailtoUrl;
            }}
          >
            Open in email client
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-tertiary">To</span>
          <span className="rounded-input border border-hairline bg-tint px-3 py-2 text-[13px] break-all text-ink">
            {ownerEmail}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email-owner-subject" className="text-[12px] text-tertiary">
            Subject
          </label>
          <input
            id="email-owner-subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="rounded-input border border-border bg-card px-3 py-2 text-[13px] text-ink placeholder:text-faint"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email-owner-body" className="text-[12px] text-tertiary">
            Message
          </label>
          <textarea
            id="email-owner-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={10}
            className="max-h-[38vh] min-h-[160px] resize-y rounded-input border border-border bg-card px-3 py-2 text-[13px] leading-relaxed text-ink placeholder:text-faint"
          />
          <span className={`text-[12px] ${tooLong ? "text-danger" : "text-faint"}`}>
            {formatNumber(body.length)} characters
            {tooLong
              ? " — over 1,800 characters, some email clients truncate a mailto link this long. Use “Copy message” and paste it instead."
              : null}
          </span>
        </div>
      </div>
    </Modal>
  );
}

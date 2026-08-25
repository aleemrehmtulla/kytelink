import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, RotateCcw } from "lucide-react";
import { withPreviewPasscode } from "@kytelink/schemas";
import { useApp } from "../../../lib/app-context";
import { useEditor } from "../../../lib/editor/editor-context";
import { Modal } from "../../ui/modal";
import { Button } from "../../ui/button";
import { Spinner } from "../../ui/spinner";
import type { PreviewLinkResult } from "../../../lib/api/types";
import { useCopied } from "../../../hooks/use-copied";

function CopyField({ label, value, testId }: { label: string; value: string; testId: string }) {
  const { copied, copy } = useCopied(1500);

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium tracking-wide uppercase text-subtle-foreground">{label}</div>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted p-1.5 pl-3">
        <input
          readOnly
          value={value}
          data-testid={testId}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
        />
        <Button
          size="icon-sm"
          variant={copied ? "secondary" : "primary"}
          aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
          onClick={() => void copy(value)}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

export function PreviewLinkPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { api, toast, handleError } = useApp();
  const { kyte } = useEditor();
  const [link, setLink] = useState<PreviewLinkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLink(await api.preview.ensure({ kyteId: kyte.id }));
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [api, kyte.id, handleError]);

  useEffect(() => {
    if (!open) {
      setConfirmReset(false);
      return;
    }
    void load();
  }, [open, load]);

  async function reset() {
    setResetting(true);
    try {
      setLink(await api.preview.rotate({ kyteId: kyte.id }));
      setConfirmReset(false);
      toast("New passcode set", "success");
    } catch (error) {
      handleError(error);
    } finally {
      setResetting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Preview link" maxWidth={560}>
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          One private link to your draft, exactly as it will look once published. Share it with
          anyone — they need the passcode to get in.
        </p>

        {loading || link === null ? (
          <div className="flex justify-center py-10">
            <Spinner size={20} />
          </div>
        ) : (
          <>
            <CopyField label="Link" value={link.url} testId="preview-url" />
            <CopyField label="Passcode" value={link.passcode} testId="preview-passcode" />

            <Button asChild variant="accent" block>
              <a
                href={withPreviewPasscode(link.url, link.passcode)}
                target="_blank"
                rel="noreferrer"
                data-testid="preview-open"
              >
                <ExternalLink />
                Open preview
              </a>
            </Button>

            <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4">
              {confirmReset ? (
                <>
                  <p className="text-xs text-subtle-foreground">
                    Anyone holding the old passcode loses access.
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="danger" loading={resetting} onClick={reset}>
                      Reset
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-subtle-foreground">
                    Expires {new Date(link.expiresAt).toLocaleDateString()}
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmReset(true)}>
                    <RotateCcw />
                    Reset passcode
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

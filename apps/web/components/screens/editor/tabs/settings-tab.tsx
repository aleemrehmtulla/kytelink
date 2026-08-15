import { useState } from "react";
import { useRouter } from "next/router";
import { useApp } from "../../../../lib/app-context";
import { useEditor } from "../../../../lib/editor/editor-context";
import { useUsernameAvailability } from "../../../../hooks/use-username-availability";
import { sendEventBeacon } from "../../../../lib/beacons";
import { DomainsSection } from "../domains-section";
import { TextInput } from "../../../ui/text-input";
import { Button } from "../../../ui/button";
import { Modal } from "../../../ui/modal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../ui/card";
import { Switch } from "../../../ui/switch";
import { Label } from "../../../ui/label";

export function SettingsTab() {
  const router = useRouter();
  const { api, toast, handleError } = useApp();
  const { kyte, draft, patchDraft, allows, refresh } = useEditor();

  const [username, setUsername] = useState(kyte.username ?? "");
  const availability = useUsernameAvailability(username, kyte.id);
  const [savingUsername, setSavingUsername] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const canChangeUsername = allows("change_username");
  const removalAttempt = username.trim().length === 0 && kyte.username !== null;

  async function commitUsername() {
    const next = username.trim();
    if (
      !canChangeUsername ||
      savingUsername ||
      availability.status !== "available" ||
      next.toLowerCase() === (kyte.username ?? "").toLowerCase()
    ) {
      return;
    }
    setSavingUsername(true);
    try {
      await api.kyte.changeUsername({ kyteId: kyte.id, username: next });
      sendEventBeacon("username_updated");
      await refresh();
      toast("Username updated", "success");
    } catch (error) {
      handleError(error);
    } finally {
      setSavingUsername(false);
    }
  }

  async function deleteKyte() {
    try {
      await api.kyte.delete({ kyteId: kyte.id, confirm: confirmText });
      toast("Kyte deleted", "success");
      void router.push("/edit");
    } catch (error) {
      handleError(error);
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kytelink-${kyte.username ?? kyte.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Username</CardTitle>
          <CardDescription>
            Change it anytime — it goes live the moment it&apos;s available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TextInput
            leftAddon="kytelink.com/"
            value={username}
            disabled={!canChangeUsername}
            onChange={(event) => setUsername(event.target.value)}
            onBlur={() => void commitUsername()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
                void commitUsername();
              }
            }}
            status={
              removalAttempt
                ? "invalid"
                : availability.status === "available"
                  ? "valid"
                  : availability.status === "unavailable"
                    ? "invalid"
                    : "default"
            }
            error={
              removalAttempt
                ? "You can't remove your username — pick a new one instead."
                : availability.reason
            }
          />
        </CardContent>
      </Card>

      {allows("manage_domains") || kyte.username ? <DomainsSection /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Redirect</CardTitle>
          <CardDescription>Send visitors straight to another URL.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <TextInput
              placeholder="https://yourwebsite.com"
              value={draft.redirectUrl ?? ""}
              onChange={(event) =>
                patchDraft({
                  redirectUrl: event.target.value || null,
                  shouldRedirect: event.target.value ? draft.shouldRedirect : false,
                })
              }
            />
            <div className="flex items-center gap-2">
              <Switch
                id="redirect-toggle"
                checked={draft.shouldRedirect}
                disabled={!draft.redirectUrl}
                onCheckedChange={(checked) => patchDraft({ shouldRedirect: checked })}
              />
              <Label htmlFor="redirect-toggle" className="text-muted-foreground">
                {draft.shouldRedirect ? "On" : "Off"}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
          <CardDescription>Best to leave as is.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <TextInput
              label="Title"
              placeholder="My short title (55–60 characters)"
              value={draft.seoTitle ?? ""}
              onChange={(event) => patchDraft({ seoTitle: event.target.value || null })}
            />
            <TextInput
              label="Description"
              placeholder="My short description (155–160 characters)"
              value={draft.seoDescription ?? ""}
              onChange={(event) =>
                patchDraft({ seoDescription: event.target.value || null })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="flex items-center justify-between gap-4 p-5">
        <div>
          <div className="text-ink text-[13px] font-semibold">Kytelink badge</div>
          <p className="text-tertiary mt-1 text-xs">
            The small &quot;made with kytelink&quot; line at the bottom of your page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="watermark-toggle"
            checked={!draft.hideWatermark}
            onCheckedChange={(checked) => patchDraft({ hideWatermark: !checked })}
          />
          <Label htmlFor="watermark-toggle" className="text-muted-foreground">
            {draft.hideWatermark ? "Off" : "On"}
          </Label>
        </div>
      </Card>

      <Card className="flex items-center justify-between gap-4 p-5">
        <div>
          <div className="text-ink text-[13px] font-semibold">Export this kyte</div>
          <p className="text-tertiary mt-1 text-xs">
            Its links and settings, as JSON. It&apos;s yours.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportData}>
          Download
        </Button>
      </Card>

      {allows("delete_kyte") ? (
        <Card className="border-danger-border flex items-center justify-between gap-4 p-5">
          <div>
            <div className="text-danger text-[13px] font-semibold">
              Delete this Kytelink
            </div>
            <p className="text-tertiary mt-1 text-xs">Gone for good. No dark patterns.</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)}>
            Delete
          </Button>
        </Card>
      ) : null}

      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete this kyte"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={deleteKyte}
              disabled={confirmText !== kyte.username}
            >
              Delete forever
            </Button>
          </div>
        }
      >
        <p className="text-muted-foreground mb-3 text-sm">
          This can&apos;t be undone. Type{" "}
          <span className="text-foreground font-semibold">{kyte.username}</span> to
          confirm.
        </p>
        <TextInput
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
        />
      </Modal>
    </div>
  );
}

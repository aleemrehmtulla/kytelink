import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";
import { emptyProfileContent, type Link, type ProfileContent } from "@kytelink/schemas";
import { useApp } from "../../../lib/app-context";
import { isMockApi } from "../../../lib/api/client";
import { createKyteForOnboarding } from "../../../lib/api/mock-client";
import { ApiClientError, appCodeOfError } from "../../../lib/api/errors";
import { sendEventBeacon } from "../../../lib/beacons";
import { Button } from "../../ui/button";
import { SelectUsernameStep } from "./select-username-step";
import { NameAvatarStep } from "./name-avatar-step";
import { StarterLinksStep } from "./starter-links-step";
import { GoLiveStep } from "./go-live-step";

const STEPS = 4;

export function OnboardingWizard() {
  const router = useRouter();
  const { session, ready, api, handleError } = useApp();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [draft, setDraft] = useState<ProfileContent>(emptyProfileContent());
  const [publishedUsername, setPublishedUsername] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !session) void router.replace("/signup");
  }, [ready, session, router]);

  function patch(partial: Partial<ProfileContent>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function addLinks(links: Link[], meta: { displayName?: string; description?: string }) {
    setDraft((current) => ({
      ...current,
      links: [...current.links, ...links],
      displayName: current.displayName ?? meta.displayName ?? null,
      description: current.description ?? meta.description ?? null,
    }));
  }

  function removeLink(index: number) {
    setDraft((current) => ({
      ...current,
      links: current.links.filter((_, i) => i !== index),
    }));
  }

  function next() {
    sendEventBeacon(`onboarding_step_${step + 1}` as "onboarding_step_1");
    setStep((current) => Math.min(current + 1, STEPS - 1));
  }

  function back() {
    setStep((current) => Math.max(current - 1, 0));
  }

  async function goLive(extraLinks: Link[]) {
    if (!session || publishing) return;
    const finalUsername = username.trim().toLowerCase();
    const content: ProfileContent = { ...draft, links: [...draft.links, ...extraLinks] };
    if (extraLinks.length > 0) patch({ links: content.links });
    setPublishing(true);
    setPublishError(null);
    try {
      if (isMockApi()) {
        createKyteForOnboarding(session.userId, session.email, finalUsername, content);
      } else {
        const { orgs } = await api.org.listMine();
        let orgId = orgs.find((org) => org.personal)?.id ?? orgs[0]?.id;
        if (!orgId) orgId = (await api.org.create({})).orgId;
        const { kyteId } = await api.kyte.create({ orgId, username: finalUsername });
        const fresh = await api.kyte.get({ kyteId });
        await api.kyte.updateDraft({ kyteId, content, baseUpdatedAt: fresh.updatedAt });
        await api.kyte.publish({ kyteId });
      }
      sendEventBeacon("onboarding_step_4");
      sendEventBeacon("profile_published");
      setPublishedUsername(finalUsername);
      setStep(STEPS - 1);
    } catch (error) {
      if (appCodeOfError(error)) {
        handleError(error, "Couldn't publish your Kytelink");
      } else {
        setPublishError(
          error instanceof ApiClientError && error.message
            ? error.message
            : "Couldn't publish your Kytelink — try again.",
        );
      }
      setPublishing(false);
    }
  }

  if (!ready || !session) return null;

  const published = publishedUsername !== null;
  const reached = published ? STEPS - 1 : step;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div className="mx-auto my-auto flex w-full max-w-[30rem] flex-col px-4 py-8 sm:px-5 sm:py-12">
        <div className="mb-6 flex justify-center">
          <span className="text-[26px] leading-none" aria-label="Kytelink">
            🪁
          </span>
        </div>

        <div className="mb-5 flex items-center justify-center gap-1.5" aria-label="Progress">
          {Array.from({ length: STEPS - 1 }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 w-8 rounded-pill transition-colors duration-300 ${
                index <= reached ? "bg-ink" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="rounded-panel border border-hairline bg-card p-5 shadow-card-rest sm:p-8">
          <div className="mb-2 flex h-8 items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={back}
              disabled={publishing}
              className={`-ml-2 gap-1 px-2 text-[13px] text-tertiary not-disabled:hover:text-ink ${
                !published && step > 0 ? "" : "invisible"
              }`}
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
          </div>
          <div
            key={published ? "published" : step}
            className="animate-in fade-in duration-200"
          >
            {published ? (
              <GoLiveStep username={publishedUsername} />
            ) : step === 0 ? (
              <SelectUsernameStep username={username} onChange={setUsername} onNext={next} />
            ) : step === 1 ? (
              <NameAvatarStep
                draft={draft}
                username={username}
                email={session.email}
                onPatch={patch}
                onNext={next}
              />
            ) : (
              <StarterLinksStep
                draft={draft}
                publishing={publishing}
                publishError={publishError}
                onAddLinks={addLinks}
                onRemoveLink={removeLink}
                onPublish={goLive}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";
import { emptyProfileContent, type Link, type ProfileContent } from "@kytelink/schemas";
import { useApp } from "../../../lib/app-context";
import { isMockApi } from "../../../lib/api/client";
import { createKyteForOnboarding } from "../../../lib/api/mock-client";
import { ApiClientError, appCodeOfError } from "../../../lib/api/errors";
import { sendEventBeacon } from "../../../lib/beacons";
import { publicLandingUrl } from "../../../lib/env";
import { SelectUsernameStep } from "./select-username-step";
import { NameAvatarStep } from "./name-avatar-step";
import { StarterLinksStep } from "./starter-links-step";
import { GoLiveStep } from "./go-live-step";

const STEPS = 4;

export function OnboardingWizard() {
  const router = useRouter();
  const { session, ready, api, handleError, signOut } = useApp();
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

  async function goLive(displayName: string) {
    if (!session || publishing) return;
    const finalUsername = username.trim().toLowerCase();
    const content: ProfileContent = { ...draft, displayName };
    if (draft.displayName !== displayName) patch({ displayName });
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
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <a
          href={publicLandingUrl()}
          aria-label="Back to kytelink.com"
          className="-ml-2 flex size-9 items-center justify-center rounded-pill text-tertiary transition-colors hover:bg-tint hover:text-ink"
        >
          <ArrowLeft className="size-4" />
        </a>
        <button
          type="button"
          onClick={signOut}
          className="cursor-pointer text-[13px] text-tertiary transition-colors hover:text-ink"
        >
          Log out
        </button>
      </div>

      <div className="mx-auto my-auto flex w-full max-w-[30rem] flex-col px-4 pb-10 pt-2 sm:px-5 sm:pb-14">
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

        <div className="rounded-panel border border-hairline bg-card p-6 shadow-card-rest sm:p-8">
          <div key={published ? "published" : step} className="animate-in fade-in duration-200">
            {published ? (
              <GoLiveStep username={publishedUsername} />
            ) : step === 0 ? (
              <SelectUsernameStep username={username} onChange={setUsername} onNext={next} />
            ) : step === 1 ? (
              <StarterLinksStep
                draft={draft}
                onAddLinks={addLinks}
                onRemoveLink={removeLink}
                onNext={next}
                onBack={back}
              />
            ) : (
              <NameAvatarStep
                draft={draft}
                username={username}
                email={session.email}
                publishing={publishing}
                publishError={publishError}
                onPatch={patch}
                onPublish={goLive}
                onBack={back}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

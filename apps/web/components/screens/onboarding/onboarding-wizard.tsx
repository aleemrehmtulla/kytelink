import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { emptyProfileContent, type Link, type ProfileContent } from "@kytelink/schemas";
import { useApp } from "../../../lib/app-context";
import { isMockApi } from "../../../lib/api/client";
import { createKyteForOnboarding } from "../../../lib/api/mock-client";
import { sendEventBeacon } from "../../../lib/beacons";
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

  function next() {
    sendEventBeacon(`onboarding_step_${step + 1}` as "onboarding_step_1");
    setStep((current) => Math.min(current + 1, STEPS - 1));
  }

  async function goLive() {
    if (!session || publishing) return;
    const finalUsername = username.trim().toLowerCase();
    setPublishing(true);
    try {
      if (isMockApi()) {
        createKyteForOnboarding(session.userId, session.email, finalUsername, draft);
      } else {
        const { orgs } = await api.org.listMine();
        let orgId = orgs.find((org) => org.personal)?.id ?? orgs[0]?.id;
        if (!orgId) orgId = (await api.org.create({})).orgId;
        const { kyteId } = await api.kyte.create({ orgId, username: finalUsername });
        const fresh = await api.kyte.get({ kyteId });
        await api.kyte.updateDraft({ kyteId, content: draft, baseUpdatedAt: fresh.updatedAt });
        await api.kyte.publish({ kyteId });
      }
      sendEventBeacon("onboarding_step_4");
      sendEventBeacon("profile_published");
      setPublishedUsername(finalUsername);
      setStep(STEPS - 1);
    } catch (error) {
      handleError(error, "Couldn't publish your Kytelink");
      setPublishing(false);
    }
  }

  if (!ready || !session) return null;

  const reached = publishedUsername !== null ? STEPS - 1 : step;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10 sm:px-5">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="text-[22px] leading-none" aria-hidden>
            🪁
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">kytelink</span>
        </div>

        <div className="mb-6 flex items-center justify-center gap-1.5" aria-label="Progress">
          {Array.from({ length: STEPS - 1 }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 w-8 rounded-pill transition-colors ${
                index <= reached ? "bg-ink" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="min-h-[420px] rounded-panel border border-hairline bg-card p-5 shadow-card-rest sm:p-8">
          {publishedUsername !== null ? (
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
              onPatch={patch}
              onAddLinks={addLinks}
              onPublish={goLive}
            />
          )}
        </div>
      </div>
    </div>
  );
}

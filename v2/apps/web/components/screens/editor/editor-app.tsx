import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useApp } from "../../../lib/app-context";
import { readCookie, writeCookie } from "../../../lib/cookies";
import { EditorProvider } from "../../../lib/editor/editor-context";
import type { KyteGet, OrgSummary } from "../../../lib/api/types";
import { EditorShell } from "./editor-shell";
import { SuspendedScreen } from "./suspended-screen";
import { Spinner } from "../../ui/spinner";
import { Button } from "../../ui/button";
import type { EditorTab } from "./tabs";

const LAST_KYTE_COOKIE = "kl_last_kyte";

interface LoadState {
  status: "loading" | "ready" | "empty" | "error";
  orgs: OrgSummary[];
  kyte: KyteGet | null;
}

export interface EditorAppProps {
  tab: EditorTab;
}

export function EditorApp({ tab }: EditorAppProps) {
  const router = useRouter();
  const { api, session, ready, handleError } = useApp();
  const [state, setState] = useState<LoadState>({ status: "loading", orgs: [], kyte: null });

  const queryKyte = typeof router.query.kyte === "string" ? router.query.kyte : null;

  const load = useCallback(
    async (preferredKyteId: string | null) => {
      try {
        const { orgs } = await api.org.listMine();
        const accessible = orgs.flatMap((org) => org.kytes.map((k) => k.id));
        if (accessible.length === 0) {
          setState({ status: "empty", orgs, kyte: null });
          return;
        }
        const target =
          (preferredKyteId && accessible.includes(preferredKyteId) && preferredKyteId) ||
          (readCookie(LAST_KYTE_COOKIE) &&
            accessible.includes(readCookie(LAST_KYTE_COOKIE) as string) &&
            (readCookie(LAST_KYTE_COOKIE) as string)) ||
          accessible[0];
        if (!target) {
          setState({ status: "empty", orgs, kyte: null });
          return;
        }
        const kyte = await api.kyte.get({ kyteId: target });
        writeCookie(LAST_KYTE_COOKIE, target);
        setState({ status: "ready", orgs, kyte });
      } catch (error) {
        handleError(error);
        setState({ status: "error", orgs: [], kyte: null });
      }
    },
    [api, handleError],
  );

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      void router.replace("/login");
      return;
    }
    void load(queryKyte);
  }, [ready, session, queryKyte, load, router]);

  const switchKyte = useCallback(
    (kyteId: string) => {
      writeCookie(LAST_KYTE_COOKIE, kyteId);
      setState((current) => ({ ...current, status: "loading" }));
      void load(kyteId);
    },
    [load],
  );

  if (!ready || state.status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner size={28} />
      </div>
    );
  }

  if (state.status === "empty") {
    void router.replace("/onboarding");
    return null;
  }

  if (state.status === "error" || !state.kyte) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <p>We couldn&apos;t load your editor.</p>
        <Button variant="secondary" size="sm" onClick={() => void load(queryKyte)}>
          Try again
        </Button>
      </div>
    );
  }

  if (state.kyte.moderationStatus === "SUSPENDED") {
    return <SuspendedScreen kyte={state.kyte} orgs={state.orgs} onSwitch={switchKyte} />;
  }

  return (
    <EditorProvider key={state.kyte.id} orgs={state.orgs} initialKyte={state.kyte}>
      <EditorShell tab={tab} onSwitchKyte={switchKyte} />
    </EditorProvider>
  );
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig } from "framer-motion";
import { createApiClient, isMockApi, type ApiClient } from "./api/client";
import { setMockPersona } from "./api/mock-client";
import type { MockPersona } from "./api/fixtures";
import { appCodeOfError, APP_ERROR_MESSAGES } from "./api/errors";
import { appealUrl } from "../consts/appeal";
import { getCapabilities, type WebCapabilities } from "./capabilities";
import { writeSession, type Session } from "./auth/session";
import { probeSession, signOut as authSignOut, type SignInResult } from "./auth/auth";
import {
  exitImpersonation,
  probeImpersonation,
  type Impersonation,
} from "./auth/impersonation";
import { Toaster, type ToastItem, type ToastTone } from "../components/ui/toaster";
import { ImpersonationBar } from "../components/shared/impersonation-bar";
import { AccountSuspendedBanner } from "../components/shared/account-suspended-banner";
import { LimitModal } from "../components/shared/limit-modal";

interface AppContextValue {
  session: Session | null;
  /** Set when an admin is viewing this account rather than its owner. */
  impersonation: Impersonation | null;
  ready: boolean;
  capabilities: WebCapabilities;
  api: ApiClient;
  applySignIn: (result: SignInResult) => void;
  signOut: () => void;
  toast: (message: string, tone?: ToastTone, action?: ToastItem["action"]) => void;
  showLimitModal: (thing: string) => void;
  handleError: (error: unknown, fallback?: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// Keys match the canonical @kytelink/schemas LimitKey values the API sends in
// the LIMIT_REACHED error (see apps/api assertCountLimit / storage limit).
const LIMIT_LABELS: Record<string, string> = {
  kytesPerOrg: "kytes",
  peoplePerOrg: "people on this team",
  orgsOwnedPerUser: "teams",
  orgsJoinedPerUser: "team memberships",
  schedulesPerKyte: "scheduled publishes",
  storageBytesPerOrg: "storage",
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [impersonation, setImpersonation] = useState<Impersonation | null>(null);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [limitThing, setLimitThing] = useState<string | null>(null);

  const capabilities = useMemo(() => getCapabilities(), []);
  const api = useMemo(
    () => createApiClient(() => session?.userId ?? "agent"),
    [session],
  );

  useEffect(() => {
    if (isMockApi()) {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("persona");
      if (requested === "team" || requested === "solo") {
        window.localStorage.setItem("kl_persona", requested);
      }
      const persona = (window.localStorage.getItem("kl_persona") as MockPersona | null) ?? "solo";
      setMockPersona(persona);
    }
    let active = true;
    // better-auth still resolves the *admin's* cookie while they impersonate —
    // every API call already runs as the target user, so the displayed identity
    // has to come from the impersonation probe or the two would disagree.
    void Promise.all([probeSession(), probeImpersonation()]).then(([probed, viewing]) => {
      if (!active) return;
      setImpersonation(viewing);
      setSession(
        viewing
          ? { userId: viewing.userId, email: viewing.email, status: "ACTIVE", statusReason: null }
          : probed,
      );
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const applySignIn = useCallback((result: SignInResult) => {
    writeSession(result.session);
    setSession(result.session);
  }, []);

  // Every screen currently holds the impersonated user's data, so ending the
  // session is a reload rather than a state reset — what comes back is the
  // admin's own account, still signed in underneath the whole time.
  const endImpersonation = useCallback(async () => {
    await exitImpersonation();
    setImpersonation(null);
    window.location.reload();
  }, []);

  const signOut = useCallback(() => {
    // Signing out here would destroy the *admin's* session, taking the admin
    // app down with it. Leaving the impersonated view is what they meant.
    if (impersonation) {
      void endImpersonation();
      return;
    }
    void authSignOut();
    writeSession(null);
    setSession(null);
  }, [impersonation, endImpersonation]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "default", action?: ToastItem["action"]) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current, { id, message, tone, action }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const showLimitModal = useCallback((thing: string) => {
    setLimitThing(LIMIT_LABELS[thing] ?? thing);
  }, []);

  const handleError = useCallback(
    (error: unknown, fallback = "Something went wrong") => {
      const code = appCodeOfError(error);
      if (code === "LIMIT_REACHED") {
        const detail = error instanceof Error && "detail" in error ? (error as { detail: string | null }).detail : null;
        showLimitModal(detail ?? "this");
        return;
      }
      if (code === "ACCOUNT_SUSPENDED" || code === "KYTE_SUSPENDED") {
        const kind = code === "ACCOUNT_SUSPENDED" ? "user" : "kyte";
        toast(APP_ERROR_MESSAGES[code] ?? fallback, "error", {
          label: "Appeal",
          onClick: () => window.open(appealUrl(kind), "_blank", "noreferrer"),
        });
        return;
      }
      const message = error instanceof Error ? error.message : fallback;
      toast(message, "error");
    },
    [showLimitModal, toast],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      impersonation,
      ready,
      capabilities,
      api,
      applySignIn,
      signOut,
      toast,
      showLimitModal,
      handleError,
    }),
    [
      session,
      impersonation,
      ready,
      capabilities,
      api,
      applySignIn,
      signOut,
      toast,
      showLimitModal,
      handleError,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      <MotionConfig reducedMotion="user">
        {session?.status === "SUSPENDED" ? (
          <div className="sticky top-0 z-[60]">
            <AccountSuspendedBanner reason={session.statusReason} />
          </div>
        ) : null}
        {children}
        <Toaster toasts={toasts} onDismiss={dismiss} />
        {impersonation ? (
          <ImpersonationBar impersonation={impersonation} onExit={endImpersonation} />
        ) : null}
        <LimitModal open={limitThing !== null} thing={limitThing} onClose={() => setLimitThing(null)} />
      </MotionConfig>
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}

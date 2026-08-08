import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchImpersonationStatus,
  stopImpersonation,
  type ImpersonationStatus,
} from "../../lib/impersonation";

interface ImpersonationContextValue {
  status: ImpersonationStatus;
  refresh: () => void;
  stop: () => Promise<void>;
}

const INACTIVE: ImpersonationStatus = { active: false };

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ImpersonationStatus>(INACTIVE);

  const refresh = useCallback(() => {
    void fetchImpersonationStatus()
      .then(setStatus)
      .catch(() => setStatus(INACTIVE));
  }, []);

  // The session is a browser-wide cookie, so it can be started or ended in the
  // other tab. Re-reading on focus is what keeps this tab's banner honest.
  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const stop = useCallback(async () => {
    await stopImpersonation();
    setStatus(INACTIVE);
  }, []);

  const value = useMemo<ImpersonationContextValue>(
    () => ({ status, refresh, stop }),
    [status, refresh, stop],
  );

  return <ImpersonationContext.Provider value={value}>{children}</ImpersonationContext.Provider>;
}

export function useImpersonation(): ImpersonationContextValue {
  const context = useContext(ImpersonationContext);
  if (!context) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return context;
}

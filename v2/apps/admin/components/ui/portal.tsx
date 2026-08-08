import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

function subscribeToNothing() {
  return () => {};
}

/**
 * `useSyncExternalStore` is the only way to derive "am I on the client" without
 * a setState-in-effect, which the react-hooks lint preset rejects.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

export function Portal({ children }: { children: ReactNode }) {
  const hydrated = useIsHydrated();
  if (!hydrated) return null;
  return createPortal(children, document.body);
}

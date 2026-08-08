import { createContext, useMemo, type ReactNode } from "react";
import type { Capabilities } from "@kytelink/schemas";
import type { AdminMe, AdminSource } from "../lib/admin-source";
import { createRealAdminSource } from "../lib/real-admin-source";
import { getAdminTrpcClient } from "../lib/trpc-client";

export const AdminSourceContext = createContext<AdminSource | null>(null);
export const CapabilitiesContext = createContext<Capabilities | null>(null);
export const AdminMeContext = createContext<AdminMe | null>(null);

export interface AdminSourceProviderProps {
  capabilities: Capabilities;
  children: ReactNode;
}

export function AdminSourceProvider({
  capabilities,
  children,
}: AdminSourceProviderProps) {
  const source = useMemo(() => createRealAdminSource(getAdminTrpcClient()), []);
  return (
    <CapabilitiesContext.Provider value={capabilities}>
      <AdminSourceContext.Provider value={source}>{children}</AdminSourceContext.Provider>
    </CapabilitiesContext.Provider>
  );
}

import { useContext } from "react";
import type { Capabilities } from "@kytelink/schemas";
import { CapabilitiesContext } from "../components/admin-source-provider";

export function useCapabilities(): Capabilities {
  const capabilities = useContext(CapabilitiesContext);
  if (!capabilities) throw new Error("useCapabilities must be used within AdminSourceProvider");
  return capabilities;
}

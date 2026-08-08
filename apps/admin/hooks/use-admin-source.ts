import { useContext } from "react";
import { AdminSourceContext } from "../components/admin-source-provider";
import type { AdminSource } from "../lib/admin-source";

export function useAdminSource(): AdminSource {
  const source = useContext(AdminSourceContext);
  if (!source) throw new Error("useAdminSource must be used within AdminSourceProvider");
  return source;
}

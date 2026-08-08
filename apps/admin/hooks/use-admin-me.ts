import { useContext } from "react";
import { AdminMeContext } from "../components/admin-source-provider";
import type { AdminMe } from "../lib/admin-source";

export function useAdminMe(): AdminMe {
  const me = useContext(AdminMeContext);
  if (!me) throw new Error("useAdminMe must be used within the admin app shell");
  return me;
}

import type { AuthedTrpcContext, TrpcContext } from "@kytelink/trpc";
import type { Role } from "@kytelink/schemas";
import type { ApiConfig } from "../config";
import type { KyteRow, OrgMemberRow, OrgRow, Store } from "../store/store";

interface EnvContext {
  store: Store;
  config: ApiConfig;
}

export interface KyteAccessContext {
  org: OrgRow;
  orgMember: OrgMemberRow;
  kyte: KyteRow | null;
  effectiveRole: Role | null;
}

export type EnvTrpcContext = TrpcContext & EnvContext;
type AuthedEnvContext = AuthedTrpcContext & EnvContext;
export type KyteEnvContext = AuthedEnvContext & { access: KyteAccessContext };

export function getStore(ctx: TrpcContext): Store {
  return ctx.db as Store;
}

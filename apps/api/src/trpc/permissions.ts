import { TRPCError } from "@trpc/server";
import { type Action, can, effectiveRole, type Role } from "@kytelink/schemas";
import type { AuthedUser } from "@kytelink/trpc";
import type { KyteRow, Store } from "../store/store";
import type { KyteAccessContext } from "./context-ext";

interface ResolveInput {
  kyteId?: string;
  orgId?: string;
}

export async function resolveKyteAccess(
  store: Store,
  user: AuthedUser,
  input: ResolveInput,
): Promise<KyteAccessContext> {
  let orgId = input.orgId ?? null;
  let kyte: KyteRow | null = null;

  if (input.kyteId) {
    kyte = await store.kyteById(input.kyteId);
    if (!kyte) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Kyte not found." });
    }
    orgId = kyte.orgId;
  }

  if (!orgId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "kyteId or orgId is required." });
  }

  const org = await store.orgById(orgId);
  if (!org) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });
  }

  const orgMember = await store.orgMember(org.id, user.id);
  if (!orgMember) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this organization." });
  }

  const kyteMember = kyte ? await store.kyteMember(kyte.id, user.id) : null;
  const role = effectiveRole(orgMember, kyteMember);

  return { org, orgMember, kyte, effectiveRole: role };
}

export function assertCan(role: Role | null, action: Action): Role {
  if (role === null || !can(role, action)) {
    throw new TRPCError({ code: "FORBIDDEN", message: `Your role cannot perform "${action}".` });
  }
  return role;
}

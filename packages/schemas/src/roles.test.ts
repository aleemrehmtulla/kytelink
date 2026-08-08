import { describe, expect, it } from "vitest";
import {
  ACTIONS,
  ROLES,
  can,
  canManageMember,
  effectiveRole,
  isKyteAccessInvariantValid,
  type Action,
  type Role,
} from "./roles";

const ALLOWED: Record<Action, Role[]> = {
  view_editor: ["OWNER", "ADMIN", "MANAGER", "EDITOR", "VIEWER"],
  view_analytics: ["OWNER", "ADMIN", "MANAGER", "EDITOR"],
  edit_draft: ["OWNER", "ADMIN", "MANAGER", "EDITOR"],
  upload_asset: ["OWNER", "ADMIN", "MANAGER", "EDITOR"],
  create_preview_link: ["OWNER", "ADMIN", "MANAGER", "EDITOR"],
  publish: ["OWNER", "ADMIN", "MANAGER"],
  schedule: ["OWNER", "ADMIN", "MANAGER"],
  cancel_schedule: ["OWNER", "ADMIN", "MANAGER"],
  change_username: ["OWNER", "ADMIN", "MANAGER"],
  manage_domains: ["OWNER", "ADMIN", "MANAGER"],
  create_kyte: ["OWNER", "ADMIN"],
  manage_members: ["OWNER", "ADMIN"],
  manage_org_settings: ["OWNER", "ADMIN"],
  delete_kyte: ["OWNER"],
  delete_org: ["OWNER"],
  manage_owners: ["OWNER"],
};

describe("can(role, action) — full matrix", () => {
  for (const action of ACTIONS) {
    for (const role of ROLES) {
      const expected = ALLOWED[action].includes(role);
      it(`${role} ${expected ? "can" : "cannot"} ${action}`, () => {
        expect(can(role, action)).toBe(expected);
      });
    }
  }
});

describe("effectiveRole", () => {
  it("OWNER resolves to OWNER on every kyte regardless of grant", () => {
    expect(effectiveRole({ role: "OWNER", kyteAccess: "ALL" })).toBe("OWNER");
  });

  it("ADMIN resolves to ADMIN on every kyte", () => {
    expect(effectiveRole({ role: "ADMIN", kyteAccess: "ALL" })).toBe("ADMIN");
  });

  it("ALL access grants the org-wide role on any kyte", () => {
    expect(effectiveRole({ role: "EDITOR", kyteAccess: "ALL" })).toBe("EDITOR");
  });

  it("SELECTED access with a matching KyteMember row uses the grant role", () => {
    expect(
      effectiveRole({ role: "VIEWER", kyteAccess: "SELECTED" }, { role: "MANAGER" }),
    ).toBe("MANAGER");
  });

  it("SELECTED access with no KyteMember row is no access", () => {
    expect(effectiveRole({ role: "MANAGER", kyteAccess: "SELECTED" })).toBeNull();
  });

  it("SELECTED access with a null KyteMember row is no access", () => {
    expect(effectiveRole({ role: "MANAGER", kyteAccess: "SELECTED" }, null)).toBeNull();
  });
});

describe("isKyteAccessInvariantValid", () => {
  it("OWNER/ADMIN must be ALL with no per-kyte rows", () => {
    expect(isKyteAccessInvariantValid({ role: "OWNER", kyteAccess: "ALL" }, false)).toBe(true);
    expect(isKyteAccessInvariantValid({ role: "ADMIN", kyteAccess: "ALL" }, true)).toBe(false);
  });

  it("ALL access members carry no KyteMember rows", () => {
    expect(isKyteAccessInvariantValid({ role: "EDITOR", kyteAccess: "ALL" }, false)).toBe(true);
    expect(isKyteAccessInvariantValid({ role: "EDITOR", kyteAccess: "ALL" }, true)).toBe(false);
  });

  it("SELECTED access permits KyteMember rows", () => {
    expect(isKyteAccessInvariantValid({ role: "EDITOR", kyteAccess: "SELECTED" }, true)).toBe(true);
  });
});

describe("canManageMember", () => {
  it("an actor can only manage strictly-lower roles", () => {
    expect(canManageMember("OWNER", "ADMIN")).toBe(true);
    expect(canManageMember("ADMIN", "MANAGER")).toBe(true);
    expect(canManageMember("ADMIN", "ADMIN")).toBe(false);
    expect(canManageMember("MANAGER", "EDITOR")).toBe(false);
  });
});

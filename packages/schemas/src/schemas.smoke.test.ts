import { describe, expect, it } from "vitest";
import {
  isAgentModeProductionConflict,
  kyteSchema,
  parseBoolEnv,
  requiredEnvSchema,
  userSchema,
} from "./index";

describe("packages/schemas smoke", () => {
  it("parses a valid kyte", () => {
    const kyte = kyteSchema.parse({
      id: "kyte_1",
      orgId: "org_1",
      username: "agent",
      displayName: "Agent",
      theme: "default",
      published: true,
    });
    expect(kyte.username).toBe("agent");
  });

  it("parses a valid user", () => {
    const user = userSchema.parse({
      id: "user_1",
      email: "agent@kytelink.dev",
      createdAt: new Date(),
    });
    expect(user.email).toBe("agent@kytelink.dev");
  });

  it("rejects env missing required vars", () => {
    expect(requiredEnvSchema.safeParse({}).success).toBe(false);
  });

  it.each(["true", "1", "yes", "on", "TRUE", " true ", "On"])(
    "parseBoolEnv treats %j as true",
    (value) => {
      expect(parseBoolEnv(value)).toBe(true);
    },
  );

  it.each([undefined, "false", "0", "no", "off", "", "nope"])(
    "parseBoolEnv treats %j as false",
    (value) => {
      expect(parseBoolEnv(value)).toBe(false);
    },
  );

  it("detects the AGENT_MODE+production conflict across bypass variants", () => {
    expect(
      isAgentModeProductionConflict({ AGENT_MODE: "true", NODE_ENV: "production" }),
    ).toBe(true);
    expect(
      isAgentModeProductionConflict({ AGENT_MODE: "1", NODE_ENV: "production" }),
    ).toBe(true);
    expect(
      isAgentModeProductionConflict({ AGENT_MODE: "true", NODE_ENV: "Production" }),
    ).toBe(true);
    expect(
      isAgentModeProductionConflict({ AGENT_MODE: " TRUE ", NODE_ENV: " Production " }),
    ).toBe(true);
  });

  it("does not flag AGENT_MODE+production conflict when AGENT_MODE is falsy or unset", () => {
    expect(
      isAgentModeProductionConflict({ AGENT_MODE: "false", NODE_ENV: "production" }),
    ).toBe(false);
    expect(isAgentModeProductionConflict({ NODE_ENV: "production" })).toBe(false);
  });
});

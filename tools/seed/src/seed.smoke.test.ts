import { describe, expect, it } from "vitest";
import { buildSeedPlan } from "./index";

describe("tools/seed smoke", () => {
  it("plans no agent accounts when AGENT_MODE is unset", () => {
    const plan = buildSeedPlan({});
    expect(plan.join("\n")).not.toContain("agent@kytelink.dev");
  });

  it("plans agent accounts when AGENT_MODE=true", () => {
    const plan = buildSeedPlan({ AGENT_MODE: "true" });
    expect(plan.join("\n")).toContain("agent@kytelink.dev");
  });
});

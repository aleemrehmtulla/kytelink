import { describe, expect, it } from "vitest";
import { BackfillConfigError, loadConfig, readProfile } from "./config";
import { parseEnvFile, resolveEnvFilePath } from "./env-file";

const PROD_BASE: NodeJS.ProcessEnv = {
  BACKFILL_PROFILE: "prod",
  DATABASE_URL: "postgresql://u:p@v2.example.com/kytelink_v2",
  LEGACY_DATABASE_URL: "postgresql://u:p@v1.example.com/kytelink_v1",
  NEXT_PUBLIC_CDN_URL: "https://cdn.kytelink.com",
};

describe("parseEnvFile", () => {
  it("keeps a quoted value's inner spaces and angle brackets", () => {
    const parsed = parseEnvFile('EMAIL_FROM="Kytelink <auth@mail.kytelink.com>"\n');
    expect(parsed.EMAIL_FROM).toBe("Kytelink <auth@mail.kytelink.com>");
  });

  it("ignores comments, blanks and non-assignments, and strips `export`", () => {
    const parsed = parseEnvFile(["# a comment", "", "export A=1", "not a line", "B=2"].join("\n"));
    expect(parsed).toEqual({ A: "1", B: "2" });
  });

  it("keeps `=` inside a value", () => {
    expect(parseEnvFile("DATABASE_URL=postgres://u:p@h/db?x=1&y=2\n").DATABASE_URL).toBe(
      "postgres://u:p@h/db?x=1&y=2",
    );
  });
});

describe("resolveEnvFilePath", () => {
  it("prefers the flag over ENV_FILE and returns null when neither is present", () => {
    expect(resolveEnvFilePath(["node", "cli", "--env-file", "/tmp/a.env"], { ENV_FILE: "/tmp/b.env" })).toBe(
      "/tmp/a.env",
    );
    expect(resolveEnvFilePath(["node", "cli"], { ENV_FILE: "/tmp/b.env" })).toBe("/tmp/b.env");
    expect(resolveEnvFilePath(["node", "cli"], {})).toBeNull();
  });
});

describe("loadConfig prod profile", () => {
  it("is only prod when BACKFILL_PROFILE says so", () => {
    expect(readProfile({})).toBe("fixture");
    expect(readProfile({ BACKFILL_PROFILE: "prod" })).toBe("prod");
  });

  it("takes both endpoints explicitly instead of deriving scratch database names", () => {
    const config = loadConfig(PROD_BASE);
    expect(config.profile).toBe("prod");
    expect(config.legacyReadonlyUrl).toContain("kytelink_v1");
    expect(config.targetUrl).toContain("kytelink_v2");
    expect(config.targetUrl).not.toContain("kyte_migration_target");
  });

  it("treats a blank value in a .env file as unset", () => {
    const config = loadConfig({ ...PROD_BASE, TARGET_DATABASE_URL: "" });
    expect(config.targetUrl).toContain("kytelink_v2");
  });

  it("refuses a run with no v1 connection string", () => {
    expect(() => loadConfig({ ...PROD_BASE, LEGACY_DATABASE_URL: undefined })).toThrow(BackfillConfigError);
  });

  it("refuses a run whose source and target are the same database", () => {
    expect(() =>
      loadConfig({ ...PROD_BASE, LEGACY_DATABASE_URL: "postgresql://u:p@v2.example.com/kytelink_v2" }),
    ).toThrow(/same database/);
  });

  it("refuses a local target under the prod profile", () => {
    expect(() =>
      loadConfig({ ...PROD_BASE, DATABASE_URL: "postgresql://kyte:kyte@localhost:5432/kyte" }),
    ).toThrow(/target is local/);
  });

  it("refuses a run with no CDN base url, since it is baked into every rewritten asset url", () => {
    expect(() => loadConfig({ ...PROD_BASE, NEXT_PUBLIC_CDN_URL: undefined })).toThrow(
      /NEXT_PUBLIC_CDN_URL/,
    );
  });

  it("trims the CDN base url's trailing slash so rewritten urls never double up", () => {
    expect(loadConfig({ ...PROD_BASE, NEXT_PUBLIC_CDN_URL: "https://cdn.kytelink.com/" }).cdnBaseUrl).toBe(
      "https://cdn.kytelink.com",
    );
  });

  it("leaves the fixture profile deriving scratch databases as before", () => {
    const config = loadConfig({ DATABASE_URL: "postgresql://kyte:kyte@localhost:5432/kyte" });
    expect(config.profile).toBe("fixture");
    expect(config.targetUrl).toContain("kyte_migration_target");
    expect(config.legacyReadonlyUrl).toContain("kyte_legacy_fixture");
  });
});

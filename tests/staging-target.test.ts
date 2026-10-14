import { afterEach, describe, expect, it, vi } from "vitest";
import { assertStagingManifest, assertStagingTarget, PRODUCTION_PROJECT_REF, stagingRunnerTarget } from "../lib/staging-target";

const ref = "abcdefghijklmnopqrst";
const url = `https://${ref}.supabase.co`;
describe("staging isolation", () => {
  it("rejects invalid cleanup targets even when the manifest matches", () => {
    expect(() => assertStagingManifest({ projectRef: "" }, { projectRef: "",
      runId: "lekka-test-20261014-abc", accounts: [] })).toThrow();
  });
  it("rejects case variants of the same cleanup UUID", () => {
    expect(() => assertStagingManifest({ projectRef: ref }, { projectRef: ref,
      runId: "lekka-test-20261014-abc", accounts: [
        {label: "lekka-test-owner", userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"},
        {label: "lekka-test-member-a", userId: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA"},
      ] })).toThrow();
  });
  it("rejects a staging reference without explicit frontend staging mode", async () => {
    vi.stubEnv("EXPO_PUBLIC_APP_ENV", "");
    vi.stubEnv("EXPO_PUBLIC_STAGING_PROJECT_REF", ref);
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", `https://${PRODUCTION_PROJECT_REF}.supabase.co`);
    await expect(import("../lib/supabase")).rejects.toThrow(/staging mode/);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it("refuses a frontend staging build configured for production", async () => {
    vi.stubEnv("EXPO_PUBLIC_APP_ENV", "staging");
    vi.stubEnv("EXPO_PUBLIC_STAGING_PROJECT_REF", PRODUCTION_PROJECT_REF);
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", `https://${PRODUCTION_PROJECT_REF}.supabase.co`);
    await expect(import("../lib/supabase")).rejects.toThrow(/Production/);
  });
  it("refuses a frontend staging build with missing configuration", async () => {
    vi.stubEnv("EXPO_PUBLIC_APP_ENV", "staging");
    vi.stubEnv("EXPO_PUBLIC_STAGING_PROJECT_REF", "");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "");
    await expect(import("../lib/supabase")).rejects.toThrow(/explicit staging/);
  });
  it("accepts only the explicitly named staging host", () => {
    expect(assertStagingTarget(url, ref)).toEqual({ projectRef: ref, url });
  });
  it("rejects production even when explicitly confirmed", () => {
    expect(() => stagingRunnerTarget({ LEKKA_TEST_ENVIRONMENT: "staging",
      LEKKA_STAGING_PROJECT_REF: PRODUCTION_PROJECT_REF,
      LEKKA_STAGING_CONFIRM_PROJECT_REF: PRODUCTION_PROJECT_REF,
      LEKKA_STAGING_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co` })).toThrow(/Production/);
  });
  it.each([undefined, "", `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
    `http://${ref}.supabase.co`, `${url}.evil.example`, `${url}/rest/v1`,
    `${url}?target=production`, `${url}#fragment`, `https://secret@${ref}.supabase.co`,
    `${url}:8443`, "https://custom.example"])("rejects an unsafe or missing target (%s)", badUrl => {
    expect(() => assertStagingTarget(badUrl, ref)).toThrow();
  });
  it("does not fall back to public application environment variables", () => {
    expect(() => stagingRunnerTarget({ EXPO_PUBLIC_SUPABASE_URL: url })).toThrow();
  });
  it("requires the independent project confirmation", () => {
    expect(() => stagingRunnerTarget({ LEKKA_TEST_ENVIRONMENT: "staging",
      LEKKA_STAGING_PROJECT_REF: ref, LEKKA_STAGING_URL: url })).toThrow(/Confirm/);
  });
  it("rejects missing or malformed project references", () => {
    for (const bad of [undefined, "", "localhost", "abc/path"]) {
      expect(() => assertStagingTarget(url, bad)).toThrow();
    }
  });
  it("validates a run manifest without credentials", () => {
    expect(() => assertStagingManifest({ projectRef: ref }, { projectRef: ref,
      runId: "lekka-test-20261014-abc", accounts: [{label: "lekka-test-owner",
        userId: "11111111-1111-4111-8111-111111111111"}] })).not.toThrow();
  });
  it("rejects manifests copied from another project", () => {
    expect(() => assertStagingManifest({ projectRef: ref }, { projectRef: PRODUCTION_PROJECT_REF,
      runId: "lekka-test-20261014-abc", accounts: [] })).toThrow();
  });
  it("rejects duplicate account IDs before any cleanup could run", () => {
    expect(() => assertStagingManifest({ projectRef: ref }, { projectRef: ref,
      runId: "lekka-test-20261014-abc", accounts: ["owner", "member-a"].map(role => ({
        label: `lekka-test-${role}`, userId: "11111111-1111-4111-8111-111111111111" })) })).toThrow();
  });
});

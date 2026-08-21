import { describe, expect, it } from "vitest";

import { authFailureMessage, hasAuthSession, isEntryPath, isOnboardingFlowPath } from "../lib/auth-flow";

describe("auth flow regressions", () => {
  it("recognizes a completed Supabase session", () => {
    expect(hasAuthSession({ data: { session: { user: { id: "user-1" } } }, error: null })).toBe(true);
    expect(hasAuthSession({ data: { session: null }, error: null })).toBe(false);
  });

  it("returns useful errors instead of leaving the auth button busy", () => {
    expect(authFailureMessage(new Error("Network request timed out"))).toBe("Network request timed out");
    expect(authFailureMessage(null)).toContain("request could not be completed");
  });

  it("keeps onboarding sub-routes out of the entry redirect", () => {
    expect(isOnboardingFlowPath("/account-intent")).toBe(true);
    expect(isOnboardingFlowPath("/onboarding")).toBe(true);
    expect(isEntryPath("/(tabs)")).toBe(true);
    expect(isEntryPath("/account-intent")).toBe(false);
  });
});

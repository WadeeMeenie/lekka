import { describe, expect, it } from "vitest";

import { getRecoveryTokens, isRecoveryLink } from "../lib/recovery-link";

describe("recovery links", () => {
  it("recognizes a native recovery link and extracts both tokens", () => {
    const url = "manuslocalradarsa://reset-password#access_token=access123&refresh_token=refresh456&type=recovery";
    expect(isRecoveryLink(url)).toBe(true);
    expect(getRecoveryTokens(url)).toEqual({ accessToken: "access123", refreshToken: "refresh456" });
  });

  it("rejects missing tokens and non-recovery links", () => {
    expect(isRecoveryLink("manuslocalradarsa://reset-password#type=signup")).toBe(false);
    expect(getRecoveryTokens("manuslocalradarsa://reset-password#access_token=only&type=recovery")).toBeNull();
    expect(getRecoveryTokens("manuslocalradarsa://reset-password")).toBeNull();
  });
});

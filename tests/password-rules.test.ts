import { describe, expect, it } from "vitest";

import { getPasswordRuleResults, getPasswordValidationMessage, isStrongPassword } from "../lib/password-rules";

describe("password rules", () => {
  it("accepts a strong password with every required character class", () => {
    expect(isStrongPassword("LekkaSecure!9".replace("!", "!"))).toBe(true);
    expect(getPasswordRuleResults("LekkaSecure!9").every((rule) => rule.valid)).toBe(true);
  });

  it("rejects weak passwords and explains the missing requirements", () => {
    expect(isStrongPassword("password")).toBe(false);
    expect(getPasswordValidationMessage("password")).toMatch(/12 characters/i);
    expect(getPasswordValidationMessage("password")).toMatch(/uppercase/i);
    expect(getPasswordValidationMessage("password")).toMatch(/number/i);
    expect(getPasswordValidationMessage("password")).toMatch(/special character/i);
  });

  it("rejects whitespace even when the other character classes are present", () => {
    expect(isStrongPassword("Lekka Secure!9")).toBe(false);
    expect(getPasswordValidationMessage("Lekka Secure!9")).toMatch(/no spaces/i);
  });
});

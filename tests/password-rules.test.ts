import { describe, expect, it } from "vitest";

import { getPasswordRuleResults, getPasswordStrength, getPasswordValidationMessage, isStrongPassword } from "../lib/password-rules";

describe("password rules", () => {
  it("maps live rule progress to a meaningful strength label", () => {
    expect(getPasswordStrength("")).toEqual({ score: 0, label: "" });
    expect(getPasswordStrength("password").label).toBe("Weak");
    expect(getPasswordStrength("Password1 ").label).toBe("Fair");
    expect(getPasswordStrength("LekkaSecure1").label).toBe("Good");
    expect(getPasswordStrength("LekkaSecure!9").label).toBe("Strong");
  });

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

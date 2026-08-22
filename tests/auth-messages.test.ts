import { describe, expect, it } from "vitest";

import {
  getAuthErrorMessage,
  getConfirmationEmailBody,
  getConfirmationEmailFooter,
  getConfirmationEmailIntro,
  getConfirmationEmailSubject,
  getPasswordToggleIcon,
  getPasswordToggleLabel,
  isBadGatewayError,
  LEKKA_CONFIRMATION_MESSAGE,
} from "../lib/auth-messages";

describe("Lekka authentication messaging", () => {
  it("classifies gateway failures without exposing infrastructure wording", () => {
    expect(isBadGatewayError(new Error("502 Bad Gateway"))).toBe(true);
    expect(getAuthErrorMessage(new Error("502 Bad Gateway"), "fallback")).toContain("Lekka");
    expect(getAuthErrorMessage(new Error("502 Bad Gateway"), "fallback")).not.toContain("supabase.co");
  });

  it("provides a clear confirmation handoff", () => {
    expect(LEKKA_CONFIRMATION_MESSAGE).toContain("Lekka");
    expect(getConfirmationEmailSubject()).toBe("Confirm your Lekka email address");
    expect(getConfirmationEmailIntro()).toContain("local network");
    expect(getConfirmationEmailBody()).toContain("finish creating your Lekka account");
    expect(getConfirmationEmailFooter()).toContain("Lekka");
  });

  it("keeps the password toggle accessible and deterministic", () => {
    expect(getPasswordToggleLabel(false)).toBe("Show password");
    expect(getPasswordToggleLabel(true)).toBe("Hide password");
    expect(getPasswordToggleIcon(false)).toBe("visibility-off");
    expect(getPasswordToggleIcon(true)).toBe("visibility");
  });
});

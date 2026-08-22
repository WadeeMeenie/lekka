import { describe, expect, it } from "vitest";

import { getResendEmailLabel, RESET_RESEND_COOLDOWN_SECONDS } from "../lib/reset-resend";

describe("reset email resend", () => {
  it("uses a sixty-second cooldown", () => {
    expect(RESET_RESEND_COOLDOWN_SECONDS).toBe(60);
    expect(getResendEmailLabel(60)).toBe("Resend email in 60s");
    expect(getResendEmailLabel(1)).toBe("Resend email in 1s");
  });

  it("enables resend after the cooldown expires", () => {
    expect(getResendEmailLabel(0)).toBe("Resend email");
    expect(getResendEmailLabel(-1)).toBe("Resend email");
  });
});

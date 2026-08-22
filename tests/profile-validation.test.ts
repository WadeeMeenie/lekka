import { describe, expect, it } from "vitest";

import { BIO_MAX_LENGTH, DISPLAY_NAME_MAX_LENGTH, validateProfileFields } from "../lib/profile-validation";

describe("Lekka profile field validation", () => {
  it("requires a non-empty display name", () => {
    expect(validateProfileFields("   ", "").displayName).toBeTruthy();
  });

  it("rejects display names and bios beyond their limits", () => {
    const errors = validateProfileFields("A".repeat(DISPLAY_NAME_MAX_LENGTH + 1), "B".repeat(BIO_MAX_LENGTH + 1));
    expect(errors.displayName).toContain(`${DISPLAY_NAME_MAX_LENGTH}`);
    expect(errors.bio).toContain(`${BIO_MAX_LENGTH}`);
  });

  it("accepts a concise display name and short bio", () => {
    expect(validateProfileFields("Wade", "Local news, food, and people.")).toEqual({});
  });
});

import { describe, expect, it } from "vitest";

import { createProfileAvatarPath, getAvatarInitials } from "../lib/profile-avatar";

describe("profile avatar helpers", () => {
  it("creates a versioned avatar key so updating a photo cannot collide with an existing upload", () => {
    expect(createProfileAvatarPath("user-7", 1700000000000)).toBe("user-7/profile/avatar-1700000000000.jpg");
    expect(createProfileAvatarPath("user-7", 1700000000001)).not.toBe(createProfileAvatarPath("user-7", 1700000000000));
  });

  it("uses the saved display name for header initials and preserves a safe fallback", () => {
    expect(getAvatarInitials("Wade Adams")).toBe("WA");
    expect(getAvatarInitials(" ")).toBe("LM");
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

import { normalizeUsername, validateUsername, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "../lib/username";

describe("Lekka usernames", () => {
  it("normalizes handles for case-insensitive lookup", () => {
    expect(normalizeUsername(" @Wade.Me! ")).toBe("wade.me");
  });

  it("enforces safe length and starting-character rules", () => {
    expect(validateUsername("ab")).toContain(`${USERNAME_MIN_LENGTH}`);
    expect(validateUsername("1".repeat(USERNAME_MAX_LENGTH + 1))).toContain(`${USERNAME_MAX_LENGTH}`);
    expect(validateUsername("-wade")).toContain("start");
  });

  it("rejects reserved public handles", () => {
    expect(validateUsername("admin")).toContain("reserved");
  });

  it("accepts a valid public handle", () => {
    expect(validateUsername("wade.me")).toBeNull();
  });
});

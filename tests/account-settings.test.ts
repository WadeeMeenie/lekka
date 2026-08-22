import { describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
  },
}));

import { formatAccountDate, getUsernameCooldownStatus, mapServerUsernameHistory } from "../lib/account-settings";

describe("account settings presentation", () => {
  it("maps server username history into the screen model", () => {
    expect(mapServerUsernameHistory([{ new_username: "new.handle", changed_at: "2026-08-01T00:00:00.000Z" }])).toEqual([{ username: "new.handle", changedAt: "2026-08-01T00:00:00.000Z" }]);
  });

  it("reports an active cooldown and next available date", () => {
    const history = [{ username: "new.handle", changedAt: "2026-08-01T00:00:00.000Z" }];
    const result = getUsernameCooldownStatus(history, Date.parse("2026-08-15T00:00:00.000Z"));
    expect(result.locked).toBe(true);
    expect(result.nextAvailableAt).toBe("2026-08-31T00:00:00.000Z");
  });

  it("falls back safely for invalid dates", () => {
    expect(formatAccountDate("not-a-date")).toBe("Unknown date");
    expect(getUsernameCooldownStatus([{ username: "handle", changedAt: "not-a-date" }]).locked).toBe(false);
  });
});

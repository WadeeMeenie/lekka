import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
  },
}));

import { DEFAULT_PROFILE_SETTINGS, loadProfileSettings, loadUsernameHistory, recordUsernameChange, saveProfileSettings, saveUsernameHistory, usernameCooldownMessage } from "../lib/profile-settings";

describe("Lekka profile settings", () => {
  beforeEach(() => storage.clear());

  it("returns safe defaults when no settings are stored", async () => {
    await expect(loadProfileSettings()).resolves.toEqual(DEFAULT_PROFILE_SETTINGS);
  });

  it("normalizes invalid stored values to safe privacy defaults", async () => {
    storage.set("lekka/profile-settings/v1", JSON.stringify({ notificationsEnabled: false, locationVisibility: "exact" }));
    await expect(loadProfileSettings()).resolves.toEqual({ notificationsEnabled: false, locationVisibility: "area" });
  });

  it("persists notification and approximate-area preferences", async () => {
    await saveProfileSettings({ notificationsEnabled: false, locationVisibility: "hidden" });
    await expect(loadProfileSettings()).resolves.toEqual({ notificationsEnabled: false, locationVisibility: "hidden" });
  });

  it("persists username history and blocks changes within the cooldown", async () => {
    const changedAt = "2026-08-01T00:00:00.000Z";
    const history = recordUsernameChange([], "Wade.Local", changedAt);
    await saveUsernameHistory("user-1", history);
    await expect(loadUsernameHistory("user-1")).resolves.toEqual([{ username: "wade.local", changedAt }]);
    expect(usernameCooldownMessage(history, Date.parse("2026-08-15T00:00:00.000Z"))).toContain("30 days");
    expect(usernameCooldownMessage(history, Date.parse("2026-09-01T00:00:00.000Z"))).toBeNull();
  });
});

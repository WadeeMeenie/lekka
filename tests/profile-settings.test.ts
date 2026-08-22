import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
  },
}));

import { DEFAULT_PROFILE_SETTINGS, loadProfileSettings, saveProfileSettings } from "../lib/profile-settings";

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
});

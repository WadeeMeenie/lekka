import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "lekka/profile-settings/v1";

export type ProfileSettings = {
  notificationsEnabled: boolean;
  locationVisibility: "hidden" | "area";
};

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  notificationsEnabled: true,
  locationVisibility: "area",
};

export async function loadProfileSettings(): Promise<ProfileSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ProfileSettings>;
    return {
      notificationsEnabled: parsed.notificationsEnabled !== false,
      locationVisibility: parsed.locationVisibility === "hidden" ? "hidden" : "area",
    };
  } catch {
    return DEFAULT_PROFILE_SETTINGS;
  }
}

export async function saveProfileSettings(settings: ProfileSettings): Promise<ProfileSettings> {
  const next: ProfileSettings = {
    notificationsEnabled: settings.notificationsEnabled,
    locationVisibility: settings.locationVisibility === "hidden" ? "hidden" : "area",
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

import { USERNAME_CHANGE_COOLDOWN_DAYS, normalizeUsername } from "./username";

export type UsernameChange = { username: string; changedAt: string };

function usernameHistoryKey(userId: string) {
  return `lekka/profile-username-history/v1/${userId}`;
}

export async function loadUsernameHistory(userId: string): Promise<UsernameChange[]> {
  try {
    const raw = await AsyncStorage.getItem(usernameHistoryKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is UsernameChange => Boolean(item && typeof item.username === "string" && typeof item.changedAt === "string"));
  } catch {
    return [];
  }
}

export async function saveUsernameHistory(userId: string, history: UsernameChange[]) {
  const next = history.slice(-5);
  await AsyncStorage.setItem(usernameHistoryKey(userId), JSON.stringify(next));
  return next;
}

export function usernameCooldownMessage(history: UsernameChange[], now = Date.now()) {
  const latest = history.at(-1);
  if (!latest) return null;
  const elapsed = now - Date.parse(latest.changedAt);
  if (!Number.isFinite(elapsed) || elapsed < USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000) {
    return `You can change your username again after ${USERNAME_CHANGE_COOLDOWN_DAYS} days.`;
  }
  return null;
}

export function recordUsernameChange(history: UsernameChange[], username: string, changedAt = new Date().toISOString()) {
  return [...history, { username: normalizeUsername(username), changedAt }].slice(-5);
}

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

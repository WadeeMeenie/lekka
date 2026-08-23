import AsyncStorage from "@react-native-async-storage/async-storage";

import type { DeviceLocation } from "@/lib/location";
import type { ThemeId } from "@/lib/_core/theme";
import type { AccountIntent } from "@/lib/account";

export const ONBOARDING_KEY = "lekka/onboarding/v1";

export const LEKKA_INTERESTS = [
  "Food & Drink", "Events", "Sports", "Music", "Gaming", "Cars", "Family", "Shopping",
  "Business", "Jobs", "Deals", "News", "Community", "Local alerts", "Entertainment", "Travel",
  "Fitness", "Technology", "Lifestyle",
] as const;

export type OnboardingState = {
  completed: boolean;
  step: "welcome" | "location" | "personalize" | "account";
  accountIntent: AccountIntent | null;
  interests: string[];
  themeId: ThemeId;
  location: DeviceLocation | null;
  area: string;
  preferredRadius: string;
};

export const defaultOnboardingState: OnboardingState = {
  completed: false,
  step: "welcome",
  accountIntent: null,
  interests: [],
  themeId: "original",
  location: null,
  area: "your area",
  preferredRadius: "5 km",
};

export async function loadOnboardingState(): Promise<OnboardingState> {
  const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
  if (!raw) return defaultOnboardingState;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return { ...defaultOnboardingState, ...parsed, area: parsed.area === "Bellville" ? "your area" : (parsed.area ?? "your area") };
  } catch {
    return defaultOnboardingState;
  }
}

export async function saveOnboardingState(patch: Partial<OnboardingState>) {
  const current = await loadOnboardingState();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(next));
  return next;
}

export function toggleInterest(interests: string[], interest: string) { return interests.includes(interest) ? interests.filter((item) => item !== interest) : [...interests, interest]; }

export function radiusToMeters(radius: string) { if (radius.includes("500")) return 500; if (radius.includes("1 km")) return 1000; if (radius.includes("5 km")) return 5000; if (radius.includes("10 km")) return 10000; return 25000; }

export async function completeOnboarding(patch: Partial<OnboardingState> = {}) {
  return saveOnboardingState({ ...patch, completed: true, step: "account" });
}

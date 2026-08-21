import AsyncStorage from "@react-native-async-storage/async-storage";

export type ActiveIdentity = { kind: "personal" } | { kind: "business"; businessId: string; businessName: string };

const ACTIVE_IDENTITY_KEY = "lekka/active-identity/v1";
export const defaultActiveIdentity: ActiveIdentity = { kind: "personal" };

export async function loadActiveIdentity(): Promise<ActiveIdentity> {
  const raw = await AsyncStorage.getItem(ACTIVE_IDENTITY_KEY);
  if (!raw) return defaultActiveIdentity;
  try {
    const parsed = JSON.parse(raw) as ActiveIdentity;
    return parsed.kind === "business" && parsed.businessId && parsed.businessName ? parsed : defaultActiveIdentity;
  } catch { return defaultActiveIdentity; }
}

export async function saveActiveIdentity(identity: ActiveIdentity) {
  await AsyncStorage.setItem(ACTIVE_IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

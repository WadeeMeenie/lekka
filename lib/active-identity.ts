import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

export type ActiveIdentity = { kind: "personal" } | { kind: "business"; businessId: string; businessName: string };

const ACTIVE_IDENTITY_KEY = "lekka/active-identity/v2";
const LEGACY_ACTIVE_IDENTITY_KEY = "lekka/active-identity/v1";
export const defaultActiveIdentity: ActiveIdentity = { kind: "personal" };

async function getUserScopedKey() {
  const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
  return user?.id ? ACTIVE_IDENTITY_KEY + "/" + user.id : ACTIVE_IDENTITY_KEY + "/guest";
}

export async function loadActiveIdentity(): Promise<ActiveIdentity> {
  const key = await getUserScopedKey();
  let raw = await AsyncStorage.getItem(key);
  if (!raw && key !== ACTIVE_IDENTITY_KEY + "/guest") {
    const legacy = await AsyncStorage.getItem(LEGACY_ACTIVE_IDENTITY_KEY);
    if (legacy) {
      raw = legacy;
      await AsyncStorage.setItem(key, legacy);
      await AsyncStorage.removeItem(LEGACY_ACTIVE_IDENTITY_KEY);
    }
  }
  if (!raw) return defaultActiveIdentity;
  try {
    const parsed = JSON.parse(raw) as ActiveIdentity;
    return parsed.kind === "business" && parsed.businessId && parsed.businessName ? parsed : defaultActiveIdentity;
  } catch {
    return defaultActiveIdentity;
  }
}

export async function saveActiveIdentity(identity: ActiveIdentity) {
  await AsyncStorage.setItem(await getUserScopedKey(), JSON.stringify(identity));
  return identity;
}

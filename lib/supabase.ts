import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const safeStorage = {
  getItem: async (key: string) => (typeof window === "undefined" ? null : AsyncStorage.getItem(key)),
  setItem: async (key: string, value: string) => { if (typeof window !== "undefined") await AsyncStorage.setItem(key, value); },
  removeItem: async (key: string) => { if (typeof window !== "undefined") await AsyncStorage.removeItem(key); },
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseKey as string, {
      auth: {
        storage: safeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export type AuthState = { session: Session | null; loading: boolean };

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error("Backend is not configured yet.");
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string, displayName: string) {
  if (!supabase) throw new Error("Backend is not configured yet.");
  return supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
}

export async function requestPasswordReset(email: string, redirectTo?: string) {
  if (!supabase) throw new Error("Backend is not configured yet.");
  return supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
}

export async function signOut() {
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}

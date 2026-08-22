import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

import { shouldRetrySignUp } from "./auth-retry";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export type AuthState = { session: Session | null; loading: boolean };

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error("Backend is not configured yet.");
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string, displayName: string) {
  if (!supabase) throw new Error("Backend is not configured yet.");

  let result = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
  if (shouldRetrySignUp(result.error, 0)) {
    await wait(750);
    result = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
  }
  return result;
}

export async function requestPasswordReset(email: string, redirectTo?: string) {
  if (!supabase) throw new Error("Backend is not configured yet.");
  return supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
}

export async function signOut() {
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

import { shouldRetrySignUp } from "./auth-retry";

// Expo inlines EXPO_PUBLIC_* values at bundle time. Normalize the URL so a
// value copied from a dashboard (with whitespace, quotes, or a trailing slash)
// cannot produce malformed Supabase request paths.
const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseUrl = rawSupabaseUrl.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
const supabaseKey = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim().replace(/^['"]|['"]$/g, "");
const authStorage = Platform.OS === "web" ? undefined : AsyncStorage;

const isValidSupabaseUrl = (() => {
  if (!supabaseUrl) return false;
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co") && !parsed.pathname.includes("/auth/") && !parsed.pathname.includes("/rest/");
  } catch {
    return false;
  }
})();

export const isSupabaseConfigured = Boolean(supabaseKey && isValidSupabaseUrl);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: authStorage,
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

function isTransientAuthError(error: { status?: number; message?: string } | null) {
  if (!error) return false;
  const status = error.status ?? 0;
  const message = (error.message ?? "").toLowerCase();
  return status === 408 || status === 429 || status >= 500 || message.includes("timeout") || message.includes("timed out") || message.includes("network") || message.includes("connection") || message.includes("fetch");
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) {
    if (!isValidSupabaseUrl) throw new Error("Supabase URL is invalid or missing.");
    throw new Error("Supabase publishable key is missing.");
  }

  let result = await supabase.auth.signInWithPassword({ email, password });
  for (let attempt = 1; attempt <= 2 && isTransientAuthError(result.error); attempt += 1) {
    await wait(750 * attempt);
    result = await supabase.auth.signInWithPassword({ email, password });
  }
  return result;
}

export async function signUpWithPassword(email: string, password: string, displayName: string) {
  if (!supabase) {
    if (!isValidSupabaseUrl) throw new Error("Supabase URL is invalid or missing.");
    throw new Error("Supabase publishable key is missing.");
  }

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

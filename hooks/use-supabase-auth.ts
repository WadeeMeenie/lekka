import { type Session } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { useEffect, useState } from "react";

import { requestPasswordReset, signInWithPassword, signUpWithPassword, signOut, supabase } from "@/lib/supabase";
import { signInWithSupabaseOAuth } from "@/lib/supabase-oauth";

const SESSION_RESTORE_ATTEMPTS = 3;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const client = supabase;

    if (!client) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    // Subscribe before restoring the session so INITIAL_SESSION / token
    // refresh events cannot race the first render and leave the app signed out.
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession ?? null);
    });

    const restoreSession = async () => {
      let lastError: unknown = null;

      for (let attempt = 0; attempt < SESSION_RESTORE_ATTEMPTS; attempt += 1) {
        try {
          const { data, error } = await client.auth.getSession();
          if (!error) {
            if (mounted) setSession(data.session ?? null);
            return;
          }
          lastError = error;
        } catch (error) {
          lastError = error;
        }

        if (attempt < SESSION_RESTORE_ATTEMPTS - 1) {
          await wait(400 * (attempt + 1));
        }
      }

      // Do not manufacture a sign-out because Android storage/network was
      // temporarily unavailable during startup. Keep any session delivered by
      // the auth listener; only report the restore failure to diagnostics.
      console.warn("[SupabaseAuth] session restore failed after retries", lastError);
    };

    void restoreSession().finally(() => {
      if (mounted) setLoading(false);
    });

    // Supabase recommends explicitly managing token refresh around app
    // foreground/background transitions on native platforms. This also makes
    // reopening Lekka reliable when the app was suspended for a while.
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void client.auth.startAutoRefresh();
        void restoreSession();
      } else {
        void client.auth.stopAutoRefresh();
      }
    });

    return () => {
      mounted = false;
      appStateSubscription.remove();
      listener.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    isAuthenticated: Boolean(session?.user),
    signIn: signInWithPassword,
    signUp: signUpWithPassword,
    signInWithProvider: signInWithSupabaseOAuth,
    resetPassword: requestPasswordReset,
    logout: signOut,
  };
}

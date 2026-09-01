import { type Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { requestPasswordReset, signInWithPassword, signUpWithPassword, signOut, supabase } from "@/lib/supabase";
import { signInWithSupabaseOAuth } from "@/lib/supabase-oauth";

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    let unsubscribe = () => undefined;

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn("[SupabaseAuth] session restore failed", error.message);
        if (mounted) setSession(data.session ?? null);
      } catch (error) {
        // Authentication is a dependency of some features, not of the native
        // renderer. If storage/network is unavailable, start signed out.
        console.warn("[SupabaseAuth] bootstrap failed", error);
        if (mounted) setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }

      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (mounted) setSession(nextSession ?? null);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    };

    void bootstrap();

    return () => {
      mounted = false;
      unsubscribe();
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

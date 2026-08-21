import { useEffect, useState } from "react";
import { type Session } from "@supabase/supabase-js";
import { requestPasswordReset, signInWithPassword, signUpWithPassword, signOut, supabase } from "@/lib/supabase";
import { signInWithSupabaseOAuth } from "@/lib/supabase-oauth";

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!supabase) { setLoading(false); return; }
    void supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setLoading(false); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { if (mounted) setSession(nextSession); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
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

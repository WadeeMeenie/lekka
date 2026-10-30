import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useEffect, useState } from "react";

import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { getPostAuthRoute } from "@/lib/auth-flow";
import { loadMyProfile } from "@/lib/profile";

export default function IndexScreen() {
  const { loading: authLoading, isAuthenticated, user } = useSupabaseAuth();
  const [resolved, setResolved] = useState<{ userId: string; hasProfile: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated || !user?.id) {
      setResolved(null);
      return () => { active = false; };
    }
    const userId = user.id;
    void loadMyProfile().then(({ data, error }) => {
      if (active) setResolved(error ? null : { userId, hasProfile: Boolean(data?.username) });
    }).catch(() => {
      if (active) setResolved(null);
    });
    return () => { active = false; };
  }, [isAuthenticated, user?.id]);

  if (authLoading) return <View style={styles.loading}><ActivityIndicator /></View>;
  if (!isAuthenticated || !user?.id) return <Redirect href="/auth" />;
  if (!resolved || resolved.userId !== user.id) {
    return <View style={styles.loading}><ActivityIndicator /></View>;
  }
  // The server profile is account-specific. Device-local onboarding completion is not.
  return <Redirect href={getPostAuthRoute(resolved.hasProfile)} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});

import { Redirect } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { getPostAuthRoute } from "@/lib/auth-flow";
import { loadMyProfile } from "@/lib/profile";

type Resolution =
  | { userId: string; status: "ready"; hasProfile: boolean }
  | { userId: string; status: "error" };

export default function IndexScreen() {
  const { loading: authLoading, isAuthenticated, user } = useSupabaseAuth();
  const [resolved, setResolved] = useState<Resolution | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated || !user?.id) {
      setResolved(null);
      return () => { active = false; };
    }
    const userId = user.id;
    setResolved(null);
    void loadMyProfile().then(({ data, error }) => {
      if (!active) return;
      setResolved(error
        ? { userId, status: "error" }
        : { userId, status: "ready", hasProfile: Boolean(data?.username) });
    }).catch(() => {
      if (active) setResolved({ userId, status: "error" });
    });
    return () => { active = false; };
  }, [isAuthenticated, user?.id, attempt]);

  if (authLoading) return <View style={styles.loading}><ActivityIndicator /></View>;
  if (!isAuthenticated || !user?.id) return <Redirect href="/auth" />;
  if (!resolved || resolved.userId !== user.id) {
    return <View style={styles.loading}><ActivityIndicator /></View>;
  }
  if (resolved.status === "error") {
    return <View style={styles.error} accessibilityRole="alert">
      <Text style={styles.title}>We could not load your profile</Text>
      <Text style={styles.description}>Check your connection and try again. Your account and profile have not been changed.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Retry loading profile" onPress={() => setAttempt((value) => value + 1)} style={styles.retry}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>;
  }
  return <Redirect href={getPostAuthRoute(resolved.hasProfile)} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  description: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  retry: { minHeight: 48, minWidth: 160, borderRadius: 16, backgroundColor: "#38D6A6", justifyContent: "center", alignItems: "center", marginTop: 10 },
  retryText: { fontSize: 15, fontWeight: "800", color: "#10211D" },
});

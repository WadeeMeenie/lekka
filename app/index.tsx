import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { loadOnboardingState } from "@/lib/onboarding";
import { useEffect, useState } from "react";

export default function IndexScreen() {
  const { loading: authLoading, isAuthenticated } = useSupabaseAuth();
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;
    void loadOnboardingState()
      .then((state) => {
        if (active) setCompleted(Boolean(state.completed));
      })
      .catch(() => {
        // A broken local onboarding record must not prevent the app from
        // opening. Treat it as incomplete and let onboarding repair it.
        if (active) setCompleted(false);
      })
      .finally(() => {
        if (active) setOnboardingLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (authLoading || onboardingLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/auth" />;
  if (!completed) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

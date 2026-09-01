import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { loadOnboardingState, type OnboardingState } from "@/lib/onboarding";
import { useEffect, useState } from "react";

export default function IndexScreen() {
  const { loading: authLoading, isAuthenticated } = useSupabaseAuth();
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    let active = true;
    void loadOnboardingState()
      .then((state) => {
        if (active) setOnboardingState(state);
      })
      .catch(() => {
        // Local onboarding storage is optional for returning authenticated users.
        // Keep the app usable rather than trapping them on the welcome screen.
        if (active) setOnboardingState(null);
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

  // A signed-in user must never be forced back through the first-run welcome
  // screen just because the local onboarding record was lost/reset. An
  // in-progress onboarding state (location/personalize/account) is preserved
  // so a genuinely new account can still resume where it left off.
  if (onboardingState?.completed) return <Redirect href="/(tabs)" />;
  if (!onboardingState || onboardingState.step === "welcome") return <Redirect href="/(tabs)" />;

  return <Redirect href="/onboarding" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { loadOnboardingState, type OnboardingState } from "@/lib/onboarding";
import { getPostAuthRoute } from "@/lib/auth-flow";
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

  // Keep first-time and unfinished users in onboarding. Missing local state is
  // treated as incomplete so the location and personalization steps are not skipped.
  return <Redirect href={getPostAuthRoute(onboardingState?.completed === true)} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { loadOnboardingState, type OnboardingState } from "@/lib/onboarding";
import { getPostAuthRoute } from "@/lib/auth-flow";
import { loadMyProfile } from "@/lib/profile";
import { useEffect, useState } from "react";

export default function IndexScreen() {
  const { loading: authLoading, isAuthenticated } = useSupabaseAuth();
  const [resolvedAuthState, setResolvedAuthState] = useState<boolean | null>(null);
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([loadOnboardingState().catch(() => null), isAuthenticated ? loadMyProfile().catch(() => ({ data: null, error: new Error("Profile unavailable") })) : Promise.resolve(null)])
      .then(([state, profile]) => {
        if (active) {
          setOnboardingState(state);
          setResolvedAuthState(isAuthenticated);
          setHasExistingProfile(Boolean(profile && !profile.error && profile.data?.username));
        }
      })
      .catch(() => {
        // Local onboarding storage is optional for returning authenticated users.
        // Keep the app usable rather than trapping them on the welcome screen.
        if (active) { setOnboardingState(null); setResolvedAuthState(isAuthenticated); }
      })
;

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  if (authLoading || resolvedAuthState !== isAuthenticated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/auth" />;

  // Keep first-time and unfinished users in onboarding. Missing local state is
  // treated as incomplete so the location and personalization steps are not skipped.
  return <Redirect href={getPostAuthRoute(onboardingState?.completed === true || hasExistingProfile)} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

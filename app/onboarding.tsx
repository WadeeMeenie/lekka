import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { getLastKnownOrCurrentLocation, requestApproximateLocation } from "@/lib/location";
import { completeOnboarding, defaultOnboardingState, LEKKA_INTERESTS, loadOnboardingState, radiusToMeters, saveOnboardingState, toggleInterest, type OnboardingState } from "@/lib/onboarding";
import { ThemePalettes, type ThemeId } from "@/constants/theme";
import { useThemeContext } from "@/lib/theme-provider";
import { saveMyProfile } from "@/lib/profile";

const themeOptions: Array<{ id: ThemeId; label: string; description: string }> = [
  { id: "original", label: "Lekka Original", description: "Clean, local, and unmistakably Lekka." },
  { id: "midnight", label: "Midnight", description: "A calm premium dark canvas." },
  { id: "sunset", label: "Sunset", description: "Warm energy for busy local days." },
  { id: "ocean", label: "Ocean", description: "Cool teal tones for easy discovery." },
  { id: "sa-vibe", label: "SA Vibe", description: "Grounded, warm, and proudly local." },
  { id: "neon", label: "Neon", description: "A bright social pulse for the city." },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const { themeId, setThemeId } = useThemeContext();
  const { isAuthenticated, user } = useSupabaseAuth();
  const params = useLocalSearchParams<{ resume?: string }>();
  const [state, setState] = useState<OnboardingState>(defaultOnboardingState);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadOnboardingState().then((saved) => {
      if (saved.completed && params.resume !== "1") {
        router.replace("/(tabs)");
        return;
      }
      setState(params.resume === "1" ? { ...saved, step: "account" } : saved);
      if (params.resume === "1") void saveOnboardingState({ step: "account" });
    });
  }, [params.resume]);

  const goTo = async (step: OnboardingState["step"], patch: Partial<OnboardingState> = {}) => {
    const next = await saveOnboardingState({ ...patch, step });
    setState(next);
  };

  const useLocation = async () => {
    setBusy(true);
    try {
      const result = await requestApproximateLocation(state.area);
      if (result.status === "granted") await goTo("personalize", { location: result.location, area: result.location.area });
      else await goTo("personalize", { location: null, area: result.area });
    } finally {
      setBusy(false);
    }
  };

  const finishAsGuest = async () => {
    if (isAuthenticated && user) {
      await saveMyProfile({ displayName: user.user_metadata?.display_name ?? "", username: user.user_metadata?.username ?? "", bio: "", homeArea: state.area, preferredRadiusM: radiusToMeters(state.preferredRadius), interests: state.interests, locationVisibility: "area" });
    }
    await completeOnboarding({ interests: state.interests, themeId, area: state.area });
    router.replace("/(tabs)");
  };

  const openAuth = () => router.push({ pathname: "/auth", params: { next: "onboarding" } });

  if (state.step === "welcome") {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.centerContent}><BrandMark colors={colors} /><Text style={[styles.eyebrow, { color: colors.primary }]}>LEKKA</Text><Text style={[styles.heroTitle, { color: colors.foreground }]}>What’s happening around you?</Text><Text style={[styles.heroSubtitle, { color: colors.muted }]}>Discover people, places, businesses and moments wherever you are.</Text><Pressable onPress={() => void goTo("location")} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.84 : 1 }]}><Text style={styles.primaryText}>Let’s go</Text><IconSymbol name="arrow.right" size={19} color="#10211D" /></Pressable><Pressable onPress={openAuth} style={styles.textButton}><Text style={[styles.textButtonLabel, { color: colors.primary }]}>Already have an account? Sign in</Text></Pressable><Pressable onPress={() => void finishAsGuest()} style={styles.textButton}><Text style={[styles.mutedButtonLabel, { color: colors.muted }]}>Continue exploring</Text></Pressable></View></ScreenContainer>;
  }

  if (state.step === "location") {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.scrollContent}><Progress step={1} colors={colors} /><BrandMark colors={colors} /><Text style={[styles.title, { color: colors.foreground }]}>Your local world follows you.</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Use your location to discover what’s happening around you. We use it to find nearby content, never to publish your exact location.</Text><View style={[styles.privacyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="location.fill" size={22} color={colors.primary} /><Text style={[styles.privacyText, { color: colors.foreground }]}>Lekka uses foreground location only. You can explore manually or change this later.</Text></View><Pressable disabled={busy} onPress={() => void useLocation()} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: busy ? 0.6 : pressed ? 0.84 : 1 }]}><Text style={styles.primaryText}>{busy ? "Finding your area…" : "Use my location"}</Text></Pressable><Pressable onPress={() => void goTo("personalize")} style={styles.outlineButton}><Text style={[styles.outlineText, { color: colors.foreground }]}>Not now</Text></Pressable></ScrollView></ScreenContainer>;
  }

  if (state.step === "personalize") {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.scrollContent}><Progress step={2} colors={colors} /><Text style={[styles.eyebrow, { color: colors.primary }]}>MAKE LEKKA YOURS</Text><Text style={[styles.title, { color: colors.foreground }]}>What are you into?</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Choose a few interests so your local world gets more relevant from day one.</Text><View style={styles.interestGrid}>{LEKKA_INTERESTS.map((interest) => { const selected = state.interests.includes(interest); return <Pressable key={interest} onPress={() => { const interests = toggleInterest(state.interests, interest); setState((current) => ({ ...current, interests })); void saveOnboardingState({ interests }); }} style={[styles.interestChip, { backgroundColor: selected ? colors.foreground : colors.surface, borderColor: selected ? colors.foreground : colors.border }]}><Text style={[styles.interestText, { color: selected ? colors.background : colors.muted }]}>{interest}</Text></Pressable>; })}</View><Text style={[styles.label, { color: colors.muted }]}>PICK A LOOK</Text><View style={styles.themeGrid}>{themeOptions.map((option) => { const selected = themeId === option.id; const swatch = ThemePalettes[option.id].light; return <Pressable key={option.id} onPress={() => { setThemeId(option.id); void saveOnboardingState({ themeId: option.id }); }} style={[styles.themeCard, { backgroundColor: swatch.surface, borderColor: selected ? swatch.primary : colors.border }]}><View style={[styles.themeSwatch, { backgroundColor: swatch.background }]}><View style={[styles.swatchDot, { backgroundColor: swatch.primary }]} /><View style={[styles.swatchLine, { backgroundColor: swatch.foreground }]} /></View><Text style={[styles.themeName, { color: swatch.foreground }]}>{option.label}</Text><Text style={[styles.themeDescription, { color: swatch.muted }]}>{option.description}</Text></Pressable>; })}</View><Pressable onPress={() => void goTo("account", { interests: state.interests, themeId })} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Continue</Text><IconSymbol name="arrow.right" size={19} color="#10211D" /></Pressable></ScrollView></ScreenContainer>;
  }

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.centerContent}><Progress step={3} colors={colors} /><BrandMark colors={colors} /><Text style={[styles.title, { color: colors.foreground }]}>{isAuthenticated ? "You’re ready to explore." : "Join the local conversation."}</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{isAuthenticated ? "Your profile and preferences are ready. Let’s take you to what’s happening nearby." : "Browse as a guest, or create your profile to post, connect, and take part in your local community."}</Text>{isAuthenticated ? <Pressable onPress={() => void finishAsGuest()} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Enter Lekka</Text><IconSymbol name="arrow.right" size={19} color="#10211D" /></Pressable> : <><Pressable onPress={openAuth} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Create account</Text></Pressable><Pressable onPress={openAuth} style={styles.outlineButton}><Text style={[styles.outlineText, { color: colors.foreground }]}>Sign in</Text></Pressable><Pressable onPress={() => void finishAsGuest()} style={styles.textButton}><Text style={[styles.mutedButtonLabel, { color: colors.muted }]}>Maybe later — continue exploring</Text></Pressable></>}</View></ScreenContainer>;
}

function BrandMark({ colors }: { colors: ReturnType<typeof useColors> }) { return <View style={[styles.logo, { backgroundColor: colors.primary }]}><IconSymbol name="location.fill" size={28} color="#10211D" /></View>; }
function Progress({ step, colors }: { step: number; colors: ReturnType<typeof useColors> }) { return <View accessibilityLabel={`Onboarding step ${step} of 3`} style={styles.progressRow}>{[1, 2, 3].map((item) => <View key={item} style={[styles.progressBar, { backgroundColor: item <= step ? colors.primary : colors.border }]} />)}</View>; }

const styles = StyleSheet.create({ centerContent: { flex: 1, justifyContent: "center", padding: 24 }, scrollContent: { padding: 24, paddingBottom: 42 }, logo: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 18 }, eyebrow: { fontSize: 12, fontWeight: "900", letterSpacing: 1.5 }, heroTitle: { fontSize: 36, lineHeight: 42, fontWeight: "900", marginTop: 12 }, heroSubtitle: { fontSize: 16, lineHeight: 24, marginTop: 12, maxWidth: 340 }, title: { fontSize: 31, lineHeight: 38, fontWeight: "900", marginTop: 15 }, subtitle: { fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 24 }, primaryButton: { minHeight: 54, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 22 }, primaryText: { color: "#10211D", fontSize: 15, fontWeight: "900" }, textButton: { alignItems: "center", paddingVertical: 13 }, textButtonLabel: { fontSize: 13, fontWeight: "800" }, mutedButtonLabel: { fontSize: 13, fontWeight: "700" }, outlineButton: { minHeight: 52, borderRadius: 17, borderWidth: 1, borderColor: "rgba(128,128,128,0.4)", alignItems: "center", justifyContent: "center", marginTop: 10 }, outlineText: { fontSize: 15, fontWeight: "800" }, privacyCard: { flexDirection: "row", gap: 12, borderRadius: 17, borderWidth: 1, padding: 15, alignItems: "flex-start" }, privacyText: { flex: 1, fontSize: 13, lineHeight: 19 }, progressRow: { flexDirection: "row", gap: 6, marginBottom: 28 }, progressBar: { flex: 1, height: 5, borderRadius: 4 }, interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, interestChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }, interestText: { fontSize: 12, fontWeight: "800" }, label: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginTop: 25, marginBottom: 10 }, themeGrid: { gap: 10 }, themeCard: { borderWidth: 1.5, borderRadius: 17, padding: 12 }, themeSwatch: { height: 54, borderRadius: 12, padding: 12, justifyContent: "center", gap: 7 }, swatchDot: { width: 13, height: 13, borderRadius: 7 }, swatchLine: { width: "55%", height: 7, borderRadius: 4 }, themeName: { fontSize: 14, fontWeight: "900", marginTop: 10 }, themeDescription: { fontSize: 11, marginTop: 3 },
});

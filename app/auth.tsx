import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { isOAuthProviderEnabled, providerDisplayName, type LekkaOAuthProvider } from "@/lib/supabase-oauth";

export default function AuthScreen() {
  const colors = useColors();
  const { next, intent, token } = useLocalSearchParams<{ next?: string; intent?: "personal" | "business"; token?: string }>();
  const { signIn, signUp, signInWithProvider, resetPassword } = useSupabaseAuth();
  const [mode, setMode] = useState<"signIn" | "signUp" | "reset">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [providerBusy, setProviderBusy] = useState<LekkaOAuthProvider | null>(null);
  const isSignIn = mode === "signIn";
  const continueToNext = () => router.replace((next === "onboarding" ? "/onboarding?resume=1" : next === "business-invite" && token ? `/business-invite?token=${encodeURIComponent(token)}` : intent === "business" ? "/business-setup" : "/(tabs)") as never);
  const submit = async () => {
    if (!email.trim() || (mode !== "reset" && !password.trim())) { Alert.alert("Check your details", "Enter the required fields to continue."); return; }
    setBusy(true);
    const result = mode === "signIn" ? await signIn(email.trim(), password) : mode === "signUp" ? await signUp(email.trim(), password, name.trim()) : await resetPassword(email.trim());
    setBusy(false);
    if (result.error) { Alert.alert("Could not continue", "Please check your details and try again."); return; }
    Alert.alert(mode === "reset" ? "Check your inbox" : mode === "signUp" ? "Account created" : "Welcome back", mode === "reset" ? "A password reset link has been sent if the account exists." : "Your local account is ready.", [{ text: "Continue", onPress: continueToNext }]);
  };
  const startProvider = async (provider: LekkaOAuthProvider) => {
    if (!isOAuthProviderEnabled(provider)) {
      Alert.alert(`${providerDisplayName[provider]} sign-in needs setup`, `The secure ${providerDisplayName[provider]} provider has not been enabled for this Lekka build yet. You can continue with email instead.`);
      return;
    }
    setProviderBusy(provider);
    const result = await signInWithProvider(provider);
    setProviderBusy(null);
    if (result.status === "success") { continueToNext(); return; }
    if (result.status === "cancelled") return;
    if (result.status === "configuration_required") { Alert.alert(`${providerDisplayName[provider]} sign-in needs setup`, `The provider configuration is still required before secure sign-in can start.`); return; }
    Alert.alert("Could not continue", result.message);
  };
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.content}><View style={styles.logo}><IconSymbol name="location.fill" size={25} color="#10211D" /></View><Text style={[styles.eyebrow, { color: colors.primary }]}>LEKKA</Text><Text style={[styles.title, { color: colors.foreground }]}>{mode === "signIn" ? "Welcome back." : mode === "signUp" ? intent === "business" ? "Build your local business presence." : "Join your local network." : "Reset your password."}</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{mode === "reset" ? "We’ll send a secure link to your email address." : intent === "business" && mode === "signUp" ? "One secure Lekka identity can manage your personal profile and business profiles." : "Real people, real places, and what matters around you."}</Text>{mode !== "reset" && <><ProviderButton provider="google" busy={providerBusy === "google"} onPress={() => void startProvider("google")} colors={colors} /><ProviderButton provider="azure" busy={providerBusy === "azure"} onPress={() => void startProvider("azure")} colors={colors} /><View style={styles.divider}><View style={[styles.dividerLine, { backgroundColor: colors.border }]} /><Text style={[styles.dividerText, { color: colors.muted }]}>OR</Text><View style={[styles.dividerLine, { backgroundColor: colors.border }]} /></View></>}{mode === "signUp" && <TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /> }<TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /><>{mode !== "reset" && <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />}</><Pressable onPress={submit} disabled={busy} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}><Text style={styles.primaryText}>{busy ? "Please wait…" : mode === "signIn" ? "Continue with email" : mode === "signUp" ? "Create account with email" : "Send reset link"}</Text></Pressable><Pressable onPress={() => setMode(isSignIn ? "signUp" : "signIn")}><Text style={[styles.switchText, { color: colors.primary }]}>{isSignIn ? "New here? Create an account" : "Already have an account? Sign in"}</Text></Pressable>{isSignIn && <Pressable onPress={() => setMode("reset")}><Text style={[styles.secondaryText, { color: colors.muted }]}>Forgot your password?</Text></Pressable>}</View></ScreenContainer>;
}

function ProviderButton({ provider, busy, onPress, colors }: { provider: LekkaOAuthProvider; busy: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  const name = providerDisplayName[provider];
  const enabled = isOAuthProviderEnabled(provider);
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} onPress={onPress} disabled={busy} style={({ pressed }) => [styles.provider, { backgroundColor: colors.surface, borderColor: colors.border, opacity: busy ? 0.6 : pressed ? 0.78 : 1 }]}>{busy ? <ActivityIndicator color={colors.foreground} /> : <><View style={[styles.providerMark, { backgroundColor: provider === "google" ? "#FFFFFF" : "#2563EB" }]}><Text style={[styles.providerMarkText, { color: provider === "google" ? "#4285F4" : "#FFFFFF" }]}>{provider === "google" ? "G" : "M"}</Text></View><Text style={[styles.providerText, { color: colors.foreground }]}>Continue with {name}</Text>{!enabled && <Text style={[styles.setupText, { color: colors.muted }]}>Setup required</Text>}</>}</Pressable>;
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: "center", padding: 24 }, logo: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#E9A23B", alignItems: "center", justifyContent: "center", marginBottom: 18 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }, title: { fontSize: 31, lineHeight: 37, fontWeight: "800", marginTop: 9 }, subtitle: { fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 20 }, provider: { minHeight: 52, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 9 }, providerMark: { width: 25, height: 25, borderRadius: 8, justifyContent: "center", alignItems: "center" }, providerMarkText: { fontSize: 15, fontWeight: "900" }, providerText: { flex: 1, fontSize: 14, fontWeight: "800", marginLeft: 10 }, setupText: { fontSize: 10, fontWeight: "700" }, divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 11 }, dividerLine: { flex: 1, height: 1 }, dividerText: { fontSize: 10, letterSpacing: 1.1, fontWeight: "800" }, input: { minHeight: 52, borderRadius: 15, borderWidth: 1, paddingHorizontal: 15, fontSize: 15, marginBottom: 10 }, primary: { minHeight: 52, borderRadius: 16, justifyContent: "center", alignItems: "center", marginTop: 6 }, primaryText: { color: "#10211D", fontSize: 15, fontWeight: "800" }, switchText: { textAlign: "center", fontSize: 13, fontWeight: "700", marginTop: 19 }, secondaryText: { textAlign: "center", fontSize: 12, marginTop: 15 },
});

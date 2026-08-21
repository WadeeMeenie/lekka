import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { isOAuthProviderEnabled, providerDisplayName, type LekkaOAuthProvider } from "@/lib/supabase-oauth";
import { authFailureMessage, hasAuthSession } from "@/lib/auth-flow";

const AUTH_TIMEOUT_MS = 15_000;

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

  const continueToNext = () => {
    router.replace((next === "onboarding" ? "/onboarding?resume=1" : next === "business-invite" && token ? `/business-invite?token=${encodeURIComponent(token)}` : intent === "business" ? "/business-setup" : "/(tabs)") as never);
  };

  const submit = async () => {
    if (!email.trim() || (mode !== "reset" && !password.trim())) {
      Alert.alert("Check your details", "Enter the required fields to continue.");
      return;
    }

    setBusy(true);
    try {
      const request = mode === "signIn"
        ? signIn(email.trim(), password)
        : mode === "signUp"
          ? signUp(email.trim(), password, name.trim())
          : resetPassword(email.trim());
      const result = await Promise.race([
        request,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("The sign-in request timed out. Check your connection and try again.")), AUTH_TIMEOUT_MS)),
      ]);

      if (result.error) {
        Alert.alert("Could not continue", result.error.message || "Please check your details and try again.");
        return;
      }

      if (mode === "reset") {
        Alert.alert("Check your inbox", "A password reset link has been sent if the account exists.");
      } else if (mode === "signUp" && !hasAuthSession(result)) {
        Alert.alert("Confirm your email", "Your account was created. Confirm your email, then return to sign in.");
      } else {
        continueToNext();
      }
    } catch (error) {
      Alert.alert("Sign-in unavailable", authFailureMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const startProvider = async (provider: LekkaOAuthProvider) => {
    if (!isOAuthProviderEnabled(provider)) {
      Alert.alert(`${providerDisplayName[provider]} sign-in needs setup`, `The secure ${providerDisplayName[provider]} provider has not been enabled for this Lekka build yet. You can continue with email instead.`);
      return;
    }
    setProviderBusy(provider);
    try {
      const result = await signInWithProvider(provider);
      if (result.status === "success") { continueToNext(); return; }
      if (result.status === "cancelled") return;
      if (result.status === "configuration_required") {
        Alert.alert(`${providerDisplayName[provider]} sign-in needs setup`, "The provider configuration is still required before secure sign-in can start.");
        return;
      }
      Alert.alert("Could not continue", result.message);
    } catch (error) {
      Alert.alert("Sign-in unavailable", authFailureMessage(error, "The provider sign-in could not be completed."));
    } finally {
      setProviderBusy(null);
    }
  };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.content}><View style={styles.logo}><IconSymbol name="location.fill" size={25} color="#10211D" /></View><Text style={[styles.eyebrow, { color: colors.primary }]}>LEKKA</Text><Text style={[styles.title, { color: colors.foreground }]}>{mode === "signIn" ? "Welcome back." : mode === "signUp" ? intent === "business" ? "Build your local business presence." : "Join your local network." : "Reset your password."}</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{mode === "reset" ? "We’ll send a secure link to your email address." : intent === "business" && mode === "signUp" ? "One secure Lekka identity can manage your personal profile and business profiles." : "Real people, real places, and what matters around you."}</Text>{mode !== "reset" && <><ProviderButton provider="google" busy={providerBusy === "google"} onPress={() => void startProvider("google")} colors={colors} /><ProviderButton provider="azure" busy={providerBusy === "azure"} onPress={() => void startProvider("azure")} colors={colors} /><View style={styles.divider}><View style={[styles.dividerLine, { backgroundColor: colors.border }]} /><Text style={[styles.dividerText, { color: colors.muted }]}>OR</Text><View style={[styles.dividerLine, { backgroundColor: colors.border }]} /></View></>}{mode === "signUp" && <TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /> }<TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /><>{mode !== "reset" && <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />}</><Pressable onPress={() => void submit()} disabled={busy} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}><Text style={styles.primaryText}>{busy ? "Please wait…" : mode === "signIn" ? "Continue with email" : mode === "signUp" ? "Create account with email" : "Send reset link"}</Text></Pressable><Pressable onPress={() => setMode(isSignIn ? "signUp" : "signIn")}><Text style={[styles.switchText, { color: colors.primary }]}>{isSignIn ? "New here? Create an account" : "Already have an account? Sign in"}</Text></Pressable>{isSignIn && <Pressable onPress={() => setMode("reset")}><Text style={[styles.secondaryText, { color: colors.muted }]}>Forgot your password?</Text></Pressable>}</View></ScreenContainer>;
}

function ProviderButton({ provider, busy, onPress, colors }: { provider: LekkaOAuthProvider; busy: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  const name = providerDisplayName[provider];
  const enabled = isOAuthProviderEnabled(provider);
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} onPress={onPress} disabled={busy} style={({ pressed }) => [styles.provider, { backgroundColor: colors.surface, borderColor: colors.border, opacity: busy ? 0.6 : pressed ? 0.78 : 1 }]}>{busy ? <ActivityIndicator color={colors.foreground} /> : <><ProviderMark provider={provider} /><Text style={[styles.providerText, { color: colors.foreground }]}>Continue with {name}</Text>{!enabled && <Text style={[styles.setupText, { color: colors.muted }]}>Setup required</Text>}</>}</Pressable>;
}

function ProviderMark({ provider }: { provider: LekkaOAuthProvider }) {
  if (provider === "azure") return <View style={styles.microsoftMark}><Svg width={24} height={24} viewBox="0 0 24 24"><Rect x="2" y="2" width="9" height="9" fill="#F35325" /><Rect x="13" y="2" width="9" height="9" fill="#81BC06" /><Rect x="2" y="13" width="9" height="9" fill="#05A6F0" /><Rect x="13" y="13" width="9" height="9" fill="#FFBA08" /></Svg></View>;
  return <View style={styles.googleMark}><Svg width={25} height={25} viewBox="0 0 28 28"><Circle cx="14" cy="14" r="10" fill="none" stroke="#4285F4" strokeWidth="4" strokeDasharray="16 48" /><Path d="M14 4a10 10 0 0 1 8.7 5" fill="none" stroke="#DB4437" strokeWidth="4" /><Path d="M5.3 19a10 10 0 0 1-1.1-8" fill="none" stroke="#F4B400" strokeWidth="4" /><Path d="M5.3 19A10 10 0 0 0 14 24" fill="none" stroke="#0F9D58" strokeWidth="4" /><Path d="M14 14h10" fill="none" stroke="#4285F4" strokeWidth="4" /></Svg></View>;
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: "center", padding: 24 }, logo: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#E9A23B", alignItems: "center", justifyContent: "center", marginBottom: 18 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }, title: { fontSize: 31, lineHeight: 37, fontWeight: "800", marginTop: 9 }, subtitle: { fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 20 }, provider: { minHeight: 52, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 9 }, googleMark: { width: 25, height: 25, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 8 }, microsoftMark: { width: 25, height: 25, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 8, overflow: "hidden" }, providerText: { flex: 1, fontSize: 14, fontWeight: "800", marginLeft: 10 }, setupText: { fontSize: 10, fontWeight: "700" }, divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 11 }, dividerLine: { flex: 1, height: 1 }, dividerText: { fontSize: 10, letterSpacing: 1.1, fontWeight: "800" }, input: { minHeight: 52, borderRadius: 15, borderWidth: 1, paddingHorizontal: 15, fontSize: 15, marginBottom: 10 }, primary: { minHeight: 52, borderRadius: 16, justifyContent: "center", alignItems: "center", marginTop: 6 }, primaryText: { color: "#10211D", fontSize: 15, fontWeight: "800" }, switchText: { textAlign: "center", fontSize: 13, fontWeight: "700", marginTop: 19 }, secondaryText: { textAlign: "center", fontSize: 12, marginTop: 15 } });

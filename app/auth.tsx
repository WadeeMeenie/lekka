import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { hasAuthSession, isAuthTimeout } from "@/lib/auth-flow";
import { asyncErrorMessage } from "@/lib/async-error";
import { getAuthErrorMessage, getConfirmationEmailBody, getConfirmationEmailFooter, getConfirmationEmailIntro, getConfirmationEmailSubject, getPasswordToggleIcon, getPasswordToggleLabel, LEKKA_CONFIRMATION_MESSAGE } from "@/lib/auth-messages";
import { getPasswordRuleResults, getPasswordStrength, getPasswordValidationMessage, isStrongPassword } from "@/lib/password-rules";
import { getPasswordResetValidationMessage, PASSWORD_RESET_SUCCESS_MESSAGE, PASSWORD_UPDATED_LOGIN_MESSAGE } from "@/lib/password-reset";
import { getResendEmailLabel, RESET_RESEND_COOLDOWN_SECONDS } from "@/lib/reset-resend";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

const AUTH_TIMEOUT_MS = 15_000;

export default function AuthScreen() {
  const colors = useColors();
  const { next, intent, token, mode: requestedMode, resetSuccess } = useLocalSearchParams<{ next?: string; intent?: "personal" | "business"; token?: string; mode?: "signIn" | "signUp" | "reset"; resetSuccess?: string }>();
  const { signIn, signUp, resetPassword } = useSupabaseAuth();
  const [mode, setMode] = useState<"signIn" | "signUp" | "reset">(requestedMode === "reset" ? "reset" : "signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (resetSuccess === "1") {
      Alert.alert("Password updated", PASSWORD_UPDATED_LOGIN_MESSAGE);
    }
  }, [resetSuccess]);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isSignIn = mode === "signIn";

  const continueToNext = () => {
    router.replace((next === "onboarding" ? "/onboarding?resume=1" : next === "business-invite" && token ? `/business-invite?token=${encodeURIComponent(token)}` : intent === "business" ? "/business-setup" : "/(tabs)") as never);
  };

  const submit = async () => {
    const resetValidationMessage = mode === "reset" ? getPasswordResetValidationMessage(email) : null;
    if (mode === "reset" && resendCooldown > 0 && resetSent) return;
    if (resetValidationMessage) {
      Alert.alert("Check your email address", resetValidationMessage);
      return;
    }
    if (!email.trim() || (mode !== "reset" && !password.trim())) {
      Alert.alert("Check your details", "Enter the required fields to continue.");
      return;
    }
    if (mode === "signUp" && !isStrongPassword(password)) {
      Alert.alert("Choose a stronger password", getPasswordValidationMessage(password) ?? "Use all of the password requirements shown below.");
      return;
    }

    setBusy(true);
    try {
      const request = mode === "signIn"
        ? signIn(email.trim(), password)
        : mode === "signUp"
          ? signUp(email.trim(), password, name.trim())
          : resetPassword(email.trim(), Linking.createURL("reset-password"));
      const result = await Promise.race([
        request,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("The sign-in request timed out. Check your connection and try again.")), AUTH_TIMEOUT_MS)),
      ]);

      if (result.error) {
        Alert.alert("Could not continue", getAuthErrorMessage(result.error, "Please check your details and try again."));
        return;
      }
      if (mode === "reset") {
        Alert.alert("Check your inbox", PASSWORD_RESET_SUCCESS_MESSAGE);
        setResetSent(true);
        setResendCooldown(RESET_RESEND_COOLDOWN_SECONDS);
      } else if (mode === "signUp" && !hasAuthSession(result)) {
        Alert.alert(getConfirmationEmailSubject(), `${LEKKA_CONFIRMATION_MESSAGE}\n\n${getConfirmationEmailIntro()}\n\n${getConfirmationEmailBody()}\n\n${getConfirmationEmailFooter()}`);
      } else {
        continueToNext();
      }
    } catch (error) {
      if (isAuthTimeout(error)) {
        Alert.alert("Connection problem", "Lekka couldn’t reach the authentication service in time. Check your internet connection and try again.");
      } else {
        Alert.alert("Sign-in unavailable", getAuthErrorMessage(error, asyncErrorMessage(error, "Sign-in unavailable. Check your details and try again.")));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.content}>
        <View style={styles.logo}><IconSymbol name="location.fill" size={25} color="#10211D" /></View>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>LEKKA</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{mode === "signIn" ? "Welcome back." : mode === "signUp" ? intent === "business" ? "Build your local business presence." : "Join your local network." : "Reset your password."}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>{mode === "reset" ? "Enter the email address you use for Lekka. We’ll send a secure reset link if an account exists." : intent === "business" && mode === "signUp" ? "One secure Lekka identity can manage your personal profile and business profiles." : "Use your own email address and create a password for your Lekka account."}</Text>
        {mode === "signUp" && <TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />}
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Your email address" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />
        {mode !== "reset" && <>
          <View style={[styles.passwordRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry={!passwordVisible} placeholder={mode === "signUp" ? "Create your password" : "Password"} placeholderTextColor={colors.muted} style={[styles.passwordInput, { color: colors.foreground }]} />
            <Pressable accessibilityRole="button" accessibilityLabel={getPasswordToggleLabel(passwordVisible)} accessibilityHint="Changes whether your password is visible" onPress={() => setPasswordVisible((visible) => !visible)} style={styles.passwordToggle}><MaterialIcons name={getPasswordToggleIcon(passwordVisible)} size={22} color={colors.muted} /></Pressable>
          </View>
          {mode === "signUp" && <><PasswordStrengthMeter password={password} colors={colors} /><PasswordRequirements password={password} colors={colors} /></>}
        </>}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} onPress={() => void submit()} disabled={busy} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}>{busy && <ActivityIndicator size="small" color="#10211D" />}<Text style={styles.primaryText}>{busy ? "Please wait…" : mode === "signIn" ? "Continue with email" : mode === "signUp" ? "Create account with email" : resetSent ? "Send reset link again" : "Send reset link"}</Text></Pressable>
        {mode === "reset" && resetSent && <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || resendCooldown > 0 }} disabled={busy || resendCooldown > 0} onPress={() => void submit()} style={({ pressed }) => [styles.resend, { borderColor: colors.border, opacity: busy || resendCooldown > 0 ? 0.55 : pressed ? 0.7 : 1 }]}><Text style={[styles.resendText, { color: colors.primary }]}>{getResendEmailLabel(resendCooldown)}</Text></Pressable>}
        <Pressable onPress={() => setMode(mode === "reset" ? "signIn" : isSignIn ? "signUp" : "signIn")}><Text style={[styles.switchText, { color: colors.primary }]}>{mode === "reset" ? "Back to sign in" : isSignIn ? "New here? Create an account" : "Already have an account? Sign in"}</Text></Pressable>
        {isSignIn && <Pressable onPress={() => setMode("reset")}><Text style={[styles.secondaryText, { color: colors.muted }]}>Forgot your password?</Text></Pressable>}
      </View>
    </ScreenContainer>
  );
}

function PasswordStrengthMeter({ password, colors }: { password: string; colors: ReturnType<typeof useColors> }) {
  const strength = getPasswordStrength(password);
  const meterColor = strength.label === "Strong" ? colors.success : strength.label === "Good" ? colors.primary : strength.label === "Fair" ? colors.warning : colors.error;
  return <View accessibilityLabel={strength.label ? `Password strength: ${strength.label}` : "Password strength not yet available"} style={styles.strengthMeter}><View style={styles.strengthHeader}><Text style={[styles.strengthTitle, { color: colors.foreground }]}>Password strength</Text>{strength.label ? <Text style={[styles.strengthLabel, { color: meterColor }]}>{strength.label}</Text> : null}</View><View style={styles.strengthBars}>{[1, 2, 3, 4, 5, 6].map((segment) => <View key={segment} style={[styles.strengthBar, { backgroundColor: segment <= strength.score ? meterColor : colors.border }]} />)}</View></View>;
}

function PasswordRequirements({ password, colors }: { password: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.passwordRequirements}><Text style={[styles.requirementsTitle, { color: colors.foreground }]}>Your password must have:</Text>{getPasswordRuleResults(password).map((rule) => <Text key={rule.id} style={[styles.requirement, { color: rule.valid ? colors.success : colors.muted }]}>{rule.valid ? "✓" : "○"} {rule.label}</Text>)}</View>;
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center", padding: 24 },
  logo: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#E9A23B", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { fontSize: 31, lineHeight: 37, fontWeight: "800", marginTop: 9 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 20 },
  input: { minHeight: 52, borderRadius: 15, borderWidth: 1, paddingHorizontal: 15, fontSize: 15, marginBottom: 10 },
  passwordRow: { minHeight: 52, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center", marginBottom: 8 },
  passwordInput: { flex: 1, minHeight: 52, paddingHorizontal: 15, fontSize: 15 },
  passwordToggle: { minWidth: 48, minHeight: 52, alignItems: "center", justifyContent: "center" },
  strengthMeter: { marginBottom: 10, paddingHorizontal: 4 },
  strengthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  strengthTitle: { fontSize: 12, fontWeight: "800" },
  strengthLabel: { fontSize: 12, fontWeight: "900" },
  strengthBars: { flexDirection: "row", gap: 4 },
  strengthBar: { height: 5, flex: 1, borderRadius: 4 },
  passwordRequirements: { marginBottom: 8, paddingHorizontal: 4 },
  requirementsTitle: { fontSize: 12, fontWeight: "800", marginBottom: 5 },
  requirement: { fontSize: 11, lineHeight: 18, fontWeight: "600" },
  primary: { minHeight: 52, borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", marginTop: 6 },
  primaryText: { color: "#10211D", fontSize: 15, fontWeight: "800" },
  resend: { minHeight: 46, borderRadius: 14, borderWidth: 1, justifyContent: "center", alignItems: "center", marginTop: 10 },
  resendText: { fontSize: 13, fontWeight: "800" },
  switchText: { textAlign: "center", fontSize: 13, fontWeight: "700", marginTop: 19 },
  secondaryText: { textAlign: "center", fontSize: 12, marginTop: 15 },
});

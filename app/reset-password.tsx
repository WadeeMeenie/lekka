import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getPasswordRuleResults, getPasswordStrength, isStrongPassword } from "@/lib/password-rules";
import { getRecoveryTokens, isRecoveryLink } from "@/lib/recovery-link";
import { INVALID_RESET_LINK_BODY, INVALID_RESET_LINK_TITLE, REQUEST_NEW_LINK_LABEL } from "@/lib/reset-link-messages";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordScreen() {
  const colors = useColors();
  const [ready, setReady] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const handleUrl = async (url: string | null) => {
      if (!url || !isRecoveryLink(url) || !supabase) {
        if (mounted) {
          setLinkInvalid(true);
          setError(INVALID_RESET_LINK_BODY);
        }
        return;
      }
      const tokens = getRecoveryTokens(url);
      if (!tokens) {
        if (mounted) {
          setLinkInvalid(true);
          setError(INVALID_RESET_LINK_BODY);
        }
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken });
      if (mounted) {
        setLinkInvalid(Boolean(sessionError));
        setError(sessionError ? INVALID_RESET_LINK_BODY : null);
        setReady(!sessionError);
      }
    };
    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", ({ url }) => void handleUrl(url));
    return () => { mounted = false; subscription.remove(); };
  }, []);

  const save = async () => {
    setError(null);
    if (!isStrongPassword(newPassword)) {
      setError("Choose a stronger password using all of the requirements below.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    if (!supabase) {
      setError("Lekka could not connect to the secure account service. Try again later.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) {
      setError("Lekka could not update your password. Request a new reset link and try again.");
      return;
    }
    router.replace("/auth?resetSuccess=1");
  };

  const strength = getPasswordStrength(newPassword);
  const meterColor = strength.label === "Strong" ? colors.success : strength.label === "Good" ? colors.primary : strength.label === "Fair" ? colors.warning : strength.label === "Weak" ? colors.error : colors.muted;
  const meterLabel = strength.label || "Start typing";
  const passwordReady = isStrongPassword(newPassword);
  const shakeDisabledSubmit = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -4, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -3, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 3, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };
  const handleSubmitPress = () => {
    if (!passwordReady) {
      shakeDisabledSubmit();
      return;
    }
    if (!busy) void save();
  };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} showsVerticalScrollIndicator={false}> <View style={styles.content}><Text style={[styles.eyebrow, { color: colors.primary }]}>LEKKA ACCOUNT</Text><Text style={[styles.title, { color: colors.foreground }]}>Choose a new password.</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Use a password you have not used elsewhere. Your reset link is only valid for this recovery session.</Text>{!ready && !error && <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.muted }]}>Verifying your secure reset link…</Text></View>}{ready && <><View style={[styles.passwordRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry={!visible} placeholder="New password" placeholderTextColor={colors.muted} style={[styles.passwordInput, { color: colors.foreground }]} /><Pressable accessibilityRole="button" accessibilityLabel={visible ? "Hide new password" : "Show new password"} onPress={() => setVisible((current) => !current)} style={styles.toggle}><MaterialIcons name={visible ? "visibility" : "visibility-off"} size={22} color={colors.muted} /></Pressable></View><View accessibilityLabel={strength.label ? `Password strength: ${strength.label}` : "Password strength: start typing"} style={styles.strength}><View style={styles.strengthHeader}><Text style={[styles.strengthTitle, { color: colors.foreground }]}>Password strength</Text><Text style={[styles.strengthLabel, { color: meterColor }]}>{meterLabel}</Text></View><View style={styles.bars}>{[1, 2, 3, 4, 5, 6].map((segment) => <View key={segment} style={[styles.bar, { backgroundColor: segment <= strength.score ? meterColor : colors.border }]} />)}</View></View><Text style={[styles.strengthHint, { color: colors.muted }]}>Aim for Strong by meeting all six requirements.</Text><View accessibilityLabel="Password requirements" style={styles.rules}>{getPasswordRuleResults(newPassword).map((rule) => <View key={rule.id} style={styles.ruleRow}><MaterialIcons accessibilityLabel={rule.valid ? `${rule.label}: met` : `${rule.label}: not met`} name={rule.valid ? "check-circle" : "radio-button-unchecked"} size={16} color={rule.valid ? colors.success : colors.muted} /><Text style={[styles.rule, { color: rule.valid ? colors.success : colors.muted }]}>{rule.label}</Text></View>)}</View><TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!visible} placeholder="Confirm new password" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /><Animated.View style={{ transform: [{ translateX: shakeX }] }}><Pressable accessibilityRole="button" accessibilityLabel="Update password" accessibilityHint={passwordReady ? "Saves your new password" : "Complete all six password requirements to enable this button. Tap to see the button feedback."} accessibilityState={{ disabled: busy || !passwordReady, busy }} onPress={handleSubmitPress} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: busy || !passwordReady ? 0.45 : pressed ? 0.8 : 1 }]}>{busy ? <ActivityIndicator color="#10211D" /> : <Text style={styles.primaryText}>Update password</Text>}</Pressable></Animated.View>{!passwordReady && <Text accessibilityRole="text" style={[styles.submitHint, { color: colors.muted }]}>Complete all six password requirements to enable Update password. Tap the button for a gentle reminder.</Text>}</>}{linkInvalid ? <View style={[styles.linkError, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.linkErrorTitle, { color: colors.foreground }]}>{INVALID_RESET_LINK_TITLE}</Text><Text accessibilityRole="alert" style={[styles.linkErrorBody, { color: colors.muted }]}>{error ?? INVALID_RESET_LINK_BODY}</Text><Pressable accessibilityRole="button" onPress={() => router.replace("/auth?mode=reset")} style={({ pressed }) => [styles.requestLink, { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 }]}><Text style={styles.requestLinkText}>{REQUEST_NEW_LINK_LABEL}</Text></Pressable></View> : error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}<Pressable onPress={() => router.replace("/auth")}><Text style={[styles.back, { color: colors.primary }]}>Back to sign in</Text></Pressable></View></ScrollView></KeyboardAvoidingView></ScreenContainer>;
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 24 },
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  title: { fontSize: 30, lineHeight: 37, fontWeight: "900", marginTop: 9 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 22 },
  loading: { alignItems: "center", gap: 10, paddingVertical: 30 },
  loadingText: { fontSize: 13 },
  passwordRow: { minHeight: 52, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center" },
  passwordInput: { flex: 1, minHeight: 52, paddingHorizontal: 15, fontSize: 15 },
  toggle: { minWidth: 48, minHeight: 52, alignItems: "center", justifyContent: "center" },
  strength: { marginTop: 12, paddingHorizontal: 4 },
  strengthHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  strengthTitle: { fontSize: 12, fontWeight: "800" },
  strengthLabel: { fontSize: 12, fontWeight: "900" },
  strengthHint: { fontSize: 11, lineHeight: 16, marginTop: 6 },
  bars: { flexDirection: "row", gap: 4 },
  bar: { height: 5, flex: 1, borderRadius: 4 },
  rules: { marginTop: 10, marginBottom: 10, paddingHorizontal: 4 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 22 },
  rule: { fontSize: 11, lineHeight: 18, fontWeight: "600" },
  input: { minHeight: 52, borderRadius: 15, borderWidth: 1, paddingHorizontal: 15, fontSize: 15, marginTop: 2 },
  primary: { minHeight: 52, borderRadius: 16, justifyContent: "center", alignItems: "center", marginTop: 16 },
  primaryText: { color: "#10211D", fontSize: 15, fontWeight: "900" },
  submitHint: { fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 8 },
  error: { fontSize: 13, lineHeight: 18, fontWeight: "700", marginTop: 14 },
  linkError: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 16 },
  linkErrorTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  linkErrorBody: { fontSize: 13, lineHeight: 19, marginTop: 7 },
  requestLink: { minHeight: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 14 },
  requestLinkText: { color: "#10211D", fontSize: 14, fontWeight: "900" },
  back: { textAlign: "center", fontSize: 13, fontWeight: "800", marginTop: 20 },
});

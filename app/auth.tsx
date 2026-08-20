import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

export default function AuthScreen() {
  const colors = useColors();
  const { signIn, signUp, resetPassword } = useSupabaseAuth();
  const [mode, setMode] = useState<"signIn" | "signUp" | "reset">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email.trim() || (mode !== "reset" && !password.trim())) { Alert.alert("Check your details", "Enter the required fields to continue."); return; }
    setBusy(true);
    const result = mode === "signIn" ? await signIn(email.trim(), password) : mode === "signUp" ? await signUp(email.trim(), password, name.trim()) : await resetPassword(email.trim());
    setBusy(false);
    if (result.error) { Alert.alert("Could not continue", "Please check your details and try again."); return; }
    Alert.alert(mode === "reset" ? "Check your inbox" : mode === "signUp" ? "Account created" : "Welcome back", mode === "reset" ? "A password reset link has been sent if the account exists." : "Your local account is ready.", [{ text: "Continue", onPress: () => router.replace("/(tabs)") }]);
  };
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.content}><View style={styles.logo}><IconSymbol name="location.fill" size={25} color="#10211D" /></View><Text style={[styles.eyebrow, { color: colors.primary }]}>LOCAL RADAR SA</Text><Text style={[styles.title, { color: colors.foreground }]}>{mode === "signIn" ? "Welcome back." : mode === "signUp" ? "Join your local network." : "Reset your password."}</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{mode === "reset" ? "We’ll send a secure link to your email address." : "Real people, real places, and what matters around you."}</Text>{mode === "signUp" && <TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /> }<TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /><>{mode !== "reset" && <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />}</><Pressable onPress={submit} disabled={busy} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}><Text style={styles.primaryText}>{busy ? "Please wait…" : mode === "signIn" ? "Sign in" : mode === "signUp" ? "Create account" : "Send reset link"}</Text></Pressable><Pressable onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}><Text style={[styles.switchText, { color: colors.primary }]}>{mode === "signIn" ? "New here? Create an account" : "Already have an account? Sign in"}</Text></Pressable>{mode === "signIn" && <Pressable onPress={() => setMode("reset")}><Text style={[styles.secondaryText, { color: colors.muted }]}>Forgot your password?</Text></Pressable>}</View></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: "center", padding: 24 }, logo: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#E9A23B", alignItems: "center", justifyContent: "center", marginBottom: 18 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }, title: { fontSize: 31, lineHeight: 37, fontWeight: "800", marginTop: 9 }, subtitle: { fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 24 }, input: { minHeight: 52, borderRadius: 15, borderWidth: 1, paddingHorizontal: 15, fontSize: 15, marginBottom: 10 }, primary: { minHeight: 52, borderRadius: 16, justifyContent: "center", alignItems: "center", marginTop: 6 }, primaryText: { color: "#10211D", fontSize: 15, fontWeight: "800" }, switchText: { textAlign: "center", fontSize: 13, fontWeight: "700", marginTop: 19 }, secondaryText: { textAlign: "center", fontSize: 12, marginTop: 15 },
});

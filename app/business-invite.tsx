import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { acceptBusinessInvitation } from "@/lib/business-invitations";

export default function BusinessInviteScreen() {
  const colors = useColors();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { isAuthenticated, loading } = useSupabaseAuth();
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const accept = async () => { if (!token) { setError("This invitation link is incomplete."); return; } setBusy(true); setError(null); const result = await acceptBusinessInvitation(token); setBusy(false); if (result.error || !result.data) { setError(result.error?.message ?? "We couldn’t accept this invitation."); return; } router.replace("/business-profiles" as never); };
  if (loading) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}><ActivityIndicator color={colors.primary} /></View></ScreenContainer>;
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}><View style={[styles.mark, { backgroundColor: colors.primary }]}><IconSymbol name="briefcase.fill" size={28} color="#10211D" /></View><Text style={[styles.eyebrow, { color: colors.primary }]}>LEKKA BUSINESS</Text><Text style={[styles.title, { color: colors.foreground }]}>You’ve been invited.</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{isAuthenticated ? "Accept this invitation to join the business with your secure Lekka identity." : "Sign in or create your Lekka account with the email address that received this invitation."}</Text>{error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}{isAuthenticated ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void accept()} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.55 : pressed ? 0.8 : 1 }]}>{busy ? <ActivityIndicator color="#10211D" /> : <Text style={styles.primaryText}>Accept invitation</Text>}</Pressable> : <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/auth", params: { next: "business-invite", token: token ?? "" } } as never)} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}><Text style={styles.primaryText}>Sign in to accept</Text></Pressable>}</View></ScreenContainer>;
}

const styles = StyleSheet.create({ center: { flex: 1, justifyContent: "center", padding: 24 }, mark: { width: 62, height: 62, borderRadius: 21, alignItems: "center", justifyContent: "center", marginBottom: 20 }, eyebrow: { fontSize: 11, letterSpacing: 1.2, fontWeight: "900" }, title: { fontSize: 31, lineHeight: 38, fontWeight: "900", marginTop: 9 }, subtitle: { fontSize: 15, lineHeight: 22, marginTop: 9 }, error: { fontSize: 13, lineHeight: 18, fontWeight: "700", marginTop: 18 }, primary: { minHeight: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 23 }, primaryText: { color: "#10211D", fontSize: 15, fontWeight: "900" } });

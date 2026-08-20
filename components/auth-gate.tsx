import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export function AuthGate({ action, onCancel }: { action: string; onCancel?: () => void }) {
  const colors = useColors();
  const openAuth = () => router.push({ pathname: "/auth", params: { next: "onboarding" } });
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel} accessibilityViewIsModal><View style={styles.overlay}><View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.icon, { backgroundColor: `${colors.primary}20` }]}><IconSymbol name="person.crop.circle.fill" size={30} color={colors.primary} /></View><Text style={[styles.title, { color: colors.foreground }]}>Join Lekka</Text><Text style={[styles.body, { color: colors.muted }]}>Create your profile to {action}, connect and take part in your local community.</Text><Pressable onPress={openAuth} style={[styles.primary, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Create account</Text></Pressable><Pressable onPress={openAuth} style={[styles.outline, { borderColor: colors.border }]}><Text style={[styles.outlineText, { color: colors.foreground }]}>Sign in</Text></Pressable><Pressable onPress={onCancel} style={styles.cancel}><Text style={[styles.cancelText, { color: colors.muted }]}>Maybe later</Text></Pressable></View></View></Modal>;
}

const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: "rgba(16,33,29,0.42)", justifyContent: "flex-end" }, card: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, padding: 24, paddingBottom: 32 }, icon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 }, title: { fontSize: 25, fontWeight: "900" }, body: { fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 20 }, primary: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" }, primaryText: { color: "#10211D", fontSize: 15, fontWeight: "900" }, outline: { minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 10 }, outlineText: { fontSize: 15, fontWeight: "800" }, cancel: { minHeight: 42, alignItems: "center", justifyContent: "center", marginTop: 4 }, cancelText: { fontSize: 13, fontWeight: "700" },
});

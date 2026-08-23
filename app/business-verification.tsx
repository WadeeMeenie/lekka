import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { submitBusinessVerification } from "@/lib/account-repository";

export default function BusinessVerificationScreen() {
  const colors = useColors();
  const { businessId, businessName, state } = useLocalSearchParams<{ businessId: string; businessName?: string; state?: string }>();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(state === "pending");

  const submit = async () => {
    if (!businessId) return;
    setBusy(true);
    setError(null);
    const result = await submitBusinessVerification(businessId, note.trim());
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setSubmitted(true);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.foreground }]}>‹ Account</Text>
        </Pressable>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>LEKKA VERIFIED</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Build trust with local customers.</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Verification is reviewed by Lekka. It cannot be purchased or switched on from the business profile itself.
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.business, { color: colors.foreground }]}>{businessName || "Your business"}</Text>
          <Text style={[styles.status, { color: submitted ? colors.primary : colors.muted }]}>
            {submitted ? "Verification request pending" : "Not verified"}
          </Text>
        </View>
        {!submitted ? (
          <>
            <Text style={[styles.label, { color: colors.muted }]}>OPTIONAL NOTE FOR REVIEW</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={4000}
              placeholder="Tell Lekka anything useful about the business or ownership."
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
            />
            {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
            <Pressable disabled={busy} onPress={() => void submit()} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.55 : pressed ? 0.8 : 1 }]}>
              {busy ? <ActivityIndicator color="#10211D" /> : <Text style={styles.primaryText}>Submit for R200 verification</Text>}
            </Pressable>
          </>
        ) : (
          <View style={[styles.success, { borderColor: colors.border }]}>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Request received.</Text>
            <Text style={[styles.successBody, { color: colors.muted }]}>Lekka will review the request before the verified badge is activated.</Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 24 },
  back: { marginBottom: 28 },
  backText: { fontSize: 14, fontWeight: "800" },
  eyebrow: { fontSize: 11, letterSpacing: 1.2, fontWeight: "900" },
  title: { fontSize: 30, lineHeight: 37, fontWeight: "900", marginTop: 9 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  card: { borderWidth: 1, borderRadius: 17, padding: 16, marginTop: 20 },
  business: { fontSize: 16, fontWeight: "900" },
  status: { fontSize: 12, fontWeight: "800", marginTop: 5 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: "900", marginTop: 22, marginBottom: 7 },
  input: { minHeight: 130, borderWidth: 1, borderRadius: 15, padding: 14, fontSize: 14, textAlignVertical: "top" },
  error: { fontSize: 13, lineHeight: 18, fontWeight: "700", marginTop: 14 },
  primary: { minHeight: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 20 },
  primaryText: { color: "#10211D", fontSize: 14, fontWeight: "900" },
  success: { borderWidth: 1, borderRadius: 17, padding: 17, marginTop: 20 },
  successTitle: { fontSize: 16, fontWeight: "900" },
  successBody: { fontSize: 13, lineHeight: 19, marginTop: 5 },
});

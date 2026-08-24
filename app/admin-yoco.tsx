import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { createYocoTestWebhookSubscription } from "@/lib/yoco";

export default function AdminYocoScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof createYocoTestWebhookSubscription>>["data"]>(null);
  const [error, setError] = useState<string | null>(null);

  const createSubscription = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const response = await createYocoTestWebhookSubscription();
    setLoading(false);
    if (response.error) {
      setError(response.error.message || "Unable to create the Yoco TEST webhook subscription.");
      return;
    }
    setResult(response.data);
  };

  const copySecret = async () => {
    if (!result?.secret) return;
    await Clipboard.setStringAsync(result.secret);
    Alert.alert("Copied", "The webhook secret is now on your clipboard. Paste it into Supabase as YOCO_WEBHOOK_SECRET, then remove it from your clipboard when finished.");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.primary }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>PLATFORM ADMIN</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Yoco TEST setup</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Create the existing Yoco TEST webhook subscription. The deployed Edge Function still performs the authoritative platform-admin check.</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>WEBHOOK</Text>
          <Text style={[styles.value, { color: colors.foreground }]}>payment.created + payment.refunded</Text>
          <Text style={[styles.body, { color: colors.muted }]}>This action must only be run once. If a subscription already exists, stop and verify it before creating another one.</Text>
          <Pressable disabled={loading} onPress={() => void createSubscription()} style={[styles.button, { backgroundColor: colors.primary }, loading && styles.disabled]}>
            {loading ? <ActivityIndicator color="#10211D" /> : <Text style={styles.buttonText}>Verify Yoco TEST webhook</Text>}
          </Pressable>
        </View>

        {error ? <View style={[styles.card, { backgroundColor: `${colors.error}12`, borderColor: colors.error }]}><Text style={[styles.label, { color: colors.error }]}>ERROR</Text><Text style={[styles.body, { color: colors.foreground }]}>{error}</Text></View> : null}

        {result ? <View style={[styles.card, { backgroundColor: `${colors.success}12`, borderColor: colors.success }]}>
          <Text style={[styles.label, { color: colors.success }]}>{result.alreadyExists ? "SUBSCRIPTION VERIFIED" : "SUBSCRIPTION CREATED"}</Text>
          <Text style={[styles.body, { color: colors.foreground }]}>Subscription ID: {result.subscriptionId}</Text>
          <Text style={[styles.body, { color: colors.foreground }]}>Events: {result.eventTypes.join(", ")}</Text>
          <Text style={[styles.body, { color: colors.foreground }]}>Webhook: {result.notificationUrl}</Text>
          {result.secret ? <>
            <Text style={[styles.secretLabel, { color: colors.muted }]}>WEBHOOK SECRET</Text>
            <Text selectable style={[styles.secret, { color: colors.foreground }]}>{result.secret}</Text>
            <Pressable onPress={() => void copySecret()} style={[styles.secondary, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.primary }]}>Copy webhook secret</Text></Pressable>
            <Text style={[styles.warning, { color: colors.warning }]}>Configure this immediately as Supabase Edge Function secret YOCO_WEBHOOK_SECRET. Do not commit or share it.</Text>
          </> : <Text style={[styles.body, { color: colors.success }]}>{result.alreadyExists ? "This TEST webhook already exists. The signing secret is intentionally not returned again by Yoco. If YOCO_WEBHOOK_SECRET is already configured, do not create another webhook." : "Yoco did not return a webhook secret. Do not proceed to payment testing."}</Text>}
        </View> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 60 },
  back: { marginBottom: 24 },
  backText: { fontSize: 14, fontWeight: "900" },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: "900", marginTop: 8 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 18 },
  card: { borderWidth: 1, borderRadius: 17, padding: 16, marginBottom: 12, gap: 8 },
  label: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  value: { fontSize: 16, fontWeight: "900" },
  body: { fontSize: 12, lineHeight: 18 },
  button: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  buttonText: { color: "#10211D", fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.6 },
  secretLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginTop: 10 },
  secret: { fontSize: 12, lineHeight: 18, fontFamily: "monospace" },
  secondary: { minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  secondaryText: { fontSize: 12, fontWeight: "900" },
  warning: { fontSize: 11, lineHeight: 16, marginTop: 4 },
});

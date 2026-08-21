import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { FEEDBACK_DESCRIPTION_LIMIT, FEEDBACK_TITLE_LIMIT, type FeedbackType, validateFeedbackSubmission } from "@/lib/feedback";
import { submitBetaFeedback } from "@/lib/feedback-repository";

const appVersion = Constants.expoConfig?.version ?? "1.0.0";

export default function FeedbackScreen() {
  const colors = useColors();
  const { user } = useSupabaseAuth();
  const [type, setType] = useState<FeedbackType>("bug_report");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    const validation = validateFeedbackSubmission({ type, title, description, appVersion });
    const feedback = validation.data;
    if (!feedback) {
      setError(validation.error);
      return;
    }

    setError(null);
    setSubmitting(true);
    const result = await submitBetaFeedback(feedback);
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message.includes("sign in") ? result.error.message : "We couldn’t send that feedback. Your draft is still here, so please check your connection and try again.");
      return;
    }
    setSubmitted(true);
  };

  if (!user) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.guestContent}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={22} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Feedback</Text></Pressable><View style={[styles.guestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="bubble.left.and.bubble.right.fill" size={28} color={colors.primary} /><Text style={[styles.guestTitle, { color: colors.foreground }]}>Join the beta conversation</Text><Text style={[styles.guestBody, { color: colors.muted }]}>Sign in to send a bug report or feature request directly to the Lekka team.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/auth" as never)} style={({ pressed }) => [styles.signInButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.signInText}>Sign in to send feedback</Text></Pressable></View></View></ScreenContainer>;
  }

  if (submitted) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.guestContent}><View style={[styles.guestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="checkmark.seal.fill" size={32} color={colors.success} /><Text style={[styles.guestTitle, { color: colors.foreground }]}>Thanks for helping shape Lekka</Text><Text style={[styles.guestBody, { color: colors.muted }]}>Your {type === "bug_report" ? "bug report" : "feature request"} has been sent. We read beta feedback to improve the local experience.</Text><Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.signInButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.signInText}>Back to profile</Text></Pressable></View></View></ScreenContainer>;
  }

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={22} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Feedback</Text></Pressable><Text style={[styles.title, { color: colors.foreground }]}>Help improve Lekka</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Tell us what is not working or what would make your local experience better. Your report is shared with the beta team.</Text><Text style={[styles.label, { color: colors.muted }]}>FEEDBACK TYPE</Text><View style={styles.typeGroup}><FeedbackTypeOption active={type === "bug_report"} label="Bug report" detail="Something is not working as expected" onPress={() => setType("bug_report")} colors={colors} /><FeedbackTypeOption active={type === "feature_request"} label="Feature request" detail="An idea that would make Lekka better" onPress={() => setType("feature_request")} colors={colors} /></View><Text style={[styles.label, { color: colors.muted }]}>SHORT TITLE</Text><TextInput value={title} onChangeText={(value) => { setTitle(value); setError(null); }} maxLength={FEEDBACK_TITLE_LIMIT} placeholder="For example: Photos fail on mobile data" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel="Feedback title" returnKeyType="next" /><Text style={[styles.counter, { color: colors.muted }]}>{title.length}/{FEEDBACK_TITLE_LIMIT}</Text><Text style={[styles.label, { color: colors.muted }]}>DETAILS</Text><TextInput value={description} onChangeText={(value) => { setDescription(value); setError(null); }} maxLength={FEEDBACK_DESCRIPTION_LIMIT} multiline placeholder={type === "bug_report" ? "What happened, and what did you expect to happen?" : "What would you like Lekka to help you do?"} placeholderTextColor={colors.muted} style={[styles.input, styles.detailsInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel="Feedback details" textAlignVertical="top" /><Text style={[styles.counter, { color: colors.muted }]}>{description.length}/{FEEDBACK_DESCRIPTION_LIMIT}</Text>{error ? <View accessibilityRole="alert" style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.error }]}><IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.error} /><Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text></View> : null}<Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting }} disabled={submitting} onPress={() => { void submit(); }} style={({ pressed }) => [styles.submitButton, { backgroundColor: colors.primary, opacity: submitting ? 0.55 : 1 }, pressed && !submitting && styles.pressed]}>{submitting ? <ActivityIndicator color="#10211D" /> : <Text style={styles.submitText}>Send feedback</Text>}</Pressable><Text style={[styles.version, { color: colors.muted }]}>Lekka {appVersion}</Text></ScrollView></KeyboardAvoidingView></ScreenContainer>;
}

function FeedbackTypeOption({ active, label, detail, onPress, colors }: { active: boolean; label: string; detail: string; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.typeOption, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }, pressed && styles.pressed]}><View style={[styles.radio, { borderColor: active ? "#10211D" : colors.muted }]}>{active ? <View style={styles.radioDot} /> : null}</View><View style={styles.typeCopy}><Text style={[styles.typeTitle, { color: active ? "#10211D" : colors.foreground }]}>{label}</Text><Text style={[styles.typeDetail, { color: active ? "#10211D" : colors.muted }]}>{detail}</Text></View></Pressable>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  guestContent: { flex: 1, padding: 24, justifyContent: "center" },
  back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 24 },
  backIcon: { transform: [{ rotate: "180deg" }] },
  backText: { fontSize: 14, fontWeight: "700" },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 7 },
  label: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginTop: 22, marginBottom: 8 },
  typeGroup: { gap: 9 },
  typeOption: { minHeight: 74, borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", gap: 11 },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#10211D" },
  typeCopy: { flex: 1 },
  typeTitle: { fontSize: 14, fontWeight: "800" },
  typeDetail: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 15 },
  detailsInput: { minHeight: 148, paddingTop: 14 },
  counter: { alignSelf: "flex-end", marginTop: 5, fontSize: 11, fontWeight: "600" },
  errorCard: { marginTop: 14, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  submitButton: { minHeight: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 22 },
  submitText: { color: "#10211D", fontSize: 15, fontWeight: "900" },
  version: { textAlign: "center", fontSize: 11, marginTop: 12 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  guestCard: { borderWidth: 1, borderRadius: 20, padding: 22, alignItems: "flex-start" },
  guestTitle: { fontSize: 22, lineHeight: 28, fontWeight: "800", marginTop: 14 },
  guestBody: { fontSize: 14, lineHeight: 20, marginTop: 7 },
  signInButton: { alignSelf: "stretch", minHeight: 52, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 20 },
  signInText: { color: "#10211D", fontSize: 14, fontWeight: "900" },
});

import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { GENDER_OPTIONS, type Gender } from "@/lib/account";
import { loadPersonalIdentity, savePersonalIdentity } from "@/lib/account-repository";
import { completeOnboarding, loadOnboardingState } from "@/lib/onboarding";

export default function PersonalDetailsScreen() {
  const colors = useColors();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void loadPersonalIdentity().then(({ data }) => { if (data) { setFirstName(data.first_name ?? ""); setSurname(data.surname ?? ""); setDateOfBirth(data.date_of_birth ?? ""); setGender(data.gender as Gender | null); } }); }, []);
  const save = async () => {
    setBusy(true); setError(null);
    const result = await savePersonalIdentity({ firstName, surname, dateOfBirth, gender });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    if (onboarding === "1") { const state = await loadOnboardingState(); await completeOnboarding({ accountIntent: "personal", interests: state.interests, themeId: state.themeId, area: state.area }); router.replace("/(tabs)"); return; }
    router.back();
  };
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={22} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Account</Text></Pressable><Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR PERSONAL DETAILS</Text><Text style={[styles.title, { color: colors.foreground }]}>Make your profile yours.</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Your date of birth and gender stay private. They are never shown on your public Lekka profile.</Text><Text style={[styles.label, { color: colors.muted }]}>FIRST NAME</Text><TextInput value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /><Text style={[styles.label, { color: colors.muted }]}>SURNAME</Text><TextInput value={surname} onChangeText={setSurname} placeholder="Surname" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /><Text style={[styles.label, { color: colors.muted }]}>DATE OF BIRTH</Text><TextInput value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /><Text style={[styles.label, { color: colors.muted }]}>GENDER (OPTIONAL)</Text><FlatList horizontal data={GENDER_OPTIONS} keyExtractor={(option) => option} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genderRow} renderItem={({ item: option }) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: gender === option }} onPress={() => setGender(gender === option ? null : option)} style={[styles.gender, { backgroundColor: gender === option ? colors.foreground : colors.surface, borderColor: gender === option ? colors.foreground : colors.border }]}><Text style={[styles.genderText, { color: gender === option ? colors.background : colors.muted }]}>{option === "prefer_not_to_say" ? "Prefer not to say" : option[0].toUpperCase() + option.slice(1)}</Text></Pressable>} />{error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}<Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.55 : pressed ? 0.8 : 1 }]}>{busy ? <ActivityIndicator color="#10211D" /> : <Text style={styles.primaryText}>{onboarding === "1" ? "Enter Lekka" : "Save personal details"}</Text>}</Pressable></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 24, paddingBottom: 44 }, back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 28 }, backIcon: { transform: [{ rotate: "180deg" }] }, backText: { fontSize: 14, fontWeight: "700" }, eyebrow: { fontSize: 11, letterSpacing: 1.2, fontWeight: "900" }, title: { fontSize: 30, lineHeight: 37, fontWeight: "900", marginTop: 9 }, subtitle: { fontSize: 14, lineHeight: 20, marginTop: 8 }, label: { fontSize: 10, letterSpacing: 1.1, fontWeight: "900", marginTop: 19, marginBottom: 7 }, input: { minHeight: 52, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 15 }, genderRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, gender: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9 }, genderText: { fontSize: 11, fontWeight: "800" }, error: { fontSize: 13, lineHeight: 18, fontWeight: "700", marginTop: 16 }, primary: { minHeight: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 22 }, primaryText: { color: "#10211D", fontSize: 15, fontWeight: "900" } });

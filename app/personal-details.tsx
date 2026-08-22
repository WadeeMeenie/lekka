import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getPersonalDetailsSaveMessage } from "@/lib/account-errors";
import { GENDER_OPTIONS, type Gender } from "@/lib/account";
import { loadPersonalIdentity, savePersonalIdentity } from "@/lib/account-repository";
import { clampDateParts, displayMonth, formatDateParts, getCurrentYear, MIN_BIRTH_YEAR, parseDateParts, type DateParts, daysInMonth } from "@/lib/date-of-birth";
import { completeOnboarding, loadOnboardingState } from "@/lib/onboarding";

type DateSelector = "year" | "month" | "day";

export default function PersonalDetailsScreen() {
  const colors = useColors();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [dateParts, setDateParts] = useState<DateParts>({ year: null, month: null, day: null });
  const [gender, setGender] = useState<Gender | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSelector, setOpenSelector] = useState<DateSelector | null>(null);

  useEffect(() => {
    void loadPersonalIdentity().then(({ data }) => {
      if (!data) return;
      setFirstName(data.first_name ?? "");
      setSurname(data.surname ?? "");
      setDateParts(parseDateParts(data.date_of_birth ?? ""));
      setGender(data.gender as Gender | null);
    });
  }, []);

  const dateOfBirth = formatDateParts(dateParts);
  const maxDay = daysInMonth(dateParts.year, dateParts.month);
  const years = useMemo(() => Array.from({ length: getCurrentYear() - MIN_BIRTH_YEAR + 1 }, (_, index) => getCurrentYear() - index), []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);
  const days = useMemo(() => Array.from({ length: maxDay }, (_, index) => index + 1), [maxDay]);

  const selectDatePart = (value: number) => {
    setDateParts((current) => clampDateParts({ ...current, [openSelector as string]: value } as DateParts));
    setOpenSelector(null);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    const result = await savePersonalIdentity({ firstName, surname, dateOfBirth, gender });
    setBusy(false);
    if (result.error) {
      setError(getPersonalDetailsSaveMessage(result.error));
      return;
    }
    if (onboarding === "1") {
      const state = await loadOnboardingState();
      await completeOnboarding({ accountIntent: "personal", interests: state.interests, themeId: state.themeId, area: state.area });
      router.replace("/(tabs)");
      return;
    }
    router.back();
  };

  const options = openSelector === "year" ? years : openSelector === "month" ? months : days;
  const selectorTitle = openSelector === "year" ? "Choose your birth year" : openSelector === "month" ? "Choose your birth month" : "Choose your birth day";

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={styles.backIcon} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Account</Text>
        </Pressable>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR PERSONAL DETAILS</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Make your profile yours.</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Your date of birth and gender stay private. They are never shown on your public Lekka profile.</Text>
        <Text style={[styles.label, { color: colors.muted }]}>FIRST NAME</Text>
        <TextInput value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />
        <Text style={[styles.label, { color: colors.muted }]}>SURNAME</Text>
        <TextInput value={surname} onChangeText={setSurname} placeholder="Surname" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />
        <Text style={[styles.label, { color: colors.muted }]}>DATE OF BIRTH</Text>
        <View style={styles.dateRow}>
          <DateButton label={dateParts.year?.toString() ?? "Year"} accessibilityLabel="Choose birth year" onPress={() => setOpenSelector("year")} colors={colors} wide />
          <DateButton label={displayMonth(dateParts.month)} accessibilityLabel="Choose birth month" onPress={() => setOpenSelector("month")} colors={colors} wide />
          <DateButton label={dateParts.day?.toString() ?? "Day"} accessibilityLabel="Choose birth day" onPress={() => setOpenSelector("day")} colors={colors} />
        </View>
        {dateOfBirth ? <Text style={[styles.dateHint, { color: colors.muted }]}>Selected: {dateOfBirth}</Text> : <Text style={[styles.dateHint, { color: colors.muted }]}>Choose your year, month, and day.</Text>}
        <Text style={[styles.label, { color: colors.muted }]}>GENDER (OPTIONAL)</Text>
        <FlatList horizontal data={GENDER_OPTIONS} keyExtractor={(option) => option} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genderRow} renderItem={({ item: option }) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: gender === option }} onPress={() => setGender(gender === option ? null : option)} style={[styles.gender, { backgroundColor: gender === option ? colors.foreground : colors.surface, borderColor: gender === option ? colors.foreground : colors.border }]}><Text style={[styles.genderText, { color: gender === option ? colors.background : colors.muted }]}>{option === "prefer_not_to_say" ? "Prefer not to say" : option[0].toUpperCase() + option.slice(1)}</Text></Pressable>} />
        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.55 : pressed ? 0.8 : 1 }]}>{busy ? <ActivityIndicator color="#10211D" /> : <Text style={styles.primaryText}>{onboarding === "1" ? "Enter Lekka" : "Save personal details"}</Text>}</Pressable>
      </ScrollView>
      <Modal visible={openSelector !== null} transparent animationType="slide" onRequestClose={() => setOpenSelector(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectorTitle}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close date selector" onPress={() => setOpenSelector(null)}><Text style={[styles.closeText, { color: colors.primary }]}>Done</Text></Pressable></View>
            <FlatList data={options} keyExtractor={(item) => item.toString()} initialNumToRender={20} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: (openSelector === "year" ? dateParts.year : openSelector === "month" ? dateParts.month : dateParts.day) === item }} onPress={() => selectDatePart(item)} style={({ pressed }) => [styles.option, { borderBottomColor: colors.border, backgroundColor: pressed ? colors.background : colors.surface }]}><Text style={[styles.optionText, { color: colors.foreground }]}>{openSelector === "month" ? displayMonth(item) : item}</Text></Pressable>} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function DateButton({ label, accessibilityLabel, onPress, colors, wide = false }: { label: string; accessibilityLabel: string; onPress: () => void; colors: ReturnType<typeof useColors>; wide?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.dateButton, wide && styles.dateButtonWide, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}><Text numberOfLines={1} style={[styles.dateButtonText, { color: label === "Year" || label === "Month" || label === "Day" ? colors.muted : colors.foreground }]}>{label}</Text><Text style={[styles.chevron, { color: colors.muted }]}>⌄</Text></Pressable>;
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 44 },
  back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 28 },
  backIcon: { transform: [{ rotate: "180deg" }] },
  backText: { fontSize: 14, fontWeight: "700" },
  eyebrow: { fontSize: 11, letterSpacing: 1.2, fontWeight: "900" },
  title: { fontSize: 30, lineHeight: 37, fontWeight: "900", marginTop: 9 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: "900", marginTop: 19, marginBottom: 7 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 15 },
  dateRow: { flexDirection: "row", gap: 7 },
  dateButton: { minHeight: 52, flex: 1, borderWidth: 1, borderRadius: 15, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateButtonWide: { flex: 1.2 },
  dateButtonText: { fontSize: 13, fontWeight: "700", flexShrink: 1 },
  chevron: { fontSize: 17, marginLeft: 3, marginTop: -4 },
  dateHint: { fontSize: 11, marginTop: 7 },
  genderRow: { flexDirection: "row", gap: 7 },
  gender: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9 },
  genderText: { fontSize: 11, fontWeight: "800" },
  error: { fontSize: 13, lineHeight: 18, fontWeight: "700", marginTop: 16 },
  primary: { minHeight: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 22 },
  primaryText: { color: "#10211D", fontSize: 15, fontWeight: "900" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { maxHeight: "72%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: "900" },
  closeText: { fontSize: 14, fontWeight: "800" },
  option: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: "center", paddingHorizontal: 12, borderRadius: 10 },
  optionText: { fontSize: 16, fontWeight: "700" },
});

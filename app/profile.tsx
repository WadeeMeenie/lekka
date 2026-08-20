import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { loadMyProfile, saveMyProfile } from "@/lib/profile";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, logout } = useSupabaseAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [area, setArea] = useState("Bellville");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void loadMyProfile().then(({ data }) => { if (data) { setDisplayName(data.display_name ?? ""); setUsername(data.username ?? ""); setBio(data.bio ?? ""); setArea(data.home_area ?? "Bellville"); } }); }, []);
  const save = async () => { setBusy(true); const result = await saveMyProfile({ displayName, username, bio, homeArea: area, preferredRadiusM: 5000 }); setBusy(false); if (result.error) Alert.alert("Profile not saved", user ? "Please check your connection and try again." : "Sign in to save a profile."); else Alert.alert("Profile updated", "Your local profile is ready."); };
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.content}><Pressable onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} /><Text style={[styles.backText, { color: colors.foreground }]}>Profile</Text></Pressable><View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>{(displayName || "LM").slice(0, 2).toUpperCase()}</Text></View><Text style={[styles.title, { color: colors.foreground }]}>{user ? "Your local profile" : "Profile preview"}</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{user ? "Keep your identity useful and your location private." : "Sign in to sync your profile across devices."}</Text>{[["Display name", displayName, setDisplayName], ["Username", username, setUsername], ["Home area", area, setArea]].map(([label, value, setter]) => <View key={label as string}><Text style={[styles.label, { color: colors.muted }]}>{label as string}</Text><TextInput value={value as string} onChangeText={setter as (value: string) => void} placeholder={label as string} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>)}<Text style={[styles.label, { color: colors.muted }]}>BIO</Text><TextInput multiline value={bio} onChangeText={setBio} placeholder="A little about you" placeholderTextColor={colors.muted} style={[styles.input, styles.bio, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /><Pressable onPress={save} disabled={busy} style={[styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}><Text style={styles.primaryText}>{busy ? "Saving…" : "Save profile"}</Text></Pressable>{user && <Pressable onPress={() => { void logout().then(() => router.replace("/(tabs)")); }} style={styles.logout}><Text style={[styles.logoutText, { color: colors.error }]}>Sign out</Text></Pressable>}</View></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 24 }, back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 24 }, backText: { fontSize: 14, fontWeight: "700" }, avatar: { width: 70, height: 70, borderRadius: 24, alignItems: "center", justifyContent: "center" }, avatarText: { fontSize: 20, fontWeight: "900", color: "#10211D" }, title: { fontSize: 27, lineHeight: 33, fontWeight: "800", marginTop: 16 }, subtitle: { fontSize: 13, lineHeight: 18, marginTop: 5, marginBottom: 18 }, label: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginTop: 12, marginBottom: 7 }, input: { minHeight: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 15 }, bio: { minHeight: 95, paddingTop: 14, textAlignVertical: "top" }, primary: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 20 }, primaryText: { fontSize: 15, fontWeight: "800", color: "#10211D" }, logout: { alignItems: "center", padding: 16 }, logoutText: { fontWeight: "800", fontSize: 13 },
});

import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { LEKKA_INTERESTS } from "@/lib/onboarding";
import { loadMyProfile, saveMyProfile, saveMyProfileAvatar } from "@/lib/profile";
import { createSignedMediaUrl } from "@/lib/social-repository";
import { DEFAULT_PROFILE_SETTINGS, loadProfileSettings, saveProfileSettings } from "@/lib/profile-settings";
import { useThemeContext } from "@/lib/theme-provider";
import { ThemePalettes, type ThemeId } from "@/constants/theme";

const themeOptions: Array<{ id: ThemeId; label: string }> = [
  { id: "original", label: "Lekka Original" }, { id: "midnight", label: "Midnight" }, { id: "sunset", label: "Sunset" }, { id: "ocean", label: "Ocean" }, { id: "sa-vibe", label: "SA Vibe" }, { id: "neon", label: "Neon" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const { themeId, setThemeId } = useThemeContext();
  const { user, logout } = useSupabaseAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [area, setArea] = useState("Bellville");
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [profileSettings, setProfileSettings] = useState(DEFAULT_PROFILE_SETTINGS);

  useEffect(() => {
    let active = true;
    void loadMyProfile().then(({ data, error }) => {
      if (!active) return;
      setLoading(false);
      if (error && user) setLoadError("We couldn’t load your profile. You can still edit and try saving again.");
      if (data) {
        setDisplayName(data.display_name ?? "");
        setUsername(data.username ?? "");
        setBio(data.bio ?? "");
        setArea(data.home_area ?? "Bellville");
        setInterests(data.interests ?? []);
        if (data.profile_image_path) {
          void createSignedMediaUrl(data.profile_image_path).then(({ data: signed }) => {
            if (active) setAvatarUrl(signed?.signedUrl ?? null);
          });
        }
      }
    });
    return () => { active = false; };
  }, [user]);
  useEffect(() => { void loadProfileSettings().then(setProfileSettings); }, []);
  const completion = useMemo(() => Math.round(([displayName.trim(), username.trim(), bio.trim(), interests.length > 0].filter(Boolean).length / 4) * 100), [bio, displayName, interests.length, username]);
  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.78 });
      if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
    } catch {
      Alert.alert("Photo unavailable", "Lekka couldn’t open your photo library. You can keep using your initials avatar.");
    }
  };
  const save = async () => {
    setBusy(true);
    const result = await saveMyProfile({ displayName, username: username.toLowerCase().replace(/\s+/g, ""), bio, homeArea: area, preferredRadiusM: 5000, interests, locationVisibility: profileSettings.locationVisibility });
    if (!result.error && user) {
      await saveProfileSettings(profileSettings);
      if (avatarUri) {
        setAvatarBusy(true);
        const avatarResult = await saveMyProfileAvatar(avatarUri, "image/jpeg");
        setAvatarBusy(false);
        if (avatarResult.error) Alert.alert("Profile partly saved", "Your details were saved, but the avatar could not upload. Check your connection and try again.");
      }
    }
    setBusy(false);
    if (result.error) Alert.alert("Profile not saved", user ? "We couldn't save your changes. Check your connection and try again." : "Create an account to save a profile.");
    else Alert.alert("Profile updated", "Your Lekka profile is ready.");
  };
  const toggleInterest = (interest: string) => setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]);

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content}><Pressable onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={22} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Profile</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={() => void pickAvatar()} disabled={avatarBusy || !user} style={({ pressed }) => [styles.avatar, { backgroundColor: colors.primary, opacity: avatarBusy || !user ? 0.55 : pressed ? 0.78 : 1 }]}>{avatarUri || avatarUrl ? <Image source={{ uri: avatarUri ?? avatarUrl ?? "" }} contentFit="cover" transition={250} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{(displayName || "LM").slice(0, 2).toUpperCase()}</Text>}</Pressable><Text style={[styles.avatarHint, { color: colors.muted }]}>{avatarBusy ? "Uploading photo…" : user ? "Tap your avatar to change it" : "Sign in to add a photo"}</Text><Text style={[styles.title, { color: colors.foreground }]}>{user ? "Your local profile" : "Profile preview"}</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{user ? "Make your identity useful and your local world more relevant." : "Browse as a guest, then create a profile when you’re ready to take part."}</Text>{loading ? <View accessibilityRole="progressbar" style={[styles.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.loadingText, { color: colors.muted }]}>Loading your profile…</Text></View> : null}{loadError ? <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.error }]}>{loadError}</Text> : null}<View style={[styles.completionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.completionHeader}><Text style={[styles.completionTitle, { color: colors.foreground }]}>Profile {completion}% complete</Text><Text style={[styles.completionMeta, { color: colors.muted }]}>{completion < 100 ? "A few details will improve your local feed." : "Your profile is ready for the local world."}</Text></View><View style={[styles.progressTrack, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${completion}%` }]} /></View></View><Field label="Display name" value={displayName} onChangeText={setDisplayName} colors={colors} /><Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" colors={colors} /><Field label="Home area" value={area} onChangeText={setArea} colors={colors} /><Text style={[styles.label, { color: colors.muted }]}>BIO</Text><TextInput multiline value={bio} onChangeText={setBio} placeholder="A little about you" placeholderTextColor={colors.muted} style={[styles.input, styles.bio, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /><Text style={[styles.label, { color: colors.muted }]}>YOUR INTERESTS</Text><View style={styles.chips}>{LEKKA_INTERESTS.map((interest) => { const selected = interests.includes(interest); return <Pressable key={interest} onPress={() => toggleInterest(interest)} style={[styles.chip, { backgroundColor: selected ? colors.foreground : colors.surface, borderColor: selected ? colors.foreground : colors.border }]}><Text style={[styles.chipText, { color: selected ? colors.background : colors.muted }]}>{interest}</Text></Pressable>; })}</View><Text style={[styles.label, { color: colors.muted }]}>BASIC SETTINGS</Text><View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Local notifications</Text><Text style={[styles.settingMeta, { color: colors.muted }]}>Get updates about activity around you.</Text></View><Switch accessibilityLabel="Local notifications" value={profileSettings.notificationsEnabled} onValueChange={(value) => setProfileSettings((current) => ({ ...current, notificationsEnabled: value }))} trackColor={{ false: colors.border, true: `${colors.primary}80` }} thumbColor={profileSettings.notificationsEnabled ? colors.primary : colors.muted} /></View><View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Show my area</Text><Text style={[styles.settingMeta, { color: colors.muted }]}>{profileSettings.locationVisibility === "area" ? "Show an approximate area, never your exact location." : "Keep your home area hidden from your public profile."}</Text></View><Switch accessibilityLabel="Show my approximate area" value={profileSettings.locationVisibility === "area"} onValueChange={(value) => setProfileSettings((current) => ({ ...current, locationVisibility: value ? "area" : "hidden" }))} trackColor={{ false: colors.border, true: `${colors.primary}80` }} thumbColor={profileSettings.locationVisibility === "area" ? colors.primary : colors.muted } /></View><Text style={[styles.label, { color: colors.muted }]}>APPEARANCE</Text><View style={styles.themes}>{themeOptions.map((option) => { const selected = themeId === option.id; const swatch = ThemePalettes[option.id].light; return <Pressable key={option.id} onPress={() => setThemeId(option.id)} style={[styles.theme, { backgroundColor: swatch.surface, borderColor: selected ? swatch.primary : colors.border }]}><View style={[styles.themePreview, { backgroundColor: swatch.background }]}><View style={[styles.themeDot, { backgroundColor: swatch.primary }]} /></View><Text style={[styles.themeText, { color: swatch.foreground }]}>{option.label}</Text></Pressable>; })}</View><Pressable onPress={save} disabled={busy || !user} style={[styles.primary, { backgroundColor: colors.primary, opacity: busy || !user ? 0.55 : 1 }]}><Text style={styles.primaryText}>{busy ? "Saving…" : user ? "Save profile" : "Sign in to save profile"}</Text></Pressable><Pressable onPress={() => router.push("/saved" as never)} style={[styles.savedLink, { borderColor: colors.border }]}><IconSymbol name="bookmark.fill" size={18} color={colors.primary} /><Text style={[styles.savedLinkText, { color: colors.foreground }]}>Saved posts</Text></Pressable>{user && <><Pressable accessibilityRole="button" onPress={() => router.push("/personal-details" as never)} style={[styles.savedLink, { borderColor: colors.border }]}><IconSymbol name="person.crop.circle.fill" size={18} color={colors.primary} /><Text style={[styles.savedLinkText, { color: colors.foreground }]}>Private personal details</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/business-profiles" as never)} style={[styles.savedLink, { borderColor: colors.border }]}><IconSymbol name="briefcase.fill" size={18} color={colors.primary} /><Text style={[styles.savedLinkText, { color: colors.foreground }]}>Business profiles</Text></Pressable></>}<Pressable accessibilityRole="button" onPress={() => router.push("/feedback" as never)} style={[styles.savedLink, { borderColor: colors.border }]}><IconSymbol name="bubble.left.and.bubble.right.fill" size={18} color={colors.primary} /><Text style={[styles.savedLinkText, { color: colors.foreground }]}>Send beta feedback</Text></Pressable>{user && <Pressable onPress={() => { void logout().then(() => router.replace("/(tabs)")); }} style={styles.logout}><Text style={[styles.logoutText, { color: colors.error }]}>Sign out</Text></Pressable>}</ScrollView></ScreenContainer>;
}

function Field({ label, value, onChangeText, autoCapitalize = "sentences", colors }: { label: string; value: string; onChangeText: (value: string) => void; autoCapitalize?: "sentences" | "none"; colors: ReturnType<typeof useColors> }) { return <><Text style={[styles.label, { color: colors.muted }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} autoCapitalize={autoCapitalize} placeholder={label} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /></>; }

const styles = StyleSheet.create({ content: { padding: 24, paddingBottom: 50 }, loadingCard: { minHeight: 48, borderWidth: 1, borderRadius: 15, justifyContent: "center", paddingHorizontal: 14, marginBottom: 8 }, loadingText: { fontSize: 13, fontWeight: "700" }, errorText: { fontSize: 12, lineHeight: 17, marginBottom: 8 }, back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 24 }, backIcon: { transform: [{ rotate: "180deg" }] }, backText: { fontSize: 14, fontWeight: "700" }, avatar: { width: 70, height: 70, borderRadius: 24, alignItems: "center", justifyContent: "center", overflow: "hidden" }, avatarImage: { width: "100%", height: "100%" }, avatarText: { fontSize: 20, fontWeight: "900", color: "#10211D" }, avatarHint: { fontSize: 11, fontWeight: "700", marginTop: 7 }, title: { fontSize: 27, lineHeight: 33, fontWeight: "800", marginTop: 16 }, subtitle: { fontSize: 13, lineHeight: 18, marginTop: 5, marginBottom: 18 }, completionCard: { borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 8 }, completionHeader: { gap: 3 }, completionTitle: { fontSize: 14, fontWeight: "900" }, completionMeta: { fontSize: 11 }, progressTrack: { height: 7, borderRadius: 4, marginTop: 12, overflow: "hidden" }, progressFill: { height: 7, borderRadius: 4 }, label: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginTop: 12, marginBottom: 7 }, settingCard: { minHeight: 64, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }, settingCopy: { flex: 1, gap: 3 }, settingTitle: { fontSize: 13, fontWeight: "800" }, settingMeta: { fontSize: 11, lineHeight: 15 }, input: { minHeight: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 15 }, bio: { minHeight: 95, paddingTop: 14, textAlignVertical: "top" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 8 }, chipText: { fontSize: 11, fontWeight: "700" }, themes: { gap: 8 }, theme: { borderWidth: 1.5, borderRadius: 15, padding: 9, flexDirection: "row", alignItems: "center", gap: 10 }, themePreview: { width: 42, height: 34, borderRadius: 10, justifyContent: "center", padding: 8 }, themeDot: { width: 12, height: 12, borderRadius: 6 }, themeText: { fontSize: 13, fontWeight: "800" }, primary: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 20 }, primaryText: { fontSize: 15, fontWeight: "800", color: "#10211D" }, savedLink: { minHeight: 48, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 }, savedLinkText: { fontSize: 13, fontWeight: "800" }, logout: { alignItems: "center", padding: 16 }, logoutText: { fontWeight: "800", fontSize: 13 },
});

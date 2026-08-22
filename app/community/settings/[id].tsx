import { useEffect, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { createSignedCommunityMediaUrl, getCommunitySettings, saveCommunityBranding, updateCommunitySettings } from "@/lib/local-directory";
import { validateCommunitySettings } from "@/lib/community-management";

export default function CommunitySettingsScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [rulesText, setRulesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id || !user) { setLoading(false); return () => { active = false; }; }
    void getCommunitySettings(id).then((result) => {
      if (!active) return;
      if (result.error) setError(result.error.message);
      if (result.data) {
        setName(result.data.name);
        setDescription(result.data.description || "");
        setVisibility(result.data.visibility);
        setRulesText((result.data.rules || []).join("\n"));
        setLogoPath(result.data.logo_path || null);
        setCoverPath(result.data.cover_path || null);
        if (result.data.logo_path) void createSignedCommunityMediaUrl(result.data.logo_path).then((signed) => { if (active && signed.data?.signedUrl) setLogoUri(signed.data.signedUrl); });
        if (result.data.cover_path) void createSignedCommunityMediaUrl(result.data.cover_path).then((signed) => { if (active && signed.data?.signedUrl) setCoverUri(signed.data.signedUrl); });
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, user]);

  const pickBranding = async (slot: "logo" | "cover") => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: slot === "logo" ? [1, 1] : [16, 9], quality: 0.78 });
      if (!result.canceled && result.assets[0]) {
        if (slot === "logo") setLogoUri(result.assets[0].uri); else setCoverUri(result.assets[0].uri);
        setSaved(false);
      }
    } catch { setError("Lekka couldn’t open your photo library."); }
  };

  const save = async () => {
    if (!id) return;
    setError(null);
    setSaved(false);
    const validation = validateCommunitySettings({ name, description, visibility, rules: rulesText.split("\n") });
    if (!validation.valid || !validation.value) { setError(validation.error || "Check your community settings."); return; }
    setSaving(true);
    const result = await updateCommunitySettings(id, validation.value);
    if (result.error) { setError(result.error.message); setSaving(false); return; }
    if (logoUri && logoUri.startsWith("file:")) { const branding = await saveCommunityBranding(id, "logo", logoUri); if (branding.error) { setError(`Settings saved, but the community avatar could not upload: ${branding.error.message}`); setSaving(false); return; } setLogoPath(branding.data); }
    if (coverUri && coverUri.startsWith("file:")) { const branding = await saveCommunityBranding(id, "cover", coverUri); if (branding.error) { setError(`Settings saved, but the cover image could not upload: ${branding.error.message}`); setSaving(false); return; } setCoverPath(branding.data); }
    setSaved(true);
    setSaving(false);
  };

  if (authLoading || loading) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={[styles.status, { color: colors.muted }]}>Loading settings…</Text></View></ScreenContainer>;
  if (!user) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}><Text style={[styles.status, { color: colors.foreground }]}>Sign in as the community owner to manage settings.</Text><Pressable onPress={() => router.push("/auth" as never)} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.primaryButtonText}>Sign in</Text></Pressable></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Pressable onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={20} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Community</Text></Pressable><Text style={[styles.title, { color: colors.foreground }]}>Community settings</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Keep your community details clear and welcoming. Only the community owner can save these changes.</Text><Text style={[styles.label, { color: colors.muted }]}>COMMUNITY BRANDING</Text><Pressable accessibilityRole="button" onPress={() => void pickBranding("cover")} style={[styles.coverPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>{coverUri ? <Image source={{ uri: coverUri }} style={styles.coverImage} /> : <View style={[styles.coverPlaceholder, { backgroundColor: colors.primary }]}><IconSymbol name="photo.fill" size={24} color="#10211D" /></View>}<View style={styles.brandingOverlay}><Text style={[styles.brandingTitle, { color: colors.foreground }]}>{coverPath ? "Change cover image" : "Add a cover image"}</Text><Text style={[styles.helper, { color: colors.muted }]}>A wide image shown at the top of your community.</Text></View></Pressable><Pressable accessibilityRole="button" onPress={() => void pickBranding("logo")} style={[styles.logoPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>{logoUri ? <Image source={{ uri: logoUri }} style={styles.logoImage} /> : <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary }]}><IconSymbol name="person.2.fill" size={21} color="#10211D" /></View>}<View><Text style={[styles.brandingTitle, { color: colors.foreground }]}>{logoPath ? "Change community avatar" : "Add a community avatar"}</Text><Text style={[styles.helper, { color: colors.muted }]}>A square image for community cards and lists.</Text></View></Pressable><Text style={[styles.label, { color: colors.muted }]}>COMMUNITY NAME</Text><TextInput value={name} onChangeText={(value) => { setName(value); setError(null); setSaved(false); }} maxLength={80} placeholder="Community name" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel="Community name" returnKeyType="next" /><Text style={[styles.counter, { color: colors.muted }]}>{name.length}/80</Text><Text style={[styles.label, { color: colors.muted }]}>DESCRIPTION</Text><TextInput value={description} onChangeText={(value) => { setDescription(value); setError(null); setSaved(false); }} maxLength={500} multiline placeholder="What is this community about?" placeholderTextColor={colors.muted} style={[styles.input, styles.descriptionInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel="Community description" textAlignVertical="top" /><Text style={[styles.counter, { color: colors.muted }]}>{description.length}/500</Text><View style={styles.visibilityHeader}><View style={styles.visibilityCopy}><Text style={[styles.label, { color: colors.muted }]}>PRIVATE COMMUNITY</Text><Text style={[styles.helper, { color: colors.muted }]}>Only members and the owner can discover private communities.</Text></View><Switch value={visibility === "private"} onValueChange={(value) => { setVisibility(value ? "private" : "public"); setSaved(false); }} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.background} accessibilityLabel="Private community" /></View><Text style={[styles.label, { color: colors.muted }]}>GUIDELINES</Text><Text style={[styles.helper, { color: colors.muted }]}>Add one guideline per line. Up to 12 guidelines, 200 characters each.</Text><TextInput value={rulesText} onChangeText={(value) => { setRulesText(value); setError(null); setSaved(false); }} maxLength={2400} multiline placeholder="Be respectful\nKeep posts local and useful" placeholderTextColor={colors.muted} style={[styles.input, styles.rulesInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel="Community guidelines" textAlignVertical="top" />{error && <View accessibilityRole="alert" style={[styles.messageCard, { borderColor: colors.error, backgroundColor: colors.surface }]}><IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.error} /><Text style={[styles.messageText, { color: colors.foreground }]}>{error}</Text></View>}{saved && <View accessibilityRole="alert" style={[styles.messageCard, { borderColor: colors.success, backgroundColor: colors.surface }]}><IconSymbol name="checkmark.seal.fill" size={18} color={colors.success} /><Text style={[styles.messageText, { color: colors.foreground }]}>Community settings saved.</Text></View>}<Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => { void save(); }} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: saving ? 0.65 : 1 }, pressed && styles.pressed]}>{saving ? <ActivityIndicator color="#10211D" /> : <Text style={styles.primaryButtonText}>Save settings</Text>}</Pressable></ScrollView></KeyboardAvoidingView></ScreenContainer>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, coverPicker: { minHeight: 150, borderWidth: 1, borderRadius: 18, overflow: "hidden", justifyContent: "flex-end", marginBottom: 10 }, coverImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" }, coverPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" }, brandingOverlay: { backgroundColor: "rgba(255,255,255,0.92)", padding: 12 }, brandingTitle: { fontSize: 14, fontWeight: "900" }, logoPicker: { minHeight: 74, borderWidth: 1, borderRadius: 16, padding: 10, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 8 }, logoImage: { width: 54, height: 54, borderRadius: 16 }, logoPlaceholder: { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center" }, content: { padding: 20, paddingBottom: 44 }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }, status: { fontSize: 16, fontWeight: "800", textAlign: "center" }, back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 22 }, backIcon: { transform: [{ rotate: "180deg" }] }, backText: { fontSize: 14, fontWeight: "800" }, title: { fontSize: 28, lineHeight: 34, fontWeight: "900" }, subtitle: { fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 25 }, label: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginTop: 15, marginBottom: 8 }, input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }, descriptionInput: { minHeight: 110 }, rulesInput: { minHeight: 150, lineHeight: 22 }, counter: { textAlign: "right", fontSize: 11, marginTop: 5 }, visibilityHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 9, paddingVertical: 8 }, visibilityCopy: { flex: 1, paddingRight: 15 }, helper: { fontSize: 12, lineHeight: 18 }, primaryButton: { borderRadius: 14, minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 24 }, primaryButtonText: { color: "#10211D", fontSize: 15, fontWeight: "900" }, messageCard: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 18 }, messageText: { flex: 1, fontSize: 13, lineHeight: 18 }, pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});

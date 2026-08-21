import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { UploadProgressCard } from "@/components/ui/upload-progress-card";
import { loadSettings } from "@/lib/local-radar";
import { getLastKnownOrCurrentLocation, type DeviceLocation } from "@/lib/location";
import { attachPostMedia, createPost, uploadMedia } from "@/lib/supabase-repository";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { AuthGate } from "@/components/auth-gate";
import { enqueuePostDraft, syncPendingPostDrafts } from "@/lib/offline-outbox";
import { getMediaUploadPresentation, isRetryableMediaStage, type MediaUploadStage } from "@/lib/media-upload-state";
import { defaultActiveIdentity, loadActiveIdentity, type ActiveIdentity } from "@/lib/active-identity";

const types = [{ label: "Post", icon: "edit" as const }, { label: "Local alert", icon: "exclamationmark.triangle.fill" as const }, { label: "Event", icon: "calendar" as const }, { label: "Listing", icon: "cart.fill" as const }];
const audiences = ["Nearby", "My community", "My followers", "Public"];

export default function CreateScreen() {
  const colors = useColors();
  const { user, isAuthenticated, loading: authLoading } = useSupabaseAuth();
  const [type, setType] = useState("Post");
  const [text, setText] = useState("");
  const [audience, setAudience] = useState("Nearby");
  const [publishing, setPublishing] = useState(false);
  const [activeArea, setActiveArea] = useState("Bellville");
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadStage, setUploadStage] = useState<MediaUploadStage>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeIdentity, setActiveIdentity] = useState<ActiveIdentity>(defaultActiveIdentity);
  useEffect(() => { void loadActiveIdentity().then(setActiveIdentity); }, []);

  if (!authLoading && !isAuthenticated) return <ScreenContainer><View style={styles.guestState}><IconSymbol name="person.crop.circle.fill" size={42} color={colors.primary} /><Text style={[styles.guestTitle, { color: colors.foreground }]}>Create with your local community</Text><Text style={[styles.guestBody, { color: colors.muted }]}>Join Lekka to post updates, share alerts, and contribute to what’s happening around you.</Text><AuthGate action="post" /></View></ScreenContainer>;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
      if (!result.canceled) { setSelectedImage(result.assets[0]); setUploadError(null); setUploadStage("idle"); }
    } catch {
      setUploadStage("error");
      setUploadError("Lekka couldn’t open your photo library. Check permission and try again.");
    }
  };

  const retryQueuedDrafts = async () => {
    if (!user || publishing) return;
    setPublishing(true); setUploadError(null); setUploadStage("uploading-media");
    try {
      const result = await syncPendingPostDrafts(user.id);
      if (result.remaining === 0) { setUploadStage("published"); setUploadError(null); }
      else { setUploadStage("error"); setUploadError(`${result.remaining} draft${result.remaining === 1 ? "" : "s"} still need${result.remaining === 1 ? "s" : ""} a connection retry.`); }
    } catch {
      setUploadStage("error"); setUploadError("Lekka couldn’t retry the saved draft. Keep the app open and try again when you’re back online.");
    } finally { setPublishing(false); }
  };

  const publish = async () => {
    if (!text.trim()) { Alert.alert("Add a little context", "Write something before publishing."); return; }
    if (!user) { setUploadStage("error"); setUploadError("Sign in to publish and keep an account-safe offline draft."); return; }
    setPublishing(true); setUploadError(null); setUploadStage("locating");
    const kind = type === "Local alert" ? "alert" : "post";
    try {
      const settings = await loadSettings();
      const location = await getLastKnownOrCurrentLocation(settings.area);
      const liveLocation = location.status === "granted" ? location.location : null;
      const area = liveLocation?.area ?? settings.area;
      if (liveLocation) { setDeviceLocation(liveLocation); setActiveArea(liveLocation.area); } else setActiveArea(area);
      setUploadStage("creating-post");
      const businessId = activeIdentity.kind === "business" ? activeIdentity.businessId : undefined;
      const remote = await createPost({ kind, category: type === "Local alert" ? "Alert" : undefined, title: type === "Local alert" ? "Community alert" : undefined, body: text.trim(), area, location: liveLocation ?? undefined, visibility: audience === "Public" ? "public" : "nearby", businessId });
      if (remote.error || !remote.data?.id) {
        await enqueuePostDraft({ ownerId: user.id, kind, category: type === "Local alert" ? "Alert" : undefined, title: type === "Local alert" ? "Community alert" : undefined, body: text.trim(), area, visibility: audience === "Public" ? "public" : "nearby", location: liveLocation ?? undefined, businessId, mediaUri: selectedImage?.uri, mediaType: selectedImage?.mimeType ?? undefined, mediaWidth: selectedImage?.width, mediaHeight: selectedImage?.height });
        setUploadStage("queued"); setUploadError(remote.error?.message ?? "Lekka is offline right now."); setText(""); setSelectedImage(null); return;
      }
      if (selectedImage) {
        const storagePath = `${user.id}/${remote.data.id}/primary-media`;
        setUploadStage("uploading-media");
        const upload = await uploadMedia(selectedImage.uri, storagePath, selectedImage.mimeType ?? "image/jpeg");
        if (upload.error) throw upload.error;
        setUploadStage("attaching-media");
        const media = await attachPostMedia({ postId: remote.data.id, storagePath, mediaType: "image", width: selectedImage.width, height: selectedImage.height });
        if (media.error) throw media.error;
      }
      setUploadStage("published"); setText(""); setSelectedImage(null); setUploadError(null);
    } catch (error) {
      if (user) {
        const storagePath = selectedImage ? `${user.id}/pending/primary-media` : undefined;
        await enqueuePostDraft({ ownerId: user.id, kind, category: type === "Local alert" ? "Alert" : undefined, title: type === "Local alert" ? "Community alert" : undefined, body: text.trim(), area: activeArea, visibility: audience === "Public" ? "public" : "nearby", location: deviceLocation ?? undefined, businessId: activeIdentity.kind === "business" ? activeIdentity.businessId : undefined, mediaUri: selectedImage?.uri, mediaType: selectedImage?.mimeType ?? undefined, mediaWidth: selectedImage?.width, mediaHeight: selectedImage?.height, storagePath });
      }
      setUploadStage("queued"); setUploadError(error instanceof Error ? error.message : "Lekka saved this safely and will retry when you reconnect."); setText(""); setSelectedImage(null);
    } finally { setPublishing(false); }
  };

  const presentation = getMediaUploadPresentation(uploadStage);
  const showProgress = uploadStage !== "idle";
  return <ScreenContainer><View style={styles.content}><Text style={[styles.eyebrow, { color: colors.primary }]}>CREATE SOMETHING LOCAL</Text><Text style={[styles.title, { color: colors.foreground }]}>What do you want to share?</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Useful, timely, and close to home.</Text>{activeIdentity.kind === "business" && <View style={[styles.identityBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="briefcase.fill" size={16} color={colors.primary} /><Text style={[styles.identityText, { color: colors.foreground }]}>Posting as {activeIdentity.businessName}</Text></View>}<View style={styles.typeGrid}>{types.map((item) => <Pressable key={item.label} onPress={() => setType(item.label)} style={[styles.typeCard, { borderColor: type === item.label ? colors.primary : colors.border, backgroundColor: type === item.label ? `${colors.primary}15` : colors.surface }]}><IconSymbol name={item.icon === "edit" ? "plus" : item.icon} size={22} color={type === item.label ? colors.primary : colors.muted} /><Text style={[styles.typeText, { color: type === item.label ? colors.primary : colors.foreground }]}>{item.label}</Text></Pressable>)}</View><View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}><TextInput multiline value={text} onChangeText={setText} placeholder={type === "Local alert" ? "What should neighbours know?" : "Share something happening nearby…"} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground }]} textAlignVertical="top"/><View style={[styles.composerFooter, { borderTopColor: colors.border }]}><Pressable onPress={pickImage} disabled={publishing} style={styles.addMedia}><IconSymbol name="photo.fill" size={20} color={colors.primary} /><Text style={[styles.addMediaText, { color: colors.primary }]}>{selectedImage ? "Change photo" : "Add photo"}</Text></Pressable><Text style={[styles.counter, { color: colors.muted }]}>{text.length}/500</Text></View></View>{selectedImage && <Image source={{ uri: selectedImage.uri }} style={styles.preview} resizeMode="cover" />}<Text style={[styles.label, { color: colors.muted }]}>WHERE SHOULD THIS APPEAR?</Text><View style={styles.audienceRow}>{audiences.map((item) => <Pressable key={item} onPress={() => setAudience(item)} style={[styles.audience, { borderColor: audience === item ? colors.foreground : colors.border, backgroundColor: audience === item ? colors.foreground : colors.surface }]}><Text style={[styles.audienceText, { color: audience === item ? colors.background : colors.muted }]}>{item}</Text></Pressable>)}</View><View style={[styles.infoBox, { backgroundColor: `${colors.primary}12` }]}><IconSymbol name="location.fill" size={18} color={colors.primary} /><Text style={[styles.infoText, { color: colors.foreground }]}>Your exact location is never shown. This will appear around {activeArea}.</Text></View>{showProgress && <UploadProgressCard stage={uploadStage} onRetry={isRetryableMediaStage(uploadStage) ? retryQueuedDrafts : undefined} />}{uploadError && <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.error }]}>{uploadError}</Text>}<Pressable onPress={publish} disabled={publishing} style={({ pressed }) => [styles.publish, { backgroundColor: colors.primary, opacity: publishing ? 0.6 : pressed ? 0.85 : 1 }]}><Text style={styles.publishText}>{publishing ? presentation.label : `Publish ${type.toLowerCase()}`}</Text><IconSymbol name="arrow.up.right" size={19} color="#10211D" /></Pressable></View></ScreenContainer>;
}

const styles = StyleSheet.create({ guestState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }, guestTitle: { fontSize: 23, lineHeight: 29, fontWeight: "900", textAlign: "center", marginTop: 16 }, guestBody: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8, maxWidth: 310 }, content: { padding: 20 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }, title: { fontSize: 27, lineHeight: 33, fontWeight: "800", marginTop: 7 }, subtitle: { fontSize: 14, marginTop: 5 }, identityBadge: { borderWidth: 1, borderRadius: 13, paddingVertical: 9, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14, alignSelf: "flex-start" }, identityText: { fontSize: 12, fontWeight: "800" }, typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 22 }, typeCard: { width: "48%", minHeight: 70, borderWidth: 1, borderRadius: 17, padding: 13, gap: 8 }, typeText: { fontSize: 13, fontWeight: "800" }, composer: { borderWidth: 1, borderRadius: 20, marginTop: 20, overflow: "hidden" }, input: { minHeight: 150, padding: 16, fontSize: 15, lineHeight: 22 }, preview: { width: "100%", height: 180, borderRadius: 16, marginTop: 10 }, composerFooter: { borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 13 }, addMedia: { flexDirection: "row", alignItems: "center", gap: 7 }, addMediaText: { fontSize: 12, fontWeight: "700" }, counter: { fontSize: 11 }, label: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginTop: 21, marginBottom: 9 }, audienceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, audience: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9 }, audienceText: { fontSize: 12, fontWeight: "700" }, infoBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, padding: 12, marginTop: 19 }, infoText: { flex: 1, fontSize: 12, lineHeight: 17 }, errorText: { fontSize: 12, lineHeight: 18, marginTop: 9 }, publish: { minHeight: 52, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 }, publishText: { color: "#10211D", fontSize: 15, fontWeight: "800" },
});

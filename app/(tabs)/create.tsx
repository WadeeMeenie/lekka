import { useState } from "react";
import { Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LocalPost, loadPosts, loadSettings, savePosts } from "@/lib/local-radar";
import { getLastKnownOrCurrentLocation, type DeviceLocation } from "@/lib/location";
import { attachPostMedia, createPost, uploadMedia } from "@/lib/supabase-repository";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { AuthGate } from "@/components/auth-gate";
import { enqueuePostDraft } from "@/lib/offline-outbox";

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
  if (!authLoading && !isAuthenticated) return <ScreenContainer><View style={styles.guestState}><IconSymbol name="person.crop.circle.fill" size={42} color={colors.primary} /><Text style={[styles.guestTitle, { color: colors.foreground }]}>Create with your local community</Text><Text style={[styles.guestBody, { color: colors.muted }]}>Join Lekka to post updates, share alerts, and contribute to what’s happening around you.</Text><AuthGate action="post" /></View></ScreenContainer>;
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled) setSelectedImage(result.assets[0]);
  };
  const publish = async () => {
    if (!text.trim()) { Alert.alert("Add a little context", "Write something before publishing."); return; }
    setPublishing(true);
    const kind = type === "Local alert" ? "alert" : "post";
    const settings = await loadSettings();
    const location = await getLastKnownOrCurrentLocation(settings.area);
    const liveLocation = location.status === "granted" ? location.location : null;
    const area = liveLocation?.area ?? settings.area;
    if (liveLocation) { setDeviceLocation(liveLocation); setActiveArea(liveLocation.area); }
    else setActiveArea(area);
    const remote = await createPost({ kind, category: type === "Local alert" ? "Alert" : undefined, title: type === "Local alert" ? "Community alert" : undefined, body: text.trim(), area, location: liveLocation ?? undefined, visibility: audience === "Public" ? "public" : "nearby" });
    if (!remote.error) {
      if (selectedImage && remote.data?.id && user) {
        const storagePath = `${user.id}/${remote.data.id}/primary-media`;
        try {
          await uploadMedia(selectedImage.uri, storagePath, selectedImage.mimeType ?? "image/jpeg");
          const media = await attachPostMedia({ postId: remote.data.id, storagePath, mediaType: "image", width: selectedImage.width, height: selectedImage.height });
          if (media.error) throw media.error;
        } catch {
          setPublishing(false);
          await enqueuePostDraft({ ownerId: user.id, kind, category: type === "Local alert" ? "Alert" : undefined, title: type === "Local alert" ? "Community alert" : undefined, body: text.trim(), area, visibility: audience === "Public" ? "public" : "nearby", location: liveLocation ?? undefined, mediaUri: selectedImage.uri, mediaType: selectedImage.mimeType ?? "image/jpeg", mediaWidth: selectedImage.width, mediaHeight: selectedImage.height, postId: remote.data.id, storagePath });
          setText(""); setSelectedImage(null); setPublishing(false); Alert.alert("Saved as draft", "The post is live, and the photo will retry when Lekka reconnects."); return;
        }
      }
      setText(""); setSelectedImage(null); setPublishing(false); Alert.alert("Published", `Your ${type.toLowerCase()} is now visible to ${audience.toLowerCase()}.`); return;
    }
    if (user) {
      await enqueuePostDraft({ ownerId: user.id, kind, category: type === "Local alert" ? "Alert" : undefined, title: type === "Local alert" ? "Community alert" : undefined, body: text.trim(), area, visibility: audience === "Public" ? "public" : "nearby", location: liveLocation ?? undefined, mediaUri: selectedImage?.uri, mediaType: selectedImage?.mimeType ?? undefined, mediaWidth: selectedImage?.width, mediaHeight: selectedImage?.height });
    }
    setText(""); setPublishing(false); Alert.alert("Saved as draft", "Your authenticated draft will retry when Lekka reconnects.");
  };
  return <ScreenContainer><View style={styles.content}><Text style={[styles.eyebrow, { color: colors.primary }]}>CREATE SOMETHING LOCAL</Text><Text style={[styles.title, { color: colors.foreground }]}>What do you want to share?</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Useful, timely, and close to home.</Text><View style={styles.typeGrid}>{types.map((item) => <Pressable key={item.label} onPress={() => setType(item.label)} style={[styles.typeCard, { borderColor: type === item.label ? colors.primary : colors.border, backgroundColor: type === item.label ? `${colors.primary}15` : colors.surface }]}><IconSymbol name={item.icon === "edit" ? "plus" : item.icon} size={22} color={type === item.label ? colors.primary : colors.muted} /><Text style={[styles.typeText, { color: type === item.label ? colors.primary : colors.foreground }]}>{item.label}</Text></Pressable>)}</View><View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}><TextInput multiline value={text} onChangeText={setText} placeholder={type === "Local alert" ? "What should neighbours know?" : "Share something happening nearby…"} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground }]} textAlignVertical="top"/><View style={[styles.composerFooter, { borderTopColor: colors.border }]}><Pressable onPress={pickImage} style={styles.addMedia}><IconSymbol name="photo.fill" size={20} color={colors.primary} /><Text style={[styles.addMediaText, { color: colors.primary }]}>{selectedImage ? "Change photo" : "Add photo"}</Text></Pressable><Text style={[styles.counter, { color: colors.muted }]}>{text.length}/500</Text></View></View>{selectedImage && <Image source={{ uri: selectedImage.uri }} style={styles.preview} resizeMode="cover" />}<Text style={[styles.label, { color: colors.muted }]}>WHERE SHOULD THIS APPEAR?</Text><View style={styles.audienceRow}>{audiences.map((item) => <Pressable key={item} onPress={() => setAudience(item)} style={[styles.audience, { borderColor: audience === item ? colors.foreground : colors.border, backgroundColor: audience === item ? colors.foreground : colors.surface }]}><Text style={[styles.audienceText, { color: audience === item ? colors.background : colors.muted }]}>{item}</Text></Pressable>)}</View><View style={[styles.infoBox, { backgroundColor: `${colors.primary}12` }]}><IconSymbol name="location.fill" size={18} color={colors.primary} /><Text style={[styles.infoText, { color: colors.foreground }]}>Your exact location is never shown. This will appear around {activeArea}.</Text></View><Pressable onPress={publish} disabled={publishing} style={({ pressed }) => [styles.publish, { backgroundColor: colors.primary, opacity: publishing ? 0.6 : pressed ? 0.85 : 1 }]}><Text style={styles.publishText}>{publishing ? "Publishing…" : `Publish ${type.toLowerCase()}`}</Text><IconSymbol name="arrow.up.right" size={19} color="#10211D" /></Pressable></View></ScreenContainer>;
}

const styles = StyleSheet.create({ guestState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }, guestTitle: { fontSize: 23, lineHeight: 29, fontWeight: "900", textAlign: "center", marginTop: 16 }, guestBody: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8, maxWidth: 310 }, content: { padding: 20 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }, title: { fontSize: 27, lineHeight: 33, fontWeight: "800", marginTop: 7 }, subtitle: { fontSize: 14, marginTop: 5 }, typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 22 }, typeCard: { width: "48%", minHeight: 70, borderWidth: 1, borderRadius: 17, padding: 13, gap: 8 }, typeText: { fontSize: 13, fontWeight: "800" }, composer: { borderWidth: 1, borderRadius: 20, marginTop: 20, overflow: "hidden" }, input: { minHeight: 150, padding: 16, fontSize: 15, lineHeight: 22 }, preview: { width: "100%", height: 180, borderRadius: 16, marginTop: 10 }, composerFooter: { borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 13 }, addMedia: { flexDirection: "row", alignItems: "center", gap: 7 }, addMediaText: { fontSize: 12, fontWeight: "700" }, counter: { fontSize: 11 }, label: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginTop: 21, marginBottom: 9 }, audienceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, audience: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9 }, audienceText: { fontSize: 12, fontWeight: "700" }, infoBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, padding: 12, marginTop: 19 }, infoText: { flex: 1, fontSize: 12, lineHeight: 17 }, publish: { minHeight: 52, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 }, publishText: { color: "#10211D", fontSize: 15, fontWeight: "800" },
});

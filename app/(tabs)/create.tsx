import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LocalPost, loadPosts, savePosts } from "@/lib/local-radar";
import { createPost } from "@/lib/supabase-repository";
import { useColors } from "@/hooks/use-colors";

const types = [{ label: "Post", icon: "edit" as const }, { label: "Local alert", icon: "exclamationmark.triangle.fill" as const }, { label: "Event", icon: "calendar" as const }, { label: "Listing", icon: "cart.fill" as const }];
const audiences = ["Nearby", "My community", "My followers", "Public"];

export default function CreateScreen() {
  const colors = useColors();
  const [type, setType] = useState("Post");
  const [text, setText] = useState("");
  const [audience, setAudience] = useState("Nearby");
  const [publishing, setPublishing] = useState(false);
  const publish = async () => {
    if (!text.trim()) { Alert.alert("Add a little context", "Write something before publishing."); return; }
    setPublishing(true);
    const kind = type === "Local alert" ? "alert" : "post";
    const remote = await createPost({ kind, category: type === "Local alert" ? "Alert" : undefined, title: type === "Local alert" ? "Community alert" : undefined, body: text.trim(), area: "Bellville", visibility: audience === "Public" ? "public" : "nearby" });
    if (!remote.error) {
      setText(""); setPublishing(false); Alert.alert("Published", `Your ${type.toLowerCase()} is now visible to ${audience.toLowerCase()}.`); return;
    }
    const existing = await loadPosts();
    const draft: LocalPost = { id: `draft-${Date.now()}`, kind, category: type === "Local alert" ? "Alert" : undefined, author: "You · Offline draft", initials: "YO", area: "Bellville", distance: "Nearby", time: "saved now", title: type === "Local alert" ? "Community alert" : undefined, body: text.trim(), likes: 0, comments: 0, trusted: false, accent: type === "Local alert" ? "#D95D4F" : "#2F7D67" };
    await savePosts([draft, ...existing]); setText(""); setPublishing(false); Alert.alert("Saved offline", "Your draft is stored on this device and will remain available until you publish it while signed in.");
  };
  return <ScreenContainer><View style={styles.content}><Text style={[styles.eyebrow, { color: colors.primary }]}>CREATE SOMETHING LOCAL</Text><Text style={[styles.title, { color: colors.foreground }]}>What do you want to share?</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Useful, timely, and close to home.</Text><View style={styles.typeGrid}>{types.map((item) => <Pressable key={item.label} onPress={() => setType(item.label)} style={[styles.typeCard, { borderColor: type === item.label ? colors.primary : colors.border, backgroundColor: type === item.label ? `${colors.primary}15` : colors.surface }]}><IconSymbol name={item.icon === "edit" ? "plus" : item.icon} size={22} color={type === item.label ? colors.primary : colors.muted} /><Text style={[styles.typeText, { color: type === item.label ? colors.primary : colors.foreground }]}>{item.label}</Text></Pressable>)}</View><View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}><TextInput multiline value={text} onChangeText={setText} placeholder={type === "Local alert" ? "What should neighbours know?" : "Share something happening nearby…"} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground }]} textAlignVertical="top"/><View style={[styles.composerFooter, { borderTopColor: colors.border }]}><Pressable style={styles.addMedia}><IconSymbol name="photo.fill" size={20} color={colors.primary} /><Text style={[styles.addMediaText, { color: colors.primary }]}>Add photo</Text></Pressable><Text style={[styles.counter, { color: colors.muted }]}>{text.length}/500</Text></View></View><Text style={[styles.label, { color: colors.muted }]}>WHERE SHOULD THIS APPEAR?</Text><View style={styles.audienceRow}>{audiences.map((item) => <Pressable key={item} onPress={() => setAudience(item)} style={[styles.audience, { borderColor: audience === item ? colors.foreground : colors.border, backgroundColor: audience === item ? colors.foreground : colors.surface }]}><Text style={[styles.audienceText, { color: audience === item ? colors.background : colors.muted }]}>{item}</Text></Pressable>)}</View><View style={[styles.infoBox, { backgroundColor: `${colors.primary}12` }]}><IconSymbol name="location.fill" size={18} color={colors.primary} /><Text style={[styles.infoText, { color: colors.foreground }]}>Your exact location is never shown. This will appear around Bellville.</Text></View><Pressable onPress={publish} disabled={publishing} style={({ pressed }) => [styles.publish, { backgroundColor: colors.primary, opacity: publishing ? 0.6 : pressed ? 0.85 : 1 }]}><Text style={styles.publishText}>{publishing ? "Publishing…" : `Publish ${type.toLowerCase()}`}</Text><IconSymbol name="arrow.up.right" size={19} color="#10211D" /></Pressable></View></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 20 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }, title: { fontSize: 27, lineHeight: 33, fontWeight: "800", marginTop: 7 }, subtitle: { fontSize: 14, marginTop: 5 }, typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 22 }, typeCard: { width: "48%", minHeight: 70, borderWidth: 1, borderRadius: 17, padding: 13, gap: 8 }, typeText: { fontSize: 13, fontWeight: "800" }, composer: { borderWidth: 1, borderRadius: 20, marginTop: 20, overflow: "hidden" }, input: { minHeight: 150, padding: 16, fontSize: 15, lineHeight: 22 }, composerFooter: { borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 13 }, addMedia: { flexDirection: "row", alignItems: "center", gap: 7 }, addMediaText: { fontSize: 12, fontWeight: "700" }, counter: { fontSize: 11 }, label: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginTop: 21, marginBottom: 9 }, audienceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, audience: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9 }, audienceText: { fontSize: 12, fontWeight: "700" }, infoBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, padding: 12, marginTop: 19 }, infoText: { flex: 1, fontSize: 12, lineHeight: 17 }, publish: { minHeight: 52, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 }, publishText: { color: "#10211D", fontSize: 15, fontWeight: "800" },
});

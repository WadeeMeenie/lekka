import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AuthGate } from "@/components/auth-gate";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { listSavedPosts, type SocialPost } from "@/lib/social-repository";

export default function SavedScreen() {
  const colors = useColors();
  const { isAuthenticated } = useSupabaseAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [authGateAction, setAuthGateAction] = useState<string | null>(null);
  useEffect(() => { if (!isAuthenticated) { setLoading(false); return; } let mounted = true; void listSavedPosts().then((result) => { if (mounted) setPosts(result.data); }).finally(() => { if (mounted) setLoading(false); }); return () => { mounted = false; }; }, [isAuthenticated]);
  if (!isAuthenticated) return <ScreenContainer><View style={styles.center}>{authGateAction && <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />}<IconSymbol name="bookmark.fill" size={38} color={colors.primary} /><Text style={[styles.title, { color: colors.foreground }]}>Keep useful local things close</Text><Text style={[styles.body, { color: colors.muted }]}>Join Lekka to save posts and return to them later.</Text><Pressable onPress={() => setAuthGateAction("save posts")} style={[styles.primary, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Join Lekka</Text></Pressable></View></ScreenContainer>;
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content}><Pressable onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={20} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Saved</Text></Pressable><Text style={[styles.pageTitle, { color: colors.foreground }]}>Saved posts</Text>{loading ? <Text style={[styles.body, { color: colors.muted }]}>Loading saved posts…</Text> : posts.length === 0 ? <View style={styles.empty}><IconSymbol name="bookmark.fill" size={30} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Save something you want to come back to.</Text></View> : posts.map((post) => <Pressable key={post.id} onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } } as never)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{post.title ?? "Local post"}</Text><Text style={[styles.body, { color: colors.foreground }]} numberOfLines={3}>{post.body}</Text><Text style={[styles.meta, { color: colors.muted }]}>{post.area} · {new Date(post.created_at).toLocaleString()}</Text></Pressable>)}</ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 24, paddingBottom: 50 }, back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 24 }, backIcon: { transform: [{ rotate: "180deg" }] }, backText: { fontSize: 14, fontWeight: "800" }, pageTitle: { fontSize: 28, fontWeight: "900", marginBottom: 18 }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }, title: { fontSize: 24, fontWeight: "900", marginTop: 16, textAlign: "center" }, body: { fontSize: 13, lineHeight: 19, marginTop: 5 }, primary: { minHeight: 50, minWidth: 160, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 20 }, primaryText: { color: "#10211D", fontWeight: "900" }, empty: { alignItems: "center", paddingVertical: 70, gap: 12 }, emptyTitle: { fontSize: 16, fontWeight: "800", textAlign: "center" }, card: { borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 9 }, cardTitle: { fontSize: 15, fontWeight: "900" }, meta: { fontSize: 11, marginTop: 9 },
});

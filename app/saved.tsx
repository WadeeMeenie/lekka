import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AuthGate } from "@/components/auth-gate";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { listSavedPostsSafe } from "@/lib/saved-repository";
import type { SocialPost } from "@/lib/social-repository";

function formatSavedTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 45) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`;
  return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function SavedScreen() {
  const colors = useColors();
  const { isAuthenticated } = useSupabaseAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authGateAction, setAuthGateAction] = useState<string | null>(null);

  const load = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    const result = await listSavedPostsSafe();
    setPosts(result.data);
    if (result.error) setError(result.error.message || "We couldn’t load your saved posts.");
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let mounted = true;
    setLoading(true);
    setError(null);
    void listSavedPostsSafe().then((result) => {
      if (!mounted) return;
      setPosts(result.data);
      if (result.error) setError(result.error.message || "We couldn’t load your saved posts.");
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [isAuthenticated]);

  if (!isAuthenticated) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}>{authGateAction && <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />}<IconSymbol name="bookmark.fill" size={38} color={colors.primary} /><Text style={[styles.title, { color: colors.foreground }]}>Keep useful local things close</Text><Text style={[styles.body, { color: colors.muted }]}>Join Lekka to save posts and return to them later.</Text><Pressable accessibilityRole="button" onPress={() => setAuthGateAction("save posts")} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 }]}><Text style={styles.primaryText}>Join Lekka</Text></Pressable></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={20} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Saved</Text></Pressable><Text style={[styles.pageTitle, { color: colors.foreground }]}>Saved posts</Text>{loading ? <View accessibilityRole="progressbar" style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.body, { color: colors.muted }]}>Loading saved posts…</Text></View> : error ? <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="exclamationmark.triangle.fill" size={30} color={colors.error} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Couldn’t load saved posts</Text><Text style={[styles.body, { color: colors.muted, textAlign: "center" }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={[styles.retry, { borderColor: colors.border }]}><Text style={[styles.retryText, { color: colors.primary }]}>Try again</Text></Pressable></View> : posts.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="bookmark.fill" size={30} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing saved yet</Text><Text style={[styles.body, { color: colors.muted, textAlign: "center" }]}>Save useful local posts and they’ll appear here.</Text></View> : posts.map((post) => <Pressable key={post.id} accessibilityRole="button" accessibilityLabel={`Open saved post${post.title ? `: ${post.title}` : ""}`} onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } } as never)} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.82 : 1 }]}><Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>{post.title ?? "Local post"}</Text><Text style={[styles.body, { color: colors.foreground }]} numberOfLines={3}>{post.body}</Text><Text style={[styles.meta, { color: colors.muted }]}>{post.area} · {formatSavedTime(post.created_at)}</Text></Pressable>)}</ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 24, paddingBottom: 50 }, back: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 18 }, backIcon: { transform: [{ rotate: "180deg" }] }, backText: { fontSize: 14, fontWeight: "800" }, pageTitle: { fontSize: 28, fontWeight: "900", marginBottom: 18 }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }, title: { fontSize: 24, fontWeight: "900", marginTop: 16, textAlign: "center" }, body: { fontSize: 13, lineHeight: 19, marginTop: 5 }, primary: { minHeight: 50, minWidth: 160, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 20 }, primaryText: { color: "#10211D", fontWeight: "900" }, loading: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: 5 }, empty: { borderWidth: 1, borderRadius: 17, alignItems: "center", padding: 24, minHeight: 190, justifyContent: "center", gap: 4 }, emptyTitle: { fontSize: 16, fontWeight: "800", textAlign: "center", marginTop: 5 }, retry: { minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", marginTop: 12 }, retryText: { fontSize: 13, fontWeight: "800" }, card: { minHeight: 112, borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 9, justifyContent: "center" }, cardTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" }, meta: { fontSize: 11, marginTop: 9 },
});

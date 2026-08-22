import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getCommunity } from "@/lib/local-directory";

type Community = { id: string; name: string; description: string | null; area: string; category: string; rules: string | null; created_at: string };

export default function CommunityDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; if (!id) return () => { active = false; }; void getCommunity(id).then((result) => { if (active) setCommunity(result.data as Community | null); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);
  if (loading) return <ScreenContainer><View style={styles.center}><Text style={[styles.status, { color: colors.muted }]}>Loading community…</Text></View></ScreenContainer>;
  if (!community) return <ScreenContainer><View style={styles.center}><Text style={[styles.status, { color: colors.foreground }]}>This community is no longer available.</Text><Pressable onPress={() => router.back()}><Text style={[styles.link, { color: colors.primary }]}>Go back</Text></Pressable></View></ScreenContainer>;
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content}><Pressable onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={20} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Social</Text></Pressable><View style={[styles.hero, { backgroundColor: colors.primary }]}><Text style={styles.initial}>{community.name.slice(0, 1).toUpperCase()}</Text></View><Text style={[styles.eyebrow, { color: colors.primary }]}>PUBLIC COMMUNITY</Text><Text style={[styles.title, { color: colors.foreground }]}>{community.name}</Text><Text style={[styles.meta, { color: colors.muted }]}>{community.area} · {community.category}</Text><View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>About this community</Text><Text style={[styles.body, { color: colors.muted }]}>{community.description || "This community has not added a description yet."}</Text></View>{community.rules && <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Community guidelines</Text><Text style={[styles.body, { color: colors.muted }]}>{community.rules}</Text></View>}<View style={[styles.empty, { borderColor: colors.border }]}><IconSymbol name="bubble.left.fill" size={26} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Conversation coming next</Text><Text style={[styles.body, { color: colors.muted }]}>Community posts will appear here as members start sharing local updates.</Text></View></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 42 }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }, status: { fontSize: 16, fontWeight: "800", textAlign: "center" }, link: { fontWeight: "800" }, back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 22 }, backIcon: { transform: [{ rotate: "180deg" }] }, backText: { fontSize: 14, fontWeight: "800" }, hero: { width: 76, height: 76, borderRadius: 25, alignItems: "center", justifyContent: "center", marginBottom: 18 }, initial: { color: "#FFF", fontSize: 32, fontWeight: "900" }, eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1 }, title: { fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 6 }, meta: { fontSize: 13, marginTop: 5 }, card: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 20 }, cardTitle: { fontSize: 16, fontWeight: "900" }, body: { fontSize: 14, lineHeight: 21, marginTop: 7 }, empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: 18, padding: 21, alignItems: "center", gap: 7, marginTop: 20 }, emptyTitle: { fontSize: 15, fontWeight: "800" },
});

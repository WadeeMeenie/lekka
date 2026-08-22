import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { listCommunities } from "@/lib/local-directory";

type Segment = "Communities" | "Following" | "Messages";
type Community = { id: string; name: string; description: string; area: string; category: string };

export default function SocialScreen() {
  const colors = useColors();
  const { isAuthenticated } = useSupabaseAuth();
  const [authGateAction, setAuthGateAction] = useState<string | null>(null);
  const [segment, setSegment] = useState<Segment>("Communities");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void listCommunities().then(({ data, error: queryError }) => {
      if (!active) return;
      setCommunities((data ?? []) as Community[]);
      setError(queryError ? "We couldn’t load communities. Check your connection and try again." : null);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const openCommunity = (community: Community) => {
    if (!isAuthenticated) {
      setAuthGateAction("join communities");
      return;
    }
    Alert.alert(community.name, community.description || `${community.area} · ${community.category}`);
  };

  return <ScreenContainer><ScrollView contentContainerStyle={styles.content}>{authGateAction && <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />}<View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR PEOPLE</Text><Text style={[styles.title, { color: colors.foreground }]}>Social</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Communities that make your area feel like home.</Text></View><Pressable onPress={() => { if (!isAuthenticated) setAuthGateAction("message people"); else setSegment("Messages"); }} accessibilityLabel="Messages" style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="message.fill" size={21} color={colors.foreground} /></Pressable></View><View style={[styles.segment, { borderBottomColor: colors.border }]}>{(["Communities", "Following", "Messages"] as Segment[]).map((item) => <Pressable key={item} onPress={() => setSegment(item)} style={styles.segmentButton}><Text style={[segment === item ? styles.segmentActive : styles.segmentText, { color: segment === item ? colors.foreground : colors.muted, borderBottomColor: segment === item ? colors.primary : "transparent" }]}>{item}</Text></Pressable>)}</View>{segment === "Communities" ? <><Pressable onPress={() => { if (!isAuthenticated) setAuthGateAction("join communities"); }} style={[styles.invite, { backgroundColor: colors.foreground }]}><View style={styles.inviteIcon}><IconSymbol name="person.3.fill" size={22} color={colors.foreground} /></View><View style={styles.inviteCopy}><Text style={[styles.inviteTitle, { color: colors.background }]}>Find your local people</Text><Text style={[styles.inviteText, { color: `${colors.background}AA` }]}>Join conversations about places, events, and everyday life nearby.</Text></View><IconSymbol name="chevron.right" size={20} color={colors.background} /></Pressable><View style={styles.sectionRow}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Public communities</Text><Text style={[styles.count, { color: colors.muted }]}>{communities.length}</Text></View>{loading ? <Text style={[styles.status, { color: colors.muted }]}>Loading communities…</Text> : error ? <Text accessibilityRole="alert" style={[styles.status, { color: colors.error }]}>{error}</Text> : communities.length === 0 ? <EmptyState colors={colors} title="No public communities yet" body="When local communities are published, they will appear here." /> : communities.map((community) => <Pressable key={community.id} onPress={() => openCommunity(community)} style={[styles.community, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.communityIcon, { backgroundColor: colors.primary }]}><Text style={styles.communityInitial}>{community.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.communityCopy}><Text style={[styles.communityName, { color: colors.foreground }]}>{community.name}</Text><Text style={[styles.communityMeta, { color: colors.muted }]}>{community.area} · {community.category}</Text></View><IconSymbol name="chevron.right" size={18} color={colors.muted} /></Pressable>)}</> : <><Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 25 }]}>{segment}</Text><EmptyState colors={colors} title={segment === "Following" ? "No followed communities yet" : "No conversations yet"} body={segment === "Following" ? "Join a public community to see it in your Following view." : "Messages will appear here when you start a conversation from a profile or listing."} /></>}</ScrollView></ScreenContainer>;
}

function EmptyState({ colors, title, body }: { colors: ReturnType<typeof useColors>; title: string; body: string }) { return <View style={[styles.empty, { borderColor: colors.border }]}><IconSymbol name="message.fill" size={26} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.emptyText, { color: colors.muted }]}>{body}</Text></View>; }

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 40 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }, title: { fontSize: 28, fontWeight: "800", marginTop: 6 }, subtitle: { fontSize: 13, marginTop: 5, maxWidth: 280, lineHeight: 18 }, iconButton: { borderWidth: 1, borderRadius: 14, padding: 10 }, segment: { flexDirection: "row", gap: 22, borderBottomWidth: 1, marginTop: 23 }, segmentButton: { paddingBottom: 0 }, segmentActive: { fontSize: 13, fontWeight: "800", paddingBottom: 11, borderBottomWidth: 2 }, segmentText: { fontSize: 13, fontWeight: "700", paddingBottom: 11, borderBottomWidth: 2 }, invite: { borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 11, marginTop: 19 }, inviteIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF22", alignItems: "center", justifyContent: "center" }, inviteCopy: { flex: 1 }, inviteTitle: { fontSize: 15, fontWeight: "800" }, inviteText: { fontSize: 12, lineHeight: 17, marginTop: 3 }, sectionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 25, marginBottom: 11 }, sectionTitle: { fontSize: 18, fontWeight: "800" }, count: { fontSize: 12, marginTop: 4 }, status: { fontSize: 13, lineHeight: 19, marginTop: 20 }, community: { flexDirection: "row", alignItems: "center", padding: 13, borderRadius: 17, borderWidth: 1, marginBottom: 9 }, communityIcon: { width: 45, height: 45, borderRadius: 15, alignItems: "center", justifyContent: "center", marginRight: 11 }, communityInitial: { color: "#FFF", fontSize: 18, fontWeight: "800" }, communityCopy: { flex: 1 }, communityName: { fontSize: 14, fontWeight: "800" }, communityMeta: { fontSize: 12, marginTop: 4 }, empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: 18, padding: 22, marginTop: 11, alignItems: "center", gap: 7 }, emptyTitle: { fontSize: 14, fontWeight: "800" }, emptyText: { textAlign: "center", fontSize: 12, lineHeight: 17 },
});


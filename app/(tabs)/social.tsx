import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AuthGate } from "@/components/auth-gate";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { listCommunities } from "@/lib/local-directory";
import { supabase } from "@/lib/supabase";

type Segment = "Communities" | "Following" | "Messages";
type Community = { id: string; name: string; description: string; area: string; category: string; visibility: string };
type FollowedCommunity = Community & { membership?: { joined_at: string } };

export default function SocialScreen() {
  const colors = useColors();
  const { user, isAuthenticated } = useSupabaseAuth();
  const [authGateAction, setAuthGateAction] = useState<string | null>(null);
  const [segment, setSegment] = useState<Segment>("Communities");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [following, setFollowing] = useState<FollowedCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const publicResult = await listCommunities();
    setCommunities((publicResult.data ?? []) as Community[]);
    if (user) {
      const result = await supabase?.from("community_members").select("joined_at, communities(id, name, description, area, category, visibility)").eq("user_id", user.id).order("joined_at", { ascending: false });
      setFollowing(((result?.data ?? []) as any[]).map((row) => ({ ...(row.communities ?? {}), membership: { joined_at: row.joined_at } })).filter((item) => item.id));
      setError(publicResult.error?.message ?? result?.error?.message ?? null);
    } else { setFollowing([]); setError(publicResult.error?.message ?? null); }
    setLoading(false);
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  const requireAuth = (action: string) => { if (!isAuthenticated) { setAuthGateAction(action); return false; } return true; };
  const createCommunity = () => { if (requireAuth("create a community")) router.push("/community/create" as never); };
  const openCommunity = (community: Community) => { if (requireAuth("join communities")) router.push({ pathname: "/community/[id]", params: { id: community.id } } as never); };

  return <ScreenContainer><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    {authGateAction && <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />}
    <View style={styles.header}><View style={styles.headerCopy}><Text style={[styles.eyebrow, { color: colors.muted }]}>YOUR PEOPLE</Text><Text style={[styles.title, { color: colors.foreground }]}>Social</Text></View><Pressable onPress={() => { if (requireAuth("message people")) setSegment("Messages"); }} accessibilityLabel="Messages" accessibilityRole="button" style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="message.fill" size={20} color={colors.foreground} /></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>{(["Communities", "Following", "Messages"] as Segment[]).map((item) => { const selected = segment === item; return <Pressable key={item} onPress={() => { if (item === "Messages" && !requireAuth("message people")) return; setSegment(item); }} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.segmentButton, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border }]}><Text style={[styles.segmentText, { color: selected ? colors.background : colors.muted }]}>{item}</Text></Pressable>; })}</ScrollView>
    {segment === "Communities" ? <>
      <View style={styles.sectionRow}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Public communities</Text><Pressable onPress={createCommunity} accessibilityRole="button" style={[styles.createButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="plus" size={16} color={colors.primary} /><Text style={[styles.createText, { color: colors.primary }]}>New</Text></Pressable></View>
      {loading ? <LoadingState colors={colors} /> : error ? <ErrorState colors={colors} message={error} onRetry={() => void load()} /> : communities.length === 0 ? <EmptyState colors={colors} title="No communities yet" body="Be the first to start one in your area." action="Create community" onPress={createCommunity} /> : communities.map((community) => <CommunityRow key={community.id} community={community} colors={colors} onPress={() => openCommunity(community)} />)}
    </> : segment === "Following" ? <>
      <View style={styles.sectionRow}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Communities you follow</Text><Text style={[styles.count, { color: colors.muted }]}>{following.length}</Text></View>
      {loading ? <LoadingState colors={colors} /> : following.length === 0 ? <EmptyState colors={colors} title="No followed communities yet" body="Join a community and it will appear here." action="Browse communities" onPress={() => setSegment("Communities")} /> : following.map((community) => <CommunityRow key={community.id} community={community} colors={colors} onPress={() => openCommunity(community)} />)}
    </> : <MessagesPreview colors={colors} userId={user?.id ?? null} onOpen={() => router.push("/messages" as never)} />}
  </ScrollView></ScreenContainer>;
}

function CommunityRow({ community, colors, onPress }: { community: Community; colors: ReturnType<typeof useColors>; onPress: () => void }) { return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open ${community.name}`} style={({ pressed }) => [styles.community, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><View style={[styles.communityIcon, { backgroundColor: colors.background }]}><Text style={[styles.communityInitial, { color: colors.primary }]}>{community.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.communityCopy}><Text numberOfLines={1} style={[styles.communityName, { color: colors.foreground }]}>{community.name}</Text><Text numberOfLines={1} style={[styles.communityMeta, { color: colors.muted }]}>{community.area} · {community.category}</Text></View><IconSymbol name="chevron.right" size={17} color={colors.muted} /></Pressable>; }
function LoadingState({ colors }: { colors: ReturnType<typeof useColors> }) { return <View style={styles.loadingGroup}>{[1, 2, 3].map((item) => <View key={item} style={[styles.loadingRow, { backgroundColor: colors.surface }]} />)}</View>; }
function ErrorState({ colors, message, onRetry }: { colors: ReturnType<typeof useColors>; message: string; onRetry: () => void }) { return <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Couldn&apos;t load communities</Text><Text style={[styles.emptyText, { color: colors.muted }]}>{message}</Text><Pressable onPress={onRetry} accessibilityRole="button" style={styles.action}><Text style={[styles.actionText, { color: colors.primary }]}>Try again</Text></Pressable></View>; }
function EmptyState({ colors, title, body, action, onPress }: { colors: ReturnType<typeof useColors>; title: string; body: string; action: string; onPress: () => void }) { return <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.background }]}><IconSymbol name="person.3.fill" size={19} color={colors.muted} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.emptyText, { color: colors.muted }]}>{body}</Text><Pressable onPress={onPress} accessibilityRole="button" style={styles.action}><Text style={[styles.actionText, { color: colors.primary }]}>{action}</Text></Pressable></View>; }
function MessagesPreview({ colors, userId, onOpen }: { colors: ReturnType<typeof useColors>; userId: string | null; onOpen: () => void }) { const [count, setCount] = useState(0); useEffect(() => { if (!userId || !supabase) return; let active = true; void supabase.from("direct_conversations").select("id", { count: "exact", head: true }).or(`user_a.eq.${userId},user_b.eq.${userId}`).then((result) => { if (active) setCount(result.count ?? 0); }); return () => { active = false; }; }, [userId]); return <Pressable onPress={onOpen} accessibilityRole="button" style={[styles.messageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.messageIcon, { backgroundColor: colors.background }]}><IconSymbol name="message.fill" size={20} color={colors.primary} /></View><View style={styles.messageCopy}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Private messages</Text><Text style={[styles.emptyText, { color: colors.muted }]}>{count ? `${count} conversation${count === 1 ? "" : "s"}` : "Messages from people will appear here."}</Text></View><IconSymbol name="chevron.right" size={17} color={colors.muted} /></Pressable>; }

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 }, header: { minHeight: 52, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, headerCopy: { flex: 1 }, eyebrow: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8 }, title: { fontSize: 28, lineHeight: 34, fontWeight: "700", marginTop: 2 }, iconButton: { width: 44, height: 44, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" }, segmentRow: { gap: 8, paddingVertical: 12, paddingRight: 16 }, segmentButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" }, segmentText: { fontSize: 13, fontWeight: "500" }, sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 10 }, sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700" }, count: { fontSize: 12 }, createButton: { minHeight: 44, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 5 }, createText: { fontSize: 13, fontWeight: "600" }, community: { minHeight: 68, flexDirection: "row", alignItems: "center", padding: 11, borderRadius: 14, borderWidth: 1, marginBottom: 8 }, communityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 11 }, communityInitial: { fontSize: 17, fontWeight: "700" }, communityCopy: { flex: 1, minWidth: 0 }, communityName: { fontSize: 15, fontWeight: "700" }, communityMeta: { fontSize: 12, marginTop: 3 }, pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] }, loadingGroup: { gap: 8 }, loadingRow: { height: 68, borderRadius: 14 }, empty: { minHeight: 160, borderWidth: 1, borderRadius: 18, padding: 20, alignItems: "center", justifyContent: "center" }, emptyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 9 }, emptyTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700", textAlign: "center" }, emptyText: { maxWidth: 300, fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 4 }, action: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10 }, actionText: { fontSize: 13, fontWeight: "600" }, messageCard: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 8 }, messageIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, messageCopy: { flex: 1 },
});

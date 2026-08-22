import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AuthGate } from "@/components/auth-gate";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { getBuddyState, getFollowState, getPublicProfile, removeBuddy, reportContent, requestBuddy, respondToBuddyRequest, toggleBlock, toggleFollow, type BuddyStatus, type SocialProfile, type SocialPost } from "@/lib/social-repository";
import { listPublicProfilePosts } from "@/lib/supabase-repository";

export default function PublicProfileScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useSupabaseAuth();
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authGateAction, setAuthGateAction] = useState<string | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [buddyStatus, setBuddyStatus] = useState<BuddyStatus>("none");
  const [buddyRequestId, setBuddyRequestId] = useState<string | null>(null);
  const [buddyBusy, setBuddyBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    void Promise.all([getPublicProfile(id), getFollowState(id), getBuddyState(id), listPublicProfilePosts(id, null)]).then(([profileResult, followResult, buddyResult, postsResult]) => {
      if (!mounted) return;
      setProfile(profileResult.data);
      if (followResult.data) { setFollowing(followResult.data.following); setFollowers(followResult.data.followers); setFollowingCount(followResult.data.followingCount); }
      if (buddyResult.data) { setBuddyStatus(buddyResult.data.status); setBuddyRequestId(buddyResult.data.requestId); }
      setPosts(postsResult.data); setPostsCursor(postsResult.nextCursor);
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  const loadMorePosts = async () => {
    if (!postsCursor || postsLoading) return;
    setPostsLoading(true);
    try { const page = await listPublicProfilePosts(id, postsCursor); setPosts((current) => { const seen = new Set(current.map((post) => post.id)); return [...current, ...page.data.filter((post) => !seen.has(post.id))]; }); setPostsCursor(page.nextCursor); } finally { setPostsLoading(false); }
  };
  const reportProfile = async () => { if (!isAuthenticated) { setAuthGateAction("report profiles"); return; } const result = await reportContent({ profileId: id, reason: "User report" }); Alert.alert(result.error ? "Couldn’t report" : "Report received", result.error ? "Please try again." : "Thanks. The report has been recorded for review."); };
  const blockProfile = async () => { if (!isAuthenticated) { setAuthGateAction("block people"); return; } const result = await toggleBlock(id); if (result.error) { Alert.alert("Couldn’t update block", result.error.message); return; } setBlocked(result.blocked); setFollowing(false); Alert.alert(result.blocked ? "Profile blocked" : "Profile unblocked", result.blocked ? "This profile can no longer follow or interact with you through supported actions." : "Interactions are restored."); };
  const follow = async () => {
    if (!isAuthenticated) { setAuthGateAction("follow people"); return; }
    const result = await toggleFollow(id);
    if (result.error) { Alert.alert("Couldn’t update follow", result.error.message); return; }
    setFollowing(result.following); setFollowers((current) => Math.max(0, current + (result.following ? 1 : -1)));
  };
  const manageBuddy = async () => {
    if (!isAuthenticated) { setAuthGateAction("add Buddies"); return; }
    setBuddyBusy(true);
    let result: { error: Error | null | undefined };
    if (buddyStatus === "buddies") {
      result = await removeBuddy(id);
      if (!result.error) { setBuddyStatus("none"); setBuddyRequestId(null); }
    } else if (buddyStatus === "incoming" && buddyRequestId) {
      result = await respondToBuddyRequest(buddyRequestId, "accepted");
      if (!result.error) setBuddyStatus("buddies");
    } else if (buddyStatus === "outgoing") {
      result = { error: null };
      Alert.alert("Buddy request sent", "This person can accept your request from their Lekka menu.");
    } else {
      result = await requestBuddy(id);
      if (!result.error) setBuddyStatus("outgoing");
    }
    if (result.error) Alert.alert("Couldn’t update Buddy", result.error.message);
    setBuddyBusy(false);
  };
  if (authGateAction) return <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />;
  if (loading) return <ScreenContainer><View style={styles.center}><Text style={[styles.status, { color: colors.muted }]}>Loading profile…</Text></View></ScreenContainer>;
  if (!profile) return <ScreenContainer><View style={styles.center}><Text style={[styles.status, { color: colors.foreground }]}>Profile unavailable</Text><Pressable onPress={() => router.back()}><Text style={[styles.link, { color: colors.primary }]}>Go back</Text></Pressable></View></ScreenContainer>;
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content}><Pressable onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={20} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Profile</Text></Pressable>{authGateAction && <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />}<View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>{(profile.display_name || "LN").slice(0, 2).toUpperCase()}</Text></View><Text style={[styles.title, { color: colors.foreground }]}>{profile.display_name || "Local neighbour"}</Text><Text style={[styles.username, { color: colors.muted }]}>{profile.username ? `@${profile.username}` : ""}</Text>{profile.bio && <Text style={[styles.bio, { color: colors.foreground }]}>{profile.bio}</Text>}<View style={styles.stats}><Stat value={followers} label="Followers" colors={colors} /><Stat value={followingCount} label="Following" colors={colors} /><Stat value={profile.interests.length} label="Interests" colors={colors} /></View><View style={styles.connectionActions}><Pressable onPress={follow} disabled={blocked} style={[styles.follow, styles.connectionButton, { backgroundColor: following ? colors.surface : colors.primary, borderColor: colors.primary, opacity: blocked ? 0.5 : 1 }]}><Text style={[styles.followText, { color: following ? colors.foreground : "#10211D" }]}>{blocked ? "Blocked" : following ? "Following" : "Follow"}</Text></Pressable><Pressable onPress={() => void manageBuddy()} disabled={blocked || buddyBusy} style={[styles.buddy, styles.connectionButton, { backgroundColor: buddyStatus === "buddies" ? `${colors.primary}18` : colors.surface, borderColor: colors.primary, opacity: blocked || buddyBusy ? 0.5 : 1 }]}><Text style={[styles.followText, { color: colors.foreground }]}>{buddyStatus === "buddies" ? "Buddies" : buddyStatus === "incoming" ? "Accept Buddy" : buddyStatus === "outgoing" ? "Request sent" : "Add Buddy"}</Text></Pressable></View><View style={styles.profileActions}><Pressable onPress={reportProfile}><Text style={[styles.actionLink, { color: colors.muted }]}>Report</Text></Pressable><Pressable onPress={blockProfile}><Text style={[styles.actionLink, { color: colors.error }]}>{blocked ? "Unblock" : "Block"}</Text></Pressable></View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Local identity</Text><View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.metaRow}><IconSymbol name="location.fill" size={18} color={colors.primary} /><Text style={[styles.areaMeta, { color: colors.foreground }]}>{profile.home_area || "Local area"}</Text></View><Text style={[styles.label, { color: colors.muted }]}>INTERESTS</Text><View style={styles.chips}>{profile.interests.length ? profile.interests.map((interest) => <View key={interest} style={[styles.chip, { borderColor: colors.border }]}><Text style={[styles.chipText, { color: colors.muted }]}>{interest}</Text></View>) : <Text style={[styles.empty, { color: colors.muted }]}>No interests shared yet.</Text>}</View></View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Posts</Text>{posts.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>No public posts yet.</Text> : posts.map((post) => <Pressable key={post.id} onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } } as never)} style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.postTitle, { color: colors.foreground }]}>{post.title ?? "Local post"}</Text><Text style={[styles.postBody, { color: colors.foreground }]} numberOfLines={3}>{post.body}</Text><Text style={[styles.meta, { color: colors.muted }]}>{post.area} · {new Date(post.created_at).toLocaleString()}</Text></Pressable>)}{postsCursor && <Pressable onPress={loadMorePosts} disabled={postsLoading} style={[styles.loadMore, { borderColor: colors.border }]}><Text style={[styles.loadMoreText, { color: colors.primary }]}>{postsLoading ? "Loading…" : "Load more posts"}</Text></Pressable>}</ScrollView></ScreenContainer>;
}

function Stat({ value, label, colors }: { value: number; label: string; colors: ReturnType<typeof useColors> }) { return <View style={styles.stat}><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text></View>; }
const styles = StyleSheet.create({ content: { padding: 24, paddingBottom: 50 }, back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 24 }, backIcon: { transform: [{ rotate: "180deg" }] }, backText: { fontSize: 14, fontWeight: "800" }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }, status: { fontSize: 16, fontWeight: "800" }, link: { fontWeight: "800" }, avatar: { width: 76, height: 76, borderRadius: 26, alignItems: "center", justifyContent: "center" }, avatarText: { color: "#10211D", fontSize: 23, fontWeight: "900" }, title: { fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 16 }, username: { fontSize: 13, marginTop: 3 }, bio: { fontSize: 14, lineHeight: 21, marginTop: 14 }, stats: { flexDirection: "row", gap: 34, marginTop: 22 }, stat: { gap: 3 }, statValue: { fontSize: 18, fontWeight: "900" }, statLabel: { fontSize: 11 }, connectionActions: { flexDirection: "row", gap: 9, marginTop: 22 }, connectionButton: { flex: 1, marginTop: 0 }, follow: { minHeight: 48, borderWidth: 1, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 22 }, buddy: { minHeight: 48, borderWidth: 1, borderRadius: 15, alignItems: "center", justifyContent: "center" }, followText: { fontSize: 14, fontWeight: "900" }, sectionTitle: { fontSize: 19, fontWeight: "900", marginTop: 28, marginBottom: 11 }, card: { borderWidth: 1, borderRadius: 18, padding: 15 }, metaRow: { flexDirection: "row", alignItems: "center", gap: 8 }, areaMeta: { fontSize: 14, fontWeight: "800" }, label: { fontSize: 10, fontWeight: "800", letterSpacing: 1, marginTop: 18, marginBottom: 8 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 }, chipText: { fontSize: 11, fontWeight: "700" }, empty: { fontSize: 13, lineHeight: 19 }, postCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 9 }, postTitle: { fontSize: 14, fontWeight: "900" }, postBody: { fontSize: 13, lineHeight: 19, marginTop: 5 }, meta: { fontSize: 10, marginTop: 8 }, loadMore: { minHeight: 45, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 5 }, loadMoreText: { fontSize: 13, fontWeight: "900" }, profileActions: { flexDirection: "row", justifyContent: "center", gap: 24, marginTop: 12 }, actionLink: { fontSize: 12, fontWeight: "800" },
});

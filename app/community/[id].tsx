import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useColors } from "@/hooks/use-colors";
import { canManageCommunityMember, canModerateCommunityContent, getCommunityMemberRoleLabel } from "@/lib/community-management";
import { CommunityMember, CommunityPost, getCommunity, getCommunityMembershipState, joinCommunity, leaveCommunity, listCommunityMembers, listCommunityPosts, removeCommunityMember, removeCommunityPost, subscribeToCommunityMembers, updateCommunityMemberRole } from "@/lib/local-directory";

type Community = { id: string; name: string; description: string | null; area: string; category: string; visibility: "public" | "private"; rules: string[]; created_by: string; created_at: string };

export default function CommunityDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, user } = useSupabaseAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isOwner = Boolean(user?.id && community?.created_by === String(user.id));
  const canModerate = canModerateCommunityContent(community?.created_by, user?.id, isModerator);

  const refreshCommunityData = useCallback(async () => {
    if (!id) return;
    const [membershipResult, membersResult, postsResult] = await Promise.all([
      getCommunityMembershipState(id),
      listCommunityMembers(id),
      listCommunityPosts(id),
    ]);
    setMemberCount(membershipResult.data.memberCount);
    setIsMember(membershipResult.data.isMember);
    setIsModerator(Boolean(membershipResult.data.isModerator));
    setMembers(membersResult.data);
    setPosts(postsResult.data);
    setMembershipError(membershipResult.error?.message || membersResult.error?.message || postsResult.error?.message || null);
    setMembersLoading(false);
    setPostsLoading(false);
  }, [id]);

  useEffect(() => {
    let active = true;
    if (!id) return () => { active = false; };
    void Promise.all([getCommunity(id), refreshCommunityData()])
      .then(([communityResult]) => { if (active) setCommunity(communityResult.data as Community | null); })
      .finally(() => { if (active) setLoading(false); });
    const unsubscribe = subscribeToCommunityMembers(id, () => { void refreshCommunityData(); });
    return () => { active = false; unsubscribe(); };
  }, [id, refreshCommunityData]);

  const handleMembership = async () => {
    if (!id) return;
    if (!isAuthenticated) {
      Alert.alert("Sign in to join", "Create or sign in to a Lekka account to join this community.");
      return;
    }
    setMembershipLoading(true);
    setMembershipError(null);
    const result = isMember ? await leaveCommunity(id) : await joinCommunity(id);
    if (result.error) setMembershipError(result.error.message);
    else await refreshCommunityData();
    setMembershipLoading(false);
  };

  const handleRole = async (member: CommunityMember) => {
    if (!id) return;
    setMembershipLoading(true);
    setMembershipError(null);
    const result = await updateCommunityMemberRole(id, member.user_id, !member.is_moderator);
    if (result.error) setMembershipError(result.error.message);
    else await refreshCommunityData();
    setMembershipLoading(false);
  };

  const handleRemoveMember = (member: CommunityMember) => {
    if (!id) return;
    Alert.alert("Remove member?", `Remove ${member.profiles?.display_name || "this member"} from the community?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => {
        void (async () => {
          setMembershipLoading(true);
          const result = await removeCommunityMember(id, member.user_id);
          if (result.error) setMembershipError(result.error.message);
          else await refreshCommunityData();
          setMembershipLoading(false);
        })();
      } },
    ]);
  };

  const handleRemovePost = (post: CommunityPost) => {
    if (!id) return;
    Alert.alert("Remove post?", "This removes the post from the community for everyone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => {
        void (async () => {
          setMembershipLoading(true);
          const result = await removeCommunityPost(id, post.id);
          if (result.error) setMembershipError(result.error.message);
          else await refreshCommunityData();
          setMembershipLoading(false);
        })();
      } },
    ]);
  };

  if (loading) return <ScreenContainer><View style={styles.center}><Text style={[styles.status, { color: colors.muted }]}>Loading community…</Text></View></ScreenContainer>;
  if (!community) return <ScreenContainer><View style={styles.center}><Text style={[styles.status, { color: colors.foreground }]}>This community is no longer available.</Text><Pressable onPress={() => router.back()}><Text style={[styles.link, { color: colors.primary }]}>Go back</Text></Pressable></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={20} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Social</Text></Pressable>
      <View style={[styles.hero, { backgroundColor: colors.primary }]}><Text style={styles.initial}>{community.name.slice(0, 1).toUpperCase()}</Text></View>
      <View style={styles.titleRow}><View style={styles.titleCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>{community.visibility.toUpperCase()} COMMUNITY</Text><Text style={[styles.title, { color: colors.foreground }]}>{community.name}</Text></View>{isOwner && <Pressable accessibilityRole="button" accessibilityLabel="Open community settings" onPress={() => router.push({ pathname: "/community/settings/[id]", params: { id } } as never)} style={[styles.settingsButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="gearshape.fill" size={19} color={colors.foreground} /></Pressable>}</View>
      <Text style={[styles.meta, { color: colors.muted }]}>{community.area} · {community.category} · {memberCount} {memberCount === 1 ? "member" : "members"}</Text>
      <Pressable onPress={() => void handleMembership()} disabled={membershipLoading} accessibilityRole="button" accessibilityLabel={isMember ? "Leave community" : "Join community"} style={[styles.joinButton, { backgroundColor: isMember ? colors.surface : colors.primary, borderColor: colors.primary, opacity: membershipLoading ? 0.7 : 1 }]}>{membershipLoading ? <ActivityIndicator color={isMember ? colors.primary : colors.background} /> : <Text style={[styles.joinText, { color: isMember ? colors.primary : colors.background }]}>{isMember ? "Leave community" : "Join community"}</Text>}</Pressable>
      {membershipError && <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{membershipError}</Text>}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>About this community</Text><Text style={[styles.body, { color: colors.muted }]}>{community.description || "This community has not added a description yet."}</Text></View>
      {community.rules?.length > 0 && <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Community guidelines</Text>{community.rules.map((rule, index) => <Text key={`${rule}-${index}`} style={[styles.rule, { color: colors.muted }]}>{index + 1}. {rule}</Text>)}</View>}
      <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Community posts</Text><Text style={[styles.sectionMeta, { color: colors.muted }]}>{postsLoading ? "Loading…" : `${posts.length} shown`}</Text></View>
      {postsLoading ? <ActivityIndicator color={colors.primary} /> : posts.length === 0 ? <View style={[styles.empty, { borderColor: colors.border }]}><IconSymbol name="bubble.left.fill" size={26} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No posts yet</Text><Text style={[styles.body, { color: colors.muted }]}>Members can share local updates here as the community grows.</Text></View> : posts.map((post) => <View key={post.id} style={[styles.post, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.postHeader}><View style={[styles.postAvatar, { backgroundColor: colors.primary }]}><Text style={styles.postInitial}>{(post.profiles?.display_name || "?").slice(0, 1).toUpperCase()}</Text></View><View style={styles.postAuthor}><Text style={[styles.postName, { color: colors.foreground }]}>{post.profiles?.display_name || "Lekka member"}</Text><Text style={[styles.postMeta, { color: colors.muted }]}>{post.profiles?.username ? `@${post.profiles.username}` : post.area}</Text></View>{canModerate && <Pressable accessibilityRole="button" accessibilityLabel="Remove community post" onPress={() => handleRemovePost(post)}><IconSymbol name="trash.fill" size={18} color={colors.error} /></Pressable>}</View>{post.title && <Text style={[styles.postTitle, { color: colors.foreground }]}>{post.title}</Text>}<Text style={[styles.postBody, { color: colors.muted }]}>{post.body}</Text></View>)}
      <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Members</Text><Text style={[styles.sectionMeta, { color: colors.muted }]}>{membersLoading ? "Loading…" : `${members.length} shown`}</Text></View>
      {membersLoading ? <ActivityIndicator color={colors.primary} /> : members.length === 0 ? <Text style={[styles.body, { color: colors.muted }]}>No members have joined yet.</Text> : members.map((member) => <View key={member.user_id} style={[styles.member, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}><Text style={styles.memberInitial}>{(member.profiles?.display_name || "?").slice(0, 1).toUpperCase()}</Text></View><View style={styles.memberCopy}><Text style={[styles.memberName, { color: colors.foreground }]}>{member.profiles?.display_name || "Lekka member"}</Text><Text style={[styles.memberMeta, { color: colors.muted }]}>{member.profiles?.username ? `@${member.profiles.username}` : "Member"}{` · ${getCommunityMemberRoleLabel(member.is_moderator)}`}</Text></View>{canManageCommunityMember(community.created_by, user?.id, member.user_id) && <View style={styles.memberActions}><Pressable onPress={() => void handleRole(member)} accessibilityLabel={member.is_moderator ? "Remove moderator role" : "Make moderator"}><IconSymbol name="shield.fill" size={18} color={member.is_moderator ? colors.primary : colors.muted} /></Pressable><Pressable onPress={() => handleRemoveMember(member)} accessibilityLabel="Remove member"><IconSymbol name="trash.fill" size={18} color={colors.error} /></Pressable></View>}</View>)}
      {canModerate && <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{isOwner ? "Owner controls" : "Moderator controls"}</Text><Text style={[styles.body, { color: colors.muted }]}>{isOwner ? "Manage moderators, remove members, remove community posts, and update community settings." : "Remove community posts that break the community guidelines. The community owner manages member roles."}</Text></View>}
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 42 }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }, status: { fontSize: 16, fontWeight: "800", textAlign: "center" }, link: { fontWeight: "800" }, back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 22 }, backIcon: { transform: [{ rotate: "180deg" }] }, backText: { fontSize: 14, fontWeight: "800" }, hero: { width: 76, height: 76, borderRadius: 25, alignItems: "center", justifyContent: "center", marginBottom: 18 }, initial: { color: "#FFF", fontSize: 32, fontWeight: "900" }, titleRow: { flexDirection: "row", alignItems: "flex-start" }, titleCopy: { flex: 1 }, eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1 }, title: { fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 6 }, settingsButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", marginLeft: 12 }, meta: { fontSize: 13, marginTop: 5 }, joinButton: { borderWidth: 1, borderRadius: 14, minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: 18 }, joinText: { fontSize: 15, fontWeight: "900" }, error: { fontSize: 13, lineHeight: 18, marginTop: 8 }, card: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 20 }, cardTitle: { fontSize: 16, fontWeight: "900" }, body: { fontSize: 14, lineHeight: 21, marginTop: 7 }, rule: { fontSize: 14, lineHeight: 21, marginTop: 9 }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 26, marginBottom: 10 }, sectionTitle: { fontSize: 20, fontWeight: "900" }, sectionMeta: { fontSize: 12 }, post: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 9 }, postHeader: { flexDirection: "row", alignItems: "center" }, postAvatar: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, postInitial: { color: "#FFF", fontSize: 16, fontWeight: "900" }, postAuthor: { flex: 1, marginLeft: 10 }, postName: { fontSize: 14, fontWeight: "800" }, postMeta: { fontSize: 12, marginTop: 2 }, postTitle: { fontSize: 15, fontWeight: "800", marginTop: 12 }, postBody: { fontSize: 14, lineHeight: 21, marginTop: 5 }, member: { borderWidth: 1, borderRadius: 15, padding: 11, flexDirection: "row", alignItems: "center", marginBottom: 8 }, memberAvatar: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" }, memberInitial: { color: "#FFF", fontSize: 18, fontWeight: "900" }, memberCopy: { flex: 1, marginLeft: 11 }, memberName: { fontSize: 14, fontWeight: "800" }, memberMeta: { fontSize: 12, marginTop: 3 }, memberActions: { flexDirection: "row", alignItems: "center", gap: 16 }, empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: 18, padding: 21, alignItems: "center", gap: 7, marginTop: 4 }, emptyTitle: { fontSize: 15, fontWeight: "800" },
});

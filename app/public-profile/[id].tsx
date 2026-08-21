import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AuthGate } from "@/components/auth-gate";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { getFollowState, getPublicProfile, toggleFollow, type SocialProfile } from "@/lib/social-repository";

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

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    void Promise.all([getPublicProfile(id), getFollowState(id)]).then(([profileResult, followResult]) => {
      if (!mounted) return;
      setProfile(profileResult.data);
      if (followResult.data) { setFollowing(followResult.data.following); setFollowers(followResult.data.followers); setFollowingCount(followResult.data.followingCount); }
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  const follow = async () => {
    if (!isAuthenticated) { setAuthGateAction("follow people"); return; }
    const result = await toggleFollow(id);
    if (result.error) { Alert.alert("Couldn’t update follow", result.error.message); return; }
    setFollowing(result.following); setFollowers((current) => Math.max(0, current + (result.following ? 1 : -1)));
  };
  if (authGateAction) return <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />;
  if (loading) return <ScreenContainer><View style={styles.center}><Text style={[styles.status, { color: colors.muted }]}>Loading profile…</Text></View></ScreenContainer>;
  if (!profile) return <ScreenContainer><View style={styles.center}><Text style={[styles.status, { color: colors.foreground }]}>Profile unavailable</Text><Pressable onPress={() => router.back()}><Text style={[styles.link, { color: colors.primary }]}>Go back</Text></Pressable></View></ScreenContainer>;
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content}><Pressable onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={20} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Profile</Text></Pressable>{authGateAction && <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />}<View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>{(profile.display_name || "LN").slice(0, 2).toUpperCase()}</Text></View><Text style={[styles.title, { color: colors.foreground }]}>{profile.display_name || "Local neighbour"}</Text><Text style={[styles.username, { color: colors.muted }]}>{profile.username ? `@${profile.username}` : ""}</Text>{profile.bio && <Text style={[styles.bio, { color: colors.foreground }]}>{profile.bio}</Text>}<View style={styles.stats}><Stat value={followers} label="Followers" colors={colors} /><Stat value={followingCount} label="Following" colors={colors} /><Stat value={profile.interests.length} label="Interests" colors={colors} /></View><Pressable onPress={follow} style={[styles.follow, { backgroundColor: following ? colors.surface : colors.primary, borderColor: colors.primary }]}><Text style={[styles.followText, { color: following ? colors.foreground : "#10211D" }]}>{following ? "Following" : "Follow"}</Text></Pressable><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Local identity</Text><View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.metaRow}><IconSymbol name="location.fill" size={18} color={colors.primary} /><Text style={[styles.meta, { color: colors.foreground }]}>{profile.home_area || "Local area"}</Text></View><Text style={[styles.label, { color: colors.muted }]}>INTERESTS</Text><View style={styles.chips}>{profile.interests.length ? profile.interests.map((interest) => <View key={interest} style={[styles.chip, { borderColor: colors.border }]}><Text style={[styles.chipText, { color: colors.muted }]}>{interest}</Text></View>) : <Text style={[styles.empty, { color: colors.muted }]}>No interests shared yet.</Text>}</View></View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Posts</Text><Text style={[styles.empty, { color: colors.muted }]}>Posts will appear here as the public profile feed is connected.</Text></ScrollView></ScreenContainer>;
}

function Stat({ value, label, colors }: { value: number; label: string; colors: ReturnType<typeof useColors> }) { return <View style={styles.stat}><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text></View>; }
const styles = StyleSheet.create({ content: { padding: 24, paddingBottom: 50 }, back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 24 }, backIcon: { transform: [{ rotate: "180deg" }] }, backText: { fontSize: 14, fontWeight: "800" }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }, status: { fontSize: 16, fontWeight: "800" }, link: { fontWeight: "800" }, avatar: { width: 76, height: 76, borderRadius: 26, alignItems: "center", justifyContent: "center" }, avatarText: { color: "#10211D", fontSize: 23, fontWeight: "900" }, title: { fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 16 }, username: { fontSize: 13, marginTop: 3 }, bio: { fontSize: 14, lineHeight: 21, marginTop: 14 }, stats: { flexDirection: "row", gap: 34, marginTop: 22 }, stat: { gap: 3 }, statValue: { fontSize: 18, fontWeight: "900" }, statLabel: { fontSize: 11 }, follow: { minHeight: 48, borderWidth: 1, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 22 }, followText: { fontSize: 14, fontWeight: "900" }, sectionTitle: { fontSize: 19, fontWeight: "900", marginTop: 28, marginBottom: 11 }, card: { borderWidth: 1, borderRadius: 18, padding: 15 }, metaRow: { flexDirection: "row", alignItems: "center", gap: 8 }, meta: { fontSize: 14, fontWeight: "800" }, label: { fontSize: 10, fontWeight: "800", letterSpacing: 1, marginTop: 18, marginBottom: 8 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 }, chipText: { fontSize: 11, fontWeight: "700" }, empty: { fontSize: 13, lineHeight: 19 },
});

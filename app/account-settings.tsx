import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { loadMyProfile } from "@/lib/profile";
import { usernameCooldownMessage, type UsernameChange } from "@/lib/profile-settings";
import { formatAccountDate, getUsernameCooldownStatus, mapServerUsernameHistory } from "@/lib/account-settings";
import { loadServerUsernameHistory, normalizeUsername } from "@/lib/username";

export default function AccountSettingsScreen() {
  const colors = useColors();
  const { user } = useSupabaseAuth();
  const [username, setUsername] = useState("");
  const [history, setHistory] = useState<UsernameChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let active = true;
    void Promise.all([loadMyProfile(), loadServerUsernameHistory(user.id)]).then(([profileResult, historyResult]) => {
      if (!active) return;
      setUsername(normalizeUsername(profileResult.data?.username ?? ""));
      if (historyResult.error) setError("We couldn’t load your username history. Try again when you’re online.");
      setHistory(mapServerUsernameHistory(historyResult.data));
      setHasMore(historyResult.hasMore);
      setLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  if (!user) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}><Text style={[styles.title, { color: colors.foreground }]}>Sign in to view account settings</Text><Pressable accessibilityRole="button" onPress={() => router.push("/auth" as never)} style={[styles.primary, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Sign in</Text></Pressable></View></ScreenContainer>;
  }

  if (loading) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View accessibilityRole="progressbar" style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={[styles.cardBody, { color: colors.muted }]}>Loading account settings…</Text></View></ScreenContainer>;
  }

  const loadMore = async () => {
    if (!hasMore || loadingMore || !user) return;
    setLoadingMore(true);
    const result = await loadServerUsernameHistory(user.id, history.length);
    if (!result.error) {
      setHistory((current) => [...current, ...mapServerUsernameHistory(result.data)]);
      setHasMore(result.hasMore);
    }
    setLoadingMore(false);
  };

  const cooldown = usernameCooldownMessage(history);
  const cooldownStatus = getUsernameCooldownStatus(history);
  const latestChange = history[history.length - 1];
  const header = <View>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back to profile" onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={22} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Profile</Text></Pressable>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>ACCOUNT SETTINGS</Text>
    <Text style={[styles.title, { color: colors.foreground }]}>Username & security</Text>
    <Text style={[styles.subtitle, { color: colors.muted }]}>Review your public handle and when it can next be changed.</Text>
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardLabel, { color: colors.muted }]}>CURRENT USERNAME</Text><Text style={[styles.currentUsername, { color: colors.foreground }]}>{username ? `@${username}` : "Not set"}</Text><Text style={[styles.cardBody, { color: colors.muted }]}>This is the handle other people use to find you.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/profile" as never)} style={[styles.editButton, { borderColor: colors.border }]}><Text style={[styles.editButtonText, { color: colors.primary }]}>Edit username</Text></Pressable></View>
    <View style={[styles.card, { backgroundColor: cooldown ? `${colors.warning}18` : `${colors.success}18`, borderColor: cooldown ? colors.warning : colors.success }]}><Text style={[styles.cardLabel, { color: colors.muted }]}>CURRENT COOLDOWN</Text><Text style={[styles.statusTitle, { color: colors.foreground }]}>{cooldownStatus.message}</Text><Text style={[styles.cardBody, { color: colors.muted }]}>{cooldown ? `${cooldown} ${latestChange ? `Next available: ${formatAccountDate(cooldownStatus.nextAvailableAt ?? latestChange.changedAt)}.` : ""}` : "You can change your username from your profile."}</Text></View>
    {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>CHANGE HISTORY</Text>
    {history.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.statusTitle, { color: colors.foreground }]}>No changes yet</Text><Text style={[styles.cardBody, { color: colors.muted }]}>Your future username changes will appear here.</Text></View> : null}
  </View>;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><FlatList data={history} keyExtractor={(item, index) => `${item.changedAt}-${index}`} ListHeaderComponent={header} contentContainerStyle={styles.content} onEndReached={() => void loadMore()} onEndReachedThreshold={0.6} ListFooterComponent={hasMore ? <ActivityIndicator accessibilityLabel="Loading more username history" color={colors.primary} style={styles.footer} /> : null} renderItem={({ item }) => <View style={[styles.historyRow, { borderBottomColor: colors.border }]}><View style={[styles.historyDot, { backgroundColor: colors.primary }]} /><View style={styles.historyCopy}><Text style={[styles.historyUsername, { color: colors.foreground }]}>@{item.username}</Text><Text style={[styles.historyDate, { color: colors.muted }]}>{formatAccountDate(item.changedAt)}</Text></View></View>} /></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 24, paddingBottom: 50 }, center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 10 }, back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 24 }, backIcon: { transform: [{ rotate: "180deg" }] }, backText: { fontSize: 14, fontWeight: "700" }, eyebrow: { fontSize: 11, letterSpacing: 1.2, fontWeight: "900" }, title: { fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 9 }, subtitle: { fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 18 }, card: { borderWidth: 1, borderRadius: 17, padding: 16, marginBottom: 10, gap: 6 }, cardLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }, currentUsername: { fontSize: 24, fontWeight: "900", marginTop: 3 }, statusTitle: { fontSize: 15, fontWeight: "900" }, cardBody: { fontSize: 12, lineHeight: 17 }, error: { fontSize: 12, lineHeight: 17, marginBottom: 14 }, sectionTitle: { fontSize: 13, fontWeight: "900", marginTop: 14, marginBottom: 8 }, empty: { borderWidth: 1, borderRadius: 15, padding: 15 }, historyRow: { minHeight: 62, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 }, historyDot: { width: 10, height: 10, borderRadius: 5 }, historyCopy: { gap: 3 }, historyUsername: { fontSize: 14, fontWeight: "900" }, historyDate: { fontSize: 11 }, primary: { minHeight: 50, borderRadius: 15, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", marginTop: 16 }, primaryText: { color: "#10211D", fontWeight: "900" }, editButton: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginTop: 8 }, editButtonText: { fontSize: 12, fontWeight: "900" }, footer: { paddingVertical: 18 } });

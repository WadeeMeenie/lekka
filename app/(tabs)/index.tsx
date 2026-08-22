import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { FeedTab, FeedPreference, LocalPost, loadPosts, loadSettings, personalizeFeed, savePosts } from "@/lib/local-radar";
import { DeviceLocation, getLastKnownOrCurrentLocation } from "@/lib/location";
import { fetchFeedPage, subscribeToLocalChanges } from "@/lib/supabase-repository";
import { createSignedMediaUrl, getUnreadNotificationCount, listPostFeedback, setPostFeedback } from "@/lib/social-repository";
import { useColors } from "@/hooks/use-colors";
import { FeedSkeletonList } from "@/components/ui/loading-skeleton";
import { getFetchPresentation } from "@/lib/loading-state";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { AuthGate } from "@/components/auth-gate";
import { listPendingPostDrafts, syncPendingPostDrafts } from "@/lib/offline-outbox";
import { loadMyProfile } from "@/lib/profile";
import { getAvatarInitials } from "@/lib/profile-avatar";

const tabs: FeedTab[] = ["For You", "Nearby", "Trending", "Following"];

export default function HomeScreen() {
  const colors = useColors();
  const { user, isAuthenticated } = useSupabaseAuth();
  const [authGateAction, setAuthGateAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>("For You");
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [area, setArea] = useState("Bellville");
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(null);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingDrafts, setPendingDrafts] = useState(0);
  const [outboxStatus, setOutboxStatus] = useState<"idle" | "syncing" | "queued" | "error">("idle");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, FeedPreference>>({});

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!user) {
      setProfileAvatarUrl(null);
      setProfileDisplayName(null);
      return () => { active = false; };
    }
    void loadMyProfile().then(async ({ data }) => {
      if (!active) return;
      setProfileDisplayName(data?.display_name ?? null);
      if (!data?.profile_image_path) {
        setProfileAvatarUrl(null);
        return;
      }
      const { data: signed } = await createSignedMediaUrl(data.profile_image_path);
      if (active) setProfileAvatarUrl(signed?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [user]));

  useEffect(() => {
    let active = true;
    void (async () => {
      if (user) {
        if (active) setOutboxStatus("syncing");
        try {
          const sync = await syncPendingPostDrafts(user.id);
          const remaining = sync.remaining ?? (await listPendingPostDrafts(user.id)).length;
          if (active) { setPendingDrafts(remaining); setOutboxStatus(remaining > 0 ? "queued" : "idle"); }
        } catch {
          const remaining = (await listPendingPostDrafts(user.id)).length;
          if (active) { setPendingDrafts(remaining); setOutboxStatus("error"); }
        }
        const unread = await getUnreadNotificationCount(); if (active) setUnreadCount(unread.data);
      }
      const settings = await loadSettings();
      const location = await getLastKnownOrCurrentLocation(settings.area);
      if (!active) return;
      const liveLocation = location.status === "granted" ? location.location : undefined;
      if (liveLocation) { setDeviceLocation(liveLocation); setArea(liveLocation.area); }
      else setArea(settings.area);
      const firstPage = await fetchFeedPage(liveLocation, null);
      setPosts(firstPage.posts);
      setNextCursor(firstPage.nextCursor);
      if (active) setInitialLoading(false);
    })().catch(() => { if (active) setInitialLoading(false); });
    const unsubscribe = subscribeToLocalChanges(() => {
      setBackgroundRefreshing(true);
      void fetchFeedPage(deviceLocation ?? undefined, null)
        .then((next) => { if (active) { setPosts(next.posts); setNextCursor(next.nextCursor); } })
        .finally(() => { if (active) setBackgroundRefreshing(false); });
    });
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    let active = true;
    if (!user || posts.length === 0) { setFeedback({}); return () => { active = false; }; }
    void listPostFeedback(posts.map((post) => post.id)).then((result) => {
      if (!active || result.error) return;
      setFeedback(Object.fromEntries(result.data));
    });
    return () => { active = false; };
  }, [posts, user?.id]);
  const retryOutbox = async () => {
    if (!user || outboxStatus === "syncing") return;
    setOutboxStatus("syncing");
    try {
      const sync = await syncPendingPostDrafts(user.id);
      const remaining = sync.remaining ?? (await listPendingPostDrafts(user.id)).length;
      setPendingDrafts(remaining); setOutboxStatus(remaining > 0 ? "queued" : "idle");
    } catch {
      setOutboxStatus("error");
    }
  };
  const visiblePosts = useMemo(() => personalizeFeed(posts, activeTab, feedback).filter((post) => `${post.title ?? ""} ${post.body} ${post.author}`.toLowerCase().includes(query.toLowerCase())), [posts, activeTab, feedback, query]);
  const submitFeedback = async (postId: string, preference: FeedPreference) => {
    if (!isAuthenticated) { setAuthGateAction("personalize your feed"); return; }
    const previous = feedback[postId];
    setFeedback((current) => ({ ...current, [postId]: preference }));
    const result = await setPostFeedback(postId, preference);
    if (result.error) setFeedback((current) => { const next = { ...current }; if (previous) next[postId] = previous; else delete next[postId]; return next; });
  };
  const refresh = async () => {
    setRefreshing(true);
    try {
      const settings = await loadSettings();
      const location = await getLastKnownOrCurrentLocation(settings.area);
      const liveLocation = location.status === "granted" ? location.location : undefined;
      if (liveLocation) { setDeviceLocation(liveLocation); setArea(liveLocation.area); }
      const firstPage = await fetchFeedPage(liveLocation, null);
      setPosts(firstPage.posts);
      setNextCursor(firstPage.nextCursor);
    } finally {
      setRefreshing(false);
    }
  };
  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchFeedPage(deviceLocation ?? undefined, nextCursor);
      setPosts((current) => { const seen = new Set(current.map((post) => post.id)); return [...current, ...page.posts.filter((post) => !seen.has(post.id))]; });
      setNextCursor(page.nextCursor);
    } finally { setLoadingMore(false); }
  };
  const presentation = getFetchPresentation({ isInitialLoading: initialLoading, isRefreshing: refreshing || backgroundRefreshing, hasData: posts.length > 0 });

  return (
    <ScreenContainer containerClassName="bg-background">
      {authGateAction && <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />}
      <FlatList
        data={visiblePosts}
        keyExtractor={(item) => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.55}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 18 }} /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<>
          <View style={styles.headerRow}>
            <View>
              <View style={styles.locationLine}><IconSymbol name="location.fill" size={16} color={colors.primary} /><Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR LOCAL RADAR</Text></View>
              <Text style={[styles.title, { color: colors.foreground }]}>What’s happening in {area}?</Text>
            </View>
            <View style={styles.headerActions}><Pressable accessibilityLabel="Notifications" onPress={() => router.push("/notifications" as never)} style={styles.iconButton}><IconSymbol name="bell.fill" size={23} color={colors.foreground} />{unreadCount > 0 && <View style={[styles.badge, { backgroundColor: colors.error }]}><Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text></View>}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open your Lekka menu" onPress={() => router.push("/menu" as never)} style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }]}>{profileAvatarUrl ? <Image source={{ uri: profileAvatarUrl }} contentFit="cover" transition={180} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{getAvatarInitials(profileDisplayName)}</Text>}</Pressable></View>
          </View>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="magnifyingglass" size={20} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search your local area" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} /></View>
          <FlatList data={tabs} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item) => item} contentContainerStyle={styles.tabRow} renderItem={({ item }) => <Pressable onPress={() => setActiveTab(item)} style={[styles.tab, activeTab === item && { backgroundColor: colors.foreground }]}><Text style={[styles.tabText, { color: activeTab === item ? colors.background : colors.muted }]}>{item}</Text></Pressable>} />
          <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fresh from around you</Text><Text style={[styles.sectionMeta, { color: colors.muted }]}>{visiblePosts.length} stories</Text></View>
          {presentation === "content-refreshing" && <View style={[styles.syncPill, { backgroundColor: `${colors.primary}12` }]}><View style={[styles.syncDot, { backgroundColor: colors.primary }]} /><Text style={[styles.syncText, { color: colors.primary }]}>Updating your local feed</Text></View>}
          {(outboxStatus !== "idle" || pendingDrafts > 0) && <View style={[styles.outboxPill, { backgroundColor: outboxStatus === "error" ? `${colors.error}12` : `${colors.warning}14` }]}><View style={[styles.syncDot, { backgroundColor: outboxStatus === "error" ? colors.error : colors.warning }]} /><Text style={[styles.syncText, { color: outboxStatus === "error" ? colors.error : colors.foreground }]}>{outboxStatus === "syncing" ? "Retrying saved drafts…" : outboxStatus === "error" ? "Draft sync paused — check your connection" : `${pendingDrafts} saved draft${pendingDrafts === 1 ? "" : "s"} waiting to retry`}</Text>{outboxStatus !== "syncing" && <Pressable onPress={() => void retryOutbox}><Text style={[styles.retryText, { color: outboxStatus === "error" ? colors.error : colors.warning }]}>Retry</Text></Pressable>}</View>}
        </>}
        renderItem={({ item }) => <PostCard post={item} colors={colors} feedback={feedback[item.id]} onFeedback={(preference) => void submitFeedback(item.id, preference)} onOpen={() => router.push({ pathname: "/post/[id]", params: { id: item.id } } as never)} onLike={() => { if (!isAuthenticated) { setAuthGateAction("react to posts"); return; } const next = posts.map((p) => p.id === item.id ? { ...p, likes: p.likes + 1 } : p); setPosts(next); void savePosts(next); }} onProtectedAction={(action) => { if (!isAuthenticated) setAuthGateAction(action); }} />}
        ListEmptyComponent={presentation === "skeleton" ? <FeedSkeletonList /> : <View style={styles.empty}><IconSymbol name="location.fill" size={30} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing matches that search</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Try a different phrase or switch to Nearby.</Text></View>}
      />
    </ScreenContainer>
  );
}

function PostCard({ post, colors, feedback, onFeedback, onOpen, onLike, onProtectedAction }: { post: LocalPost; colors: ReturnType<typeof useColors>; feedback?: FeedPreference; onFeedback: (preference: FeedPreference) => void; onOpen: () => void; onLike: () => void; onProtectedAction: (action: string) => void }) {
  return <Pressable onPress={onOpen} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.postHeader}><View style={[styles.authorAvatar, { backgroundColor: post.accent }]}><Text style={styles.authorInitials}>{post.initials}</Text></View><View style={styles.authorCopy}><Text style={[styles.author, { color: colors.foreground }]}>{post.author}</Text><View style={styles.metaLine}><Text style={[styles.meta, { color: colors.muted }]}>{post.area} · {post.distance} · {post.time}</Text>{post.trusted && <IconSymbol name="checkmark.seal.fill" size={15} color={colors.primary} />}</View></View><Pressable accessibilityLabel="Post options"><IconSymbol name="chevron.right" size={20} color={colors.muted} /></Pressable></View>
    {post.kind === "alert" && <View style={[styles.alertPill, { backgroundColor: `${post.accent}18` }]}><IconSymbol name="exclamationmark.triangle.fill" size={15} color={post.accent} /><Text style={[styles.alertText, { color: post.accent }]}>LOCAL ALERT · REPORTED</Text></View>}
    {!!post.title && <Text style={[styles.postTitle, { color: colors.foreground }]}>{post.title}</Text>}<Text style={[styles.postBody, { color: colors.foreground }]}>{post.body}</Text><View style={[styles.preferenceCard, { backgroundColor: colors.background, borderColor: colors.border }]}><Text style={[styles.preferenceQuestion, { color: colors.foreground }]}>{feedback === "interested" ? "We’ll show you more local stories like this." : "Interested in local stories like this?"}</Text><View style={styles.preferenceActions}><Pressable accessibilityRole="button" accessibilityState={{ selected: feedback === "interested" }} onPress={() => onFeedback("interested")} style={[styles.preferenceButton, { backgroundColor: feedback === "interested" ? colors.primary : colors.surface, borderColor: feedback === "interested" ? colors.primary : colors.border }]}><Text style={[styles.preferenceButtonText, { color: feedback === "interested" ? "#10211D" : colors.foreground }]}>Interested</Text></Pressable><Pressable accessibilityRole="button" onPress={() => onFeedback("not_interested")} style={[styles.preferenceButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.preferenceButtonText, { color: colors.muted }]}>Not interested</Text></Pressable></View></View>
    <View style={[styles.postActions, { borderTopColor: colors.border }]}><Pressable onPress={onLike} style={styles.action}><IconSymbol name="heart.fill" size={19} color={colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>{post.likes}</Text></Pressable><Pressable onPress={() => onProtectedAction("comment on posts")} style={styles.action}><IconSymbol name="bubble.left.fill" size={19} color={colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>{post.comments}</Text></Pressable><Pressable onPress={() => onProtectedAction("save posts")} style={styles.action}><IconSymbol name="bookmark.fill" size={19} color={colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>Save</Text></Pressable><View style={styles.action}><IconSymbol name="square.and.arrow.up" size={19} color={colors.muted} /></View></View>
  </Pressable>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 30 }, headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }, locationLine: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }, title: { fontSize: 27, lineHeight: 33, fontWeight: "800", maxWidth: 280 }, headerActions: { flexDirection: "row", alignItems: "center", gap: 10 }, iconButton: { padding: 9, position: "relative" }, badge: { position: "absolute", top: 2, right: 0, minWidth: 17, height: 17, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }, badgeText: { color: "#FFF", fontSize: 9, fontWeight: "900" }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E9A23B", alignItems: "center", justifyContent: "center", overflow: "hidden" }, avatarImage: { width: "100%", height: "100%" }, avatarText: { color: "#10211D", fontWeight: "800", fontSize: 12 }, searchBox: { height: 48, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9 }, searchInput: { flex: 1, fontSize: 15 }, tabRow: { gap: 8, paddingVertical: 18 }, tab: { borderRadius: 20, paddingHorizontal: 15, paddingVertical: 9 }, tabText: { fontSize: 13, fontWeight: "700" }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, sectionTitle: { fontSize: 18, fontWeight: "800" }, sectionMeta: { fontSize: 12 }, card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 }, postHeader: { flexDirection: "row", alignItems: "center", gap: 10 }, authorAvatar: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, authorInitials: { color: "#FFF", fontSize: 12, fontWeight: "800" }, authorCopy: { flex: 1 }, author: { fontWeight: "800", fontSize: 14 }, metaLine: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }, meta: { fontSize: 11 }, alertPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, marginTop: 14 }, alertText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 }, postTitle: { fontSize: 17, fontWeight: "800", lineHeight: 22, marginTop: 14 }, postBody: { fontSize: 14, lineHeight: 21, marginTop: 7 }, preferenceCard: { borderWidth: 1, borderRadius: 15, padding: 12, marginTop: 15 }, preferenceQuestion: { fontSize: 13, fontWeight: "800" }, preferenceActions: { flexDirection: "row", gap: 8, marginTop: 10 }, preferenceButton: { flex: 1, minHeight: 38, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" }, preferenceButtonText: { fontSize: 12, fontWeight: "900" }, postActions: { flexDirection: "row", alignItems: "center", gap: 18, borderTopWidth: 1, marginTop: 15, paddingTop: 13 }, action: { flexDirection: "row", alignItems: "center", gap: 5 }, actionText: { fontSize: 12, fontWeight: "600" }, empty: { alignItems: "center", paddingVertical: 70, gap: 8 }, emptyTitle: { fontSize: 18, fontWeight: "800" }, emptyText: { fontSize: 14 }, syncPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12 }, outboxPill: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12 }, syncDot: { width: 7, height: 7, borderRadius: 4 }, syncText: { flex: 1, fontSize: 11, fontWeight: "700" }, retryText: { fontSize: 11, fontWeight: "900" },
});

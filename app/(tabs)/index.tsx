import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { FeedTab, LocalPost, loadPosts, loadSettings, rankPosts, savePosts } from "@/lib/local-radar";
import { DeviceLocation, getLastKnownOrCurrentLocation } from "@/lib/location";
import { fetchFeedPosts, subscribeToLocalChanges } from "@/lib/supabase-repository";
import { useColors } from "@/hooks/use-colors";
import { FeedSkeletonList } from "@/components/ui/loading-skeleton";
import { getFetchPresentation } from "@/lib/loading-state";

const tabs: FeedTab[] = ["For You", "Nearby", "Trending", "Following"];

export default function HomeScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<FeedTab>("For You");
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [area, setArea] = useState("Bellville");
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(null);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const settings = await loadSettings();
      const location = await getLastKnownOrCurrentLocation(settings.area);
      if (!active) return;
      const liveLocation = location.status === "granted" ? location.location : undefined;
      if (liveLocation) { setDeviceLocation(liveLocation); setArea(liveLocation.area); }
      else setArea(settings.area);
      setPosts(await fetchFeedPosts(liveLocation));
      if (active) setInitialLoading(false);
    })().catch(() => { if (active) setInitialLoading(false); });
    const unsubscribe = subscribeToLocalChanges(() => {
      setBackgroundRefreshing(true);
      void fetchFeedPosts(deviceLocation ?? undefined)
        .then((next) => { if (active) setPosts(next); })
        .finally(() => { if (active) setBackgroundRefreshing(false); });
    });
    return () => { active = false; unsubscribe(); };
  }, []);
  const visiblePosts = useMemo(() => rankPosts(posts, activeTab).filter((post) => `${post.title ?? ""} ${post.body} ${post.author}`.toLowerCase().includes(query.toLowerCase())), [posts, activeTab, query]);
  const refresh = async () => {
    setRefreshing(true);
    try {
      const settings = await loadSettings();
      const location = await getLastKnownOrCurrentLocation(settings.area);
      const liveLocation = location.status === "granted" ? location.location : undefined;
      if (liveLocation) { setDeviceLocation(liveLocation); setArea(liveLocation.area); }
      setPosts(await fetchFeedPosts(liveLocation));
    } finally {
      setRefreshing(false);
    }
  };
  const presentation = getFetchPresentation({ isInitialLoading: initialLoading, isRefreshing: refreshing || backgroundRefreshing, hasData: posts.length > 0 });

  return (
    <ScreenContainer containerClassName="bg-background">
      <FlatList
        data={visiblePosts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<>
          <View style={styles.headerRow}>
            <View>
              <View style={styles.locationLine}><IconSymbol name="location.fill" size={16} color={colors.primary} /><Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR LOCAL RADAR</Text></View>
              <Text style={[styles.title, { color: colors.foreground }]}>What’s happening in {area}?</Text>
            </View>
            <View style={styles.headerActions}><Pressable accessibilityLabel="Notifications" style={styles.iconButton}><IconSymbol name="bell.fill" size={23} color={colors.foreground} /></Pressable><Pressable accessibilityLabel="Profile" style={styles.avatar}><Text style={styles.avatarText}>LM</Text></Pressable></View>
          </View>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="magnifyingglass" size={20} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search your local area" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} /></View>
          <FlatList data={tabs} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item) => item} contentContainerStyle={styles.tabRow} renderItem={({ item }) => <Pressable onPress={() => setActiveTab(item)} style={[styles.tab, activeTab === item && { backgroundColor: colors.foreground }]}><Text style={[styles.tabText, { color: activeTab === item ? colors.background : colors.muted }]}>{item}</Text></Pressable>} />
          <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fresh from around you</Text><Text style={[styles.sectionMeta, { color: colors.muted }]}>{visiblePosts.length} stories</Text></View>
          {presentation === "content-refreshing" && <View style={[styles.syncPill, { backgroundColor: `${colors.primary}12` }]}><View style={[styles.syncDot, { backgroundColor: colors.primary }]} /><Text style={[styles.syncText, { color: colors.primary }]}>Updating your local feed</Text></View>}
        </>}
        renderItem={({ item }) => <PostCard post={item} colors={colors} onLike={() => { const next = posts.map((p) => p.id === item.id ? { ...p, likes: p.likes + 1 } : p); setPosts(next); void savePosts(next); }} />}
        ListEmptyComponent={presentation === "skeleton" ? <FeedSkeletonList /> : <View style={styles.empty}><IconSymbol name="location.fill" size={30} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing matches that search</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Try a different phrase or switch to Nearby.</Text></View>}
      />
    </ScreenContainer>
  );
}

function PostCard({ post, colors, onLike }: { post: LocalPost; colors: ReturnType<typeof useColors>; onLike: () => void }) {
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.postHeader}><View style={[styles.authorAvatar, { backgroundColor: post.accent }]}><Text style={styles.authorInitials}>{post.initials}</Text></View><View style={styles.authorCopy}><Text style={[styles.author, { color: colors.foreground }]}>{post.author}</Text><View style={styles.metaLine}><Text style={[styles.meta, { color: colors.muted }]}>{post.area} · {post.distance} · {post.time}</Text>{post.trusted && <IconSymbol name="checkmark.seal.fill" size={15} color={colors.primary} />}</View></View><Pressable accessibilityLabel="Post options"><IconSymbol name="chevron.right" size={20} color={colors.muted} /></Pressable></View>
    {post.kind === "alert" && <View style={[styles.alertPill, { backgroundColor: `${post.accent}18` }]}><IconSymbol name="exclamationmark.triangle.fill" size={15} color={post.accent} /><Text style={[styles.alertText, { color: post.accent }]}>LOCAL ALERT · REPORTED</Text></View>}
    {!!post.title && <Text style={[styles.postTitle, { color: colors.foreground }]}>{post.title}</Text>}<Text style={[styles.postBody, { color: colors.foreground }]}>{post.body}</Text>
    <View style={[styles.postActions, { borderTopColor: colors.border }]}><Pressable onPress={onLike} style={styles.action}><IconSymbol name="heart.fill" size={19} color={colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>{post.likes}</Text></Pressable><View style={styles.action}><IconSymbol name="bubble.left.fill" size={19} color={colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>{post.comments}</Text></View><View style={styles.action}><IconSymbol name="bookmark.fill" size={19} color={colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>Save</Text></View><View style={styles.action}><IconSymbol name="square.and.arrow.up" size={19} color={colors.muted} /></View></View>
  </View>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 30 }, headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }, locationLine: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }, title: { fontSize: 27, lineHeight: 33, fontWeight: "800", maxWidth: 280 }, headerActions: { flexDirection: "row", alignItems: "center", gap: 10 }, iconButton: { padding: 9 }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E9A23B", alignItems: "center", justifyContent: "center" }, avatarText: { color: "#10211D", fontWeight: "800", fontSize: 12 }, searchBox: { height: 48, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9 }, searchInput: { flex: 1, fontSize: 15 }, tabRow: { gap: 8, paddingVertical: 18 }, tab: { borderRadius: 20, paddingHorizontal: 15, paddingVertical: 9 }, tabText: { fontSize: 13, fontWeight: "700" }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, sectionTitle: { fontSize: 18, fontWeight: "800" }, sectionMeta: { fontSize: 12 }, card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 }, postHeader: { flexDirection: "row", alignItems: "center", gap: 10 }, authorAvatar: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, authorInitials: { color: "#FFF", fontSize: 12, fontWeight: "800" }, authorCopy: { flex: 1 }, author: { fontWeight: "800", fontSize: 14 }, metaLine: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }, meta: { fontSize: 11 }, alertPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, marginTop: 14 }, alertText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 }, postTitle: { fontSize: 17, fontWeight: "800", lineHeight: 22, marginTop: 14 }, postBody: { fontSize: 14, lineHeight: 21, marginTop: 7 }, postActions: { flexDirection: "row", alignItems: "center", gap: 18, borderTopWidth: 1, marginTop: 15, paddingTop: 13 }, action: { flexDirection: "row", alignItems: "center", gap: 5 }, actionText: { fontSize: 12, fontWeight: "600" }, empty: { alignItems: "center", paddingVertical: 70, gap: 8 }, emptyTitle: { fontSize: 18, fontWeight: "800" }, emptyText: { fontSize: 14 }, syncPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12 }, syncDot: { width: 7, height: 7, borderRadius: 4 }, syncText: { fontSize: 11, fontWeight: "700" },
});

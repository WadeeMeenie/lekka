import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { FeedTab, FeedPreference, LocalPost, loadSettings, personalizeFeed } from "@/lib/local-radar";
import { DeviceLocation, getLastKnownOrCurrentLocation } from "@/lib/location";
import { createPost, fetchFeedPage, subscribeToLocalChanges } from "@/lib/supabase-repository";
import { createSignedMediaUrl, getUnreadNotificationCount, listPostFeedback, setPostFeedback } from "@/lib/social-repository";
import { REACTION_OPTIONS, ReactionType, toggleReactionAtomic, toggleSavedPostAtomic } from "@/lib/atomic-social";
import { deleteOwnPost } from "@/lib/post-actions";
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
  const [area, setArea] = useState("");
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
  const [busyPostIds, setBusyPostIds] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<Record<string, ReactionType | null>>({});
  const [profileImageUrls, setProfileImageUrls] = useState<Record<string, string>>({});
  const [postImageUrls, setPostImageUrls] = useState<Record<string, string>>({});

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!user) { setProfileAvatarUrl(null); setProfileDisplayName(null); return () => { active = false; }; }
    void loadMyProfile().then(async ({ data }) => {
      if (!active) return;
      setProfileDisplayName(data?.display_name ?? null);
      if (!data?.profile_image_path) { setProfileAvatarUrl(null); return; }
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
          if (active) { setPendingDrafts((await listPendingPostDrafts(user.id)).length); setOutboxStatus("error"); }
        }
        const unread = await getUnreadNotificationCount();
        if (active) setUnreadCount(unread.data);
      }
      const settings = await loadSettings();
      const location = await getLastKnownOrCurrentLocation(settings.area);
      if (!active) return;
      const liveLocation = location.status === "granted" ? location.location : undefined;
      if (liveLocation) { setDeviceLocation(liveLocation); setArea(liveLocation.area); }
      else setArea(settings.area || "your area");
      const firstPage = await fetchFeedPage(liveLocation, null);
      if (active) { setPosts(firstPage.posts); setNextCursor(firstPage.nextCursor); setInitialLoading(false); }
    })().catch(() => { if (active) setInitialLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToLocalChanges(() => {
      setBackgroundRefreshing(true);
      void fetchFeedPage(deviceLocation ?? undefined, null).then((next) => {
        if (active) { setPosts(next.posts); setNextCursor(next.nextCursor); }
      }).finally(() => { if (active) setBackgroundRefreshing(false); });
    });
    return () => { active = false; unsubscribe(); };
  }, [deviceLocation]);

  useEffect(() => {
    let active = true;
    if (!user || posts.length === 0) { setFeedback({}); return () => { active = false; }; }
    void listPostFeedback(posts.map((post) => post.id)).then((result) => { if (active && !result.error) setFeedback(Object.fromEntries(result.data)); });
    return () => { active = false; };
  }, [posts, user?.id]);

  useEffect(() => {
    let active = true;
    void Promise.all(posts.filter((post) => post.profileImagePath || post.mediaPath).map(async (post) => {
      const profile = post.profileImagePath ? await createSignedMediaUrl(post.profileImagePath) : null;
      const media = post.mediaPath ? await createSignedMediaUrl(post.mediaPath) : null;
      return { id: post.id, profile: profile?.data?.signedUrl, media: media?.data?.signedUrl };
    })).then((items) => {
      if (!active) return;
      setProfileImageUrls(Object.fromEntries(items.filter((x) => x.profile).map((x) => [x.id, x.profile as string])));
      setPostImageUrls(Object.fromEntries(items.filter((x) => x.media).map((x) => [x.id, x.media as string])));
    });
    return () => { active = false; };
  }, [posts]);

  const setBusy = (postId: string, busy: boolean) => setBusyPostIds((current) => { const next = new Set(current); if (busy) next.add(postId); else next.delete(postId); return next; });
  const submitFeedback = async (postId: string, preference: FeedPreference) => {
    if (!isAuthenticated) { setAuthGateAction("personalize your feed"); return; }
    const previous = feedback[postId];
    setFeedback((current) => ({ ...current, [postId]: preference }));
    const result = await setPostFeedback(postId, preference);
    if (result.error) setFeedback((current) => { const next = { ...current }; if (previous) next[postId] = previous; else delete next[postId]; return next; });
    else if (preference === "not_interested") Alert.alert("Not interested", "You won't see posts like this in future.");
  };

  const react = async (postId: string, reaction: ReactionType = "👍") => {
    if (!isAuthenticated) { setAuthGateAction("react to posts"); return; }
    if (busyPostIds.has(postId)) return;
    setBusy(postId, true);
    try {
      const result = await toggleReactionAtomic(postId, reaction);
      if (result.error) { Alert.alert("Couldn't update reaction", result.error.message || "Please try again."); return; }
      const oldReaction = reactions[postId];
      setReactions((current) => ({ ...current, [postId]: result.reaction }));
      setPosts((items) => items.map((post) => post.id === postId ? { ...post, likes: Math.max(0, post.likes + (result.reaction ? (oldReaction ? 0 : 1) : -1)) } : post));
    } finally { setBusy(postId, false); }
  };

  const chooseReaction = (postId: string) => Alert.alert("React to this post", "Choose your reaction", [...REACTION_OPTIONS.map((emoji) => ({ text: emoji, onPress: () => void react(postId, emoji) })), { text: "Cancel", style: "cancel" }]);

  const save = async (postId: string) => {
    if (!isAuthenticated) { setAuthGateAction("save posts"); return; }
    if (busyPostIds.has(postId)) return;
    setBusy(postId, true);
    try { const result = await toggleSavedPostAtomic(postId); if (result.error) Alert.alert("Couldn't update saved posts", result.error.message || "Please try again."); }
    finally { setBusy(postId, false); }
  };

  const share = async (post: LocalPost) => {
    if (!isAuthenticated || !user) { setAuthGateAction("share posts"); return; }
    Alert.alert("Share post", "How do you want to share this?", [
      { text: "Share as a Lekka post", onPress: () => void (async () => {
        const result = await createPost({ kind: "post", category: "general", title: "Shared post", body: `Shared from ${post.author}\n\n${post.body}`, area: post.area || area || "your area", visibility: "nearby" });
        if (result.error) Alert.alert("Couldn't share on Lekka", result.error.message || "Please try again."); else Alert.alert("Shared", "The post was shared to your Lekka feed.");
      })() },
      { text: "Share externally", onPress: () => void Share.share({ message: `${post.title ? `${post.title}\n` : ""}${post.body}\n\nShared from Lekka` }) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const deletePost = async (postId: string) => {
    if (!isAuthenticated) { setAuthGateAction("delete your post"); return; }
    const result = await deleteOwnPost(postId);
    if (result.error || !result.deleted) { Alert.alert("Couldn't delete post", result.error?.message || "The post could not be deleted. Please try again."); return; }
    setPosts((current) => current.filter((post) => post.id !== postId));
  };
  const confirmDeletePost = (postId: string) => Alert.alert("Delete post?", "This can't be undone.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void deletePost(postId) }]);
  const retryOutbox = async () => { if (!user || outboxStatus === "syncing") return; setOutboxStatus("syncing"); try { const sync = await syncPendingPostDrafts(user.id); const remaining = sync.remaining ?? (await listPendingPostDrafts(user.id)).length; setPendingDrafts(remaining); setOutboxStatus(remaining > 0 ? "queued" : "idle"); } catch { setOutboxStatus("error"); } };
  const visiblePosts = useMemo(() => personalizeFeed(posts, activeTab, feedback).filter((post) => `${post.title ?? ""} ${post.body} ${post.author}`.toLowerCase().includes(query.toLowerCase())), [posts, activeTab, feedback, query]);
  const refresh = async () => { setRefreshing(true); try { const settings = await loadSettings(); const location = await getLastKnownOrCurrentLocation(settings.area); const liveLocation = location.status === "granted" ? location.location : undefined; if (liveLocation) { setDeviceLocation(liveLocation); setArea(liveLocation.area); } else setArea(settings.area || "your area"); const page = await fetchFeedPage(liveLocation, null); setPosts(page.posts); setNextCursor(page.nextCursor); } finally { setRefreshing(false); } };
  const loadMore = async () => { if (!nextCursor || loadingMore) return; setLoadingMore(true); try { const page = await fetchFeedPage(deviceLocation ?? undefined, nextCursor); setPosts((current) => { const seen = new Set(current.map((post) => post.id)); return [...current, ...page.posts.filter((post) => !seen.has(post.id))]; }); setNextCursor(page.nextCursor); } finally { setLoadingMore(false); } };
  const presentation = getFetchPresentation({ isInitialLoading: initialLoading, isRefreshing: refreshing || backgroundRefreshing, hasData: posts.length > 0 });

  return <ScreenContainer containerClassName="bg-background">
    {authGateAction && <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />}
    <FlatList data={visiblePosts} keyExtractor={(item) => item.id} onEndReached={loadMore} onEndReachedThreshold={0.55} ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 18 }} /> : null} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} contentContainerStyle={styles.content}
      ListHeaderComponent={<><View style={styles.headerRow}><View><View style={styles.locationLine}><IconSymbol name="location.fill" size={16} color={colors.primary} /><Text style={[styles.eyebrow,{color:colors.primary}]}>YOUR LOCAL RADAR</Text></View><Text style={[styles.title,{color:colors.foreground}]}>What’s happening in {area || "your area"}?</Text></View><View style={styles.headerActions}><Pressable accessibilityLabel="Notifications" onPress={() => router.push("/notifications" as never)} style={styles.iconButton}><IconSymbol name="bell.fill" size={23} color={colors.foreground}/>{unreadCount>0&&<View style={[styles.badge,{backgroundColor:colors.error}]}><Text style={styles.badgeText}>{unreadCount>99?"99+":unreadCount}</Text></View>}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open your Lekka menu" onPress={() => router.push("/menu" as never)} style={styles.avatar}>{profileAvatarUrl?<Image source={{uri:profileAvatarUrl}} contentFit="cover" style={styles.avatarImage}/>:<Text style={styles.avatarText}>{getAvatarInitials(profileDisplayName)}</Text>}</Pressable></View></View><View style={[styles.searchBox,{backgroundColor:colors.surface,borderColor:colors.border}]}><IconSymbol name="magnifyingglass" size={20} color={colors.muted}/><TextInput value={query} onChangeText={setQuery} placeholder="Search your local area" placeholderTextColor={colors.muted} style={[styles.searchInput,{color:colors.foreground}]}/></View><FlatList data={tabs} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item)=>item} contentContainerStyle={styles.tabRow} renderItem={({item})=><Pressable onPress={()=>setActiveTab(item)} style={[styles.tab,activeTab===item&&{backgroundColor:colors.foreground}]}><Text style={[styles.tabText,{color:activeTab===item?colors.background:colors.muted}]}>{item}</Text></Pressable>}/><View style={styles.sectionHeader}><Text style={[styles.sectionTitle,{color:colors.foreground}]}>Fresh from around you</Text><Text style={[styles.sectionMeta,{color:colors.muted}]}>{visiblePosts.length} stories</Text></View>{presentation==="content-refreshing"&&<View style={[styles.syncPill,{backgroundColor:`${colors.primary}12`}]}><View style={[styles.syncDot,{backgroundColor:colors.primary}]}/><Text style={[styles.syncText,{color:colors.primary}]}>Updating your local feed</Text></View>}{(outboxStatus!=="idle"||pendingDrafts>0)&&<View style={[styles.outboxPill,{backgroundColor:outboxStatus==="error"?`${colors.error}12`:`${colors.warning}14`}]}><Text style={[styles.syncText,{color:outboxStatus==="error"?colors.error:colors.foreground}]}>{outboxStatus==="syncing"?"Retrying saved drafts…":outboxStatus==="error"?"Draft sync paused — check your connection":`${pendingDrafts} saved draft${pendingDrafts===1?"":"s"} waiting to retry`}</Text>{outboxStatus!=="syncing"&&<Pressable onPress={()=>void retryOutbox}><Text style={[styles.retryText,{color:colors.warning}]}>Retry</Text></Pressable>}</View>}</>}
      renderItem={({item})=><PostCard post={item} colors={colors} feedback={feedback[item.id]} reaction={reactions[item.id]} busy={busyPostIds.has(item.id)} profileImageUrl={profileImageUrls[item.id]} postImageUrl={postImageUrls[item.id]} isOwner={user?.id===item.authorId} onFeedback={(preference)=>void submitFeedback(item.id,preference)} onOpen={()=>router.push({pathname:"/post/[id]",params:{id:item.id}} as never)} onLike={()=>void react(item.id)} onLongReact={()=>chooseReaction(item.id)} onSave={()=>void save(item.id)} onShare={()=>void share(item)} onDelete={()=>confirmDeletePost(item.id)} />}
      ListEmptyComponent={presentation==="skeleton"?<FeedSkeletonList/>:<View style={styles.empty}><IconSymbol name="location.fill" size={30} color={colors.primary}/><Text style={[styles.emptyTitle,{color:colors.foreground}]}>Nothing matches that search</Text><Text style={[styles.emptyText,{color:colors.muted}]}>Try a different phrase or switch to Nearby.</Text></View>}
    />
  </ScreenContainer>;
}

function PostCard({post,colors,feedback,reaction,busy,profileImageUrl,postImageUrl,isOwner,onFeedback,onOpen,onLike,onLongReact,onSave,onShare,onDelete}:{post:LocalPost;colors:ReturnType<typeof useColors>;feedback?:FeedPreference;reaction?:ReactionType|null;busy:boolean;profileImageUrl?:string;postImageUrl?:string;isOwner:boolean;onFeedback:(preference:FeedPreference)=>void;onOpen:()=>void;onLike:()=>void;onLongReact:()=>void;onSave:()=>void;onShare:()=>void;onDelete:()=>void}) {
  const openMenu=()=>{const options:any[]=[];if(isOwner){options.push({text:"Edit post",onPress:()=>router.push({pathname:"/edit-post/[id]",params:{id:post.id}} as never)});options.push({text:"Delete post",style:"destructive",onPress:onDelete});}options.push({text:"Not interested",onPress:()=>onFeedback("not_interested")});options.push({text:"Cancel",style:"cancel"});Alert.alert("Post options",undefined,options);};
  return <Pressable onPress={onOpen} style={[styles.card,{backgroundColor:colors.surface,borderColor:colors.border}]}><View style={styles.postHeader}><Pressable onPress={onOpen} style={[styles.authorAvatar,{backgroundColor:post.accent}]}>{profileImageUrl?<Image source={{uri:profileImageUrl}} contentFit="cover" style={styles.authorAvatarImage}/>:<Text style={styles.authorInitials}>{post.initials}</Text>}</Pressable><View style={styles.authorCopy}><Text style={[styles.author,{color:colors.foreground}]}>{post.author}</Text><View style={styles.metaLine}><Text style={[styles.meta,{color:colors.muted}]}>{post.area} · {post.distance} · {post.time}</Text>{post.trusted&&<IconSymbol name="checkmark.seal.fill" size={15} color={colors.primary}/>}</View></View><Pressable accessibilityRole="button" accessibilityLabel="Post options" onPress={openMenu} style={styles.postMenu}><IconSymbol name="ellipsis" size={22} color={colors.muted}/></Pressable></View>{post.kind==="alert"&&<View style={[styles.alertPill,{backgroundColor:`${post.accent}18`}]}><IconSymbol name="exclamationmark.triangle.fill" size={15} color={post.accent}/><Text style={[styles.alertText,{color:post.accent}]}>LOCAL ALERT · REPORTED</Text></View>}{postImageUrl&&<Image source={{uri:postImageUrl}} contentFit="cover" style={styles.postImage}/>} {!!post.title&&<Text style={[styles.postTitle,{color:colors.foreground}]}>{post.title}</Text>}<Text style={[styles.postBody,{color:colors.foreground}]}>{post.body}</Text><View style={[styles.postActions,{borderTopColor:colors.border}]}><Pressable disabled={busy} onPress={onLike} onLongPress={onLongReact} delayLongPress={350} style={styles.action}><Text style={styles.reactionEmoji}>{reaction??"👍"}</Text><Text style={[styles.actionText,{color:colors.muted}]}>{post.likes}</Text></Pressable><Pressable onPress={onOpen} style={styles.action}><IconSymbol name="bubble.left.fill" size={19} color={colors.muted}/><Text style={[styles.actionText,{color:colors.muted}]}>{post.comments}</Text></Pressable><Pressable disabled={busy} onPress={onSave} style={styles.action}><IconSymbol name="bookmark.fill" size={19} color={colors.muted}/><Text style={[styles.actionText,{color:colors.muted}]}>Save</Text></Pressable><Pressable onPress={onShare} style={styles.action}><IconSymbol name="square.and.arrow.up" size={19} color={colors.muted}/></Pressable></View></Pressable>;
}

const styles=StyleSheet.create({content:{padding:20,paddingBottom:30},headerRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18},locationLine:{flexDirection:"row",alignItems:"center",gap:6,marginBottom:8},eyebrow:{fontSize:11,fontWeight:"800",letterSpacing:1.2},title:{fontSize:27,lineHeight:33,fontWeight:"800",maxWidth:280},headerActions:{flexDirection:"row",alignItems:"center",gap:10},iconButton:{padding:9,position:"relative"},badge:{position:"absolute",top:2,right:0,minWidth:17,height:17,borderRadius:9,alignItems:"center",justifyContent:"center",paddingHorizontal:3},badgeText:{color:"#FFF",fontSize:9,fontWeight:"900"},avatar:{width:40,height:40,borderRadius:20,backgroundColor:"#E9A23B",alignItems:"center",justifyContent:"center",overflow:"hidden"},avatarImage:{width:"100%",height:"100%"},avatarText:{color:"#10211D",fontWeight:"800",fontSize:12},searchBox:{height:48,borderRadius:16,borderWidth:1,flexDirection:"row",alignItems:"center",paddingHorizontal:14,gap:9},searchInput:{flex:1,fontSize:15},tabRow:{gap:8,paddingVertical:18},tab:{borderRadius:20,paddingHorizontal:15,paddingVertical:9},tabText:{fontSize:13,fontWeight:"700"},sectionHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:12},sectionTitle:{fontSize:18,fontWeight:"800"},sectionMeta:{fontSize:12},card:{borderRadius:20,borderWidth:1,padding:16,marginBottom:12},postHeader:{flexDirection:"row",alignItems:"center",gap:10},authorAvatar:{width:38,height:38,borderRadius:13,alignItems:"center",justifyContent:"center",overflow:"hidden"},authorAvatarImage:{width:"100%",height:"100%"},authorInitials:{color:"#FFF",fontSize:12,fontWeight:"800"},authorCopy:{flex:1},author:{fontWeight:"800",fontSize:14},metaLine:{flexDirection:"row",alignItems:"center",gap:4,marginTop:3},meta:{fontSize:11},postMenu:{padding:4},alertPill:{alignSelf:"flex-start",flexDirection:"row",alignItems:"center",gap:5,borderRadius:8,paddingHorizontal:9,paddingVertical:6,marginTop:14},alertText:{fontSize:10,fontWeight:"800",letterSpacing:0.4},postImage:{width:"100%",height:230,borderRadius:14,marginTop:14},postTitle:{fontSize:17,fontWeight:"800",lineHeight:22,marginTop:14},postBody:{fontSize:14,lineHeight:21,marginTop:7},postActions:{flexDirection:"row",alignItems:"center",gap:18,borderTopWidth:1,marginTop:15,paddingTop:13},action:{flexDirection:"row",alignItems:"center",gap:5},reactionEmoji:{fontSize:19},actionText:{fontSize:12,fontWeight:"600"},empty:{alignItems:"center",paddingVertical:70,gap:8},emptyTitle:{fontSize:18,fontWeight:"800"},emptyText:{fontSize:14},syncPill:{alignSelf:"flex-start",flexDirection:"row",alignItems:"center",gap:7,borderRadius:12,paddingHorizontal:10,paddingVertical:6,marginBottom:12},outboxPill:{alignSelf:"stretch",flexDirection:"row",alignItems:"center",gap:7,borderRadius:12,paddingHorizontal:10,paddingVertical:8,marginBottom:12},syncDot:{width:7,height:7,borderRadius:4},syncText:{flex:1,fontSize:11,fontWeight:"700"},retryText:{fontSize:11,fontWeight:"900"}});

import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Share, StyleSheet, Text, TextInput, View, Modal } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { FeedTab, FeedPreference, LocalPost, loadSettings, personalizeFeed } from "@/lib/local-radar";
import { DeviceLocation, getLastKnownOrCurrentLocation } from "@/lib/location";
import { createPost, fetchFeedPage, subscribeToLocalChanges } from "@/lib/supabase-repository";
import { createSignedMediaUrl, getUnreadNotificationCount, listPostFeedback, setPostFeedback } from "@/lib/social-repository";
import { REACTION_OPTIONS, ReactionType, toggleReactionAtomic, toggleSavedPostAtomic } from "@/lib/atomic-social";
import { deleteOwnPost, reportPost } from "@/lib/post-actions";
import { useColors } from "@/hooks/use-colors";
import { FeedSkeletonList } from "@/components/ui/loading-skeleton";
import { getFetchPresentation } from "@/lib/loading-state";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { AuthGate } from "@/components/auth-gate";
import { listPendingPostDrafts, syncPendingPostDrafts } from "@/lib/offline-outbox";
import { loadMyProfile } from "@/lib/profile";
import { getAvatarInitials } from "@/lib/profile-avatar";

const tabs: FeedTab[] = ["For You", "Nearby", "Trending", "Following"];

function formatPostTime(value: string): string {
  if (!value) return "now";
  const raw = value.trim();
  const iso = Date.parse(raw);
  if (!Number.isNaN(iso)) {
    const seconds = Math.max(0, (Date.now() - iso) / 1000);
    if (seconds < 45) return "now";
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.round(seconds / 86400)}d`;
    if (seconds < 2592000) return `${Math.round(seconds / 604800)}w`;
    const date = new Date(iso);
    return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }) });
  }
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(min|mins|minute|minutes|hr|hrs|hour|hours|day|days|week|weeks)$/i);
  if (match) {
    const amount = Math.max(1, Math.round(Number(match[1])));
    const unit = match[2].toLowerCase();
    if (unit.startsWith("min")) return `${amount}m`;
    if (unit.startsWith("hr") || unit.startsWith("hour")) return `${amount}h`;
    if (unit.startsWith("day")) return `${amount}d`;
    return `${amount}w`;
  }
  return raw;
}

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
  const [sheet, setSheet] = useState<{ type: "post" | "reaction" | "share" | "delete"; post?: LocalPost } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

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
    })().catch(() => { if (active) { setInitialLoading(false); setToast("We couldn't refresh your local feed. Try again."); } });
    return () => { active = false; };
  }, [user]);

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
  }, [posts, user]);

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
    setSheet(null);
    const result = await setPostFeedback(postId, preference);
    if (result.error) {
      setFeedback((current) => { const next = { ...current }; if (previous) next[postId] = previous; else delete next[postId]; return next; });
      setToast("Couldn't update your feed preference. Please try again.");
    } else if (preference === "not_interested") setToast("You'll see fewer posts like this.");
  };

  const react = async (postId: string, reaction: ReactionType = "👍") => {
    if (!isAuthenticated) { setAuthGateAction("react to posts"); return; }
    if (busyPostIds.has(postId)) return;
    setBusy(postId, true);
    try {
      const result = await toggleReactionAtomic(postId, reaction);
      if (result.error) { setToast("Couldn't update your reaction. Please try again."); return; }
      const oldReaction = reactions[postId];
      setReactions((current) => ({ ...current, [postId]: result.reaction }));
      setPosts((items) => items.map((post) => post.id === postId ? { ...post, likes: Math.max(0, post.likes + (result.reaction ? (oldReaction ? 0 : 1) : -1)) } : post));
      setSheet(null);
    } finally { setBusy(postId, false); }
  };

  const save = async (postId: string) => {
    if (!isAuthenticated) { setAuthGateAction("save posts"); return; }
    if (busyPostIds.has(postId)) return;
    setBusy(postId, true);
    try {
      const result = await toggleSavedPostAtomic(postId);
      if (result.error) setToast("Couldn't update saved posts. Please try again.");
      else setToast("Saved posts updated.");
    } finally { setBusy(postId, false); }
  };

  const report = async (postId: string) => {
    if (!isAuthenticated) { setSheet(null); setAuthGateAction("report posts"); return; }
    setSheet(null);
    const result = await reportPost(postId, "reported_by_user");
    setToast(result.error ? "Couldn't submit the report. Please try again." : "Report submitted. Thanks for helping keep Lekka safe.");
  };

  const shareAsPost = async (post: LocalPost) => {
    if (!isAuthenticated || !user) { setAuthGateAction("share posts"); return; }
    setSheet(null);
    const result = await createPost({ kind: "post", category: "general", title: "Shared post", body: `Shared from ${post.author}\n\n${post.body}`, area: post.area || area || "your area", visibility: "nearby" });
    if (result.error) setToast("Couldn't share this post on Lekka.");
    else setToast("Post shared to your Lekka feed.");
  };

  const deletePost = async (postId: string) => {
    if (!isAuthenticated) { setAuthGateAction("delete your post"); return; }
    const result = await deleteOwnPost(postId);
    if (result.error || !result.deleted) { setToast("Couldn't delete this post. Please try again."); return; }
    setPosts((current) => current.filter((post) => post.id !== postId));
    setSheet(null);
    setToast("Post deleted.");
  };

  const retryOutbox = async () => { if (!user || outboxStatus === "syncing") return; setOutboxStatus("syncing"); try { const sync = await syncPendingPostDrafts(user.id); const remaining = sync.remaining ?? (await listPendingPostDrafts(user.id)).length; setPendingDrafts(remaining); setOutboxStatus(remaining > 0 ? "queued" : "idle"); } catch { setOutboxStatus("error"); } };
  const visiblePosts = useMemo(() => personalizeFeed(posts, activeTab, feedback).filter((post) => `${post.title ?? ""} ${post.body} ${post.author}`.toLowerCase().includes(query.toLowerCase())), [posts, activeTab, feedback, query]);
  const refresh = async () => { setRefreshing(true); try { const settings = await loadSettings(); const location = await getLastKnownOrCurrentLocation(settings.area); const liveLocation = location.status === "granted" ? location.location : undefined; if (liveLocation) { setDeviceLocation(liveLocation); setArea(liveLocation.area); } else setArea(settings.area || "your area"); const page = await fetchFeedPage(liveLocation, null); setPosts(page.posts); setNextCursor(page.nextCursor); } catch { setToast("Couldn't refresh your feed. Please try again."); } finally { setRefreshing(false); } };
  const loadMore = async () => { if (!nextCursor || loadingMore) return; setLoadingMore(true); try { const page = await fetchFeedPage(deviceLocation ?? undefined, nextCursor); setPosts((current) => { const seen = new Set(current.map((post) => post.id)); return [...current, ...page.posts.filter((post) => !seen.has(post.id))]; }); setNextCursor(page.nextCursor); } finally { setLoadingMore(false); } };
  const presentation = getFetchPresentation({ isInitialLoading: initialLoading, isRefreshing: refreshing || backgroundRefreshing, hasData: posts.length > 0 });

  return <ScreenContainer containerClassName="bg-background">
    {authGateAction && <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />}
    <FlatList data={visiblePosts} keyExtractor={(item) => item.id} onEndReached={loadMore} onEndReachedThreshold={0.55} ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 18 }} /> : null} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} contentContainerStyle={styles.content}
      ListHeaderComponent={<><View style={styles.headerRow}><View style={styles.locationSelector}><View style={styles.locationLine}><IconSymbol name="location.fill" size={16} color={colors.primary} /><Text style={[styles.locationText,{color:colors.foreground}]}>{area || "Your area"}</Text><IconSymbol name="chevron.down" size={14} color={colors.muted}/></View></View><View style={styles.headerActions}><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push("/notifications" as never)} style={styles.iconButton}><IconSymbol name="bell.fill" size={21} color={colors.foreground}/>{unreadCount>0&&<View style={[styles.badge,{backgroundColor:colors.error}]}><Text style={styles.badgeText}>{unreadCount>99?"99+":unreadCount}</Text></View>}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open your Lekka menu" onPress={() => router.push("/menu" as never)} style={styles.avatar}>{profileAvatarUrl?<Image source={{uri:profileAvatarUrl}} contentFit="cover" style={styles.avatarImage}/>:<Text style={styles.avatarText}>{getAvatarInitials(profileDisplayName)}</Text>}</Pressable></View></View><View style={[styles.searchBox,{backgroundColor:colors.surface,borderColor:colors.border}]}><IconSymbol name="magnifyingglass" size={19} color={colors.muted}/><TextInput value={query} onChangeText={setQuery} placeholder="Search your local area" placeholderTextColor={colors.muted} accessibilityLabel="Search your local area" returnKeyType="search" style={[styles.searchInput,{color:colors.foreground}]}/></View><FlatList data={tabs} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item)=>item} contentContainerStyle={styles.tabRow} renderItem={({item})=><Pressable accessibilityRole="button" accessibilityState={{selected:activeTab===item}} onPress={()=>setActiveTab(item)} style={[styles.tab,activeTab===item&&{backgroundColor:colors.primary}]}><Text style={[styles.tabText,{color:activeTab===item?colors.accentText:colors.muted}]}>{item}</Text></Pressable>}/>{presentation==="content-refreshing"&&<View style={[styles.syncPill,{backgroundColor:`${colors.primary}12`}]}><View style={[styles.syncDot,{backgroundColor:colors.primary}]}/><Text style={[styles.syncText,{color:colors.primary}]}>Updating your local feed</Text></View>}{(outboxStatus!=="idle"||pendingDrafts>0)&&<View style={[styles.outboxPill,{backgroundColor:outboxStatus==="error"?`${colors.error}12`:`${colors.warning}14`}]}><Text style={[styles.syncText,{color:outboxStatus==="error"?colors.error:colors.foreground}]}>{outboxStatus==="syncing"?"Retrying saved drafts…":outboxStatus==="error"?"Draft sync paused — check your connection":`${pendingDrafts} saved draft${pendingDrafts===1?"":"s"} waiting to retry`}</Text>{outboxStatus!=="syncing"&&<Pressable accessibilityRole="button" onPress={()=>void retryOutbox()}><Text style={[styles.retryText,{color:colors.warning}]}>Retry</Text></Pressable>}</View>}</>}
      renderItem={({item})=><PostCard post={item} colors={colors} feedback={feedback[item.id]} reaction={reactions[item.id]} busy={busyPostIds.has(item.id)} profileImageUrl={profileImageUrls[item.id]} postImageUrl={postImageUrls[item.id]} isOwner={user?.id===item.authorId} onFeedback={(preference)=>void submitFeedback(item.id,preference)} onOpen={()=>router.push({pathname:"/post/[id]",params:{id:item.id}} as never)} onLike={()=>void react(item.id)} onLongReact={()=>setSheet({type:"reaction",post:item})} onSave={()=>void save(item.id)} onShare={()=>setSheet({type:"share",post:item})} onMenu={()=>setSheet({type:"post",post:item})} />}
      ListEmptyComponent={presentation==="skeleton"?<FeedSkeletonList/>:<View style={styles.empty}><IconSymbol name="location.fill" size={30} color={colors.primary}/><Text style={[styles.emptyTitle,{color:colors.foreground}]}>{query ? "Nothing matches that search" : "Nothing nearby yet"}</Text><Text style={[styles.emptyText,{color:colors.muted}]}>{query ? "Try a different phrase or switch to Nearby." : "Pull to refresh or check back when people nearby post."}</Text></View>}
    />
    {sheet && <PostActionSheet sheet={sheet} colors={colors} onClose={()=>setSheet(null)} onNotInterested={(postId)=>void submitFeedback(postId,"not_interested")} onReact={(postId,reaction)=>void react(postId,reaction)} onShareExternal={(post)=>{setSheet(null); void Share.share({message:`${post.title ? `${post.title}\n` : ""}${post.body}\n\nShared from Lekka`});}} onShareAsPost={(post)=>void shareAsPost(post)} onDelete={(postId)=>void deletePost(postId)} onReport={(postId)=>void report(postId)} onEdit={(postId)=>{setSheet(null); router.push({pathname:"/edit-post/[id]",params:{id:postId}} as never);}} />}
    {toast && <View pointerEvents="none" style={styles.toast}><IconSymbol name="checkmark.circle.fill" size={18} color={colors.primary}/><Text style={[styles.toastText,{color:colors.foreground}]}>{toast}</Text></View>}
  </ScreenContainer>;
}

function PostCard({post,colors,feedback,reaction,busy,profileImageUrl,postImageUrl,isOwner,onFeedback,onOpen,onLike,onLongReact,onSave,onShare,onMenu}:{post:LocalPost;colors:ReturnType<typeof useColors>;feedback?:FeedPreference;reaction?:ReactionType|null;busy:boolean;profileImageUrl?:string;postImageUrl?:string;isOwner:boolean;onFeedback:(preference:FeedPreference)=>void;onOpen:()=>void;onLike:()=>void;onLongReact:()=>void;onSave:()=>void;onShare:()=>void;onMenu:()=>void}) {
  const category = post.category ? post.category.replace(/_/g," ").replace(/\b\w/g,(letter)=>letter.toUpperCase()) : null;
  return <Pressable onPress={onOpen} style={[styles.card,{backgroundColor:colors.surface,borderColor:colors.border}]}><View style={styles.postHeader}><Pressable onPress={onOpen} style={[styles.authorAvatar,{backgroundColor:post.accent}]}>{profileImageUrl?<Image source={{uri:profileImageUrl}} contentFit="cover" style={styles.authorAvatarImage}/>:<Text style={styles.authorInitials}>{post.initials}</Text>}</Pressable><View style={styles.authorCopy}><Text style={[styles.author,{color:colors.foreground}]}>{post.author}</Text><View style={styles.metaLine}><Text style={[styles.meta,{color:colors.muted}]}>{post.area} · {post.distance} · {formatPostTime(post.time)}</Text>{post.trusted&&<IconSymbol name="checkmark.seal.fill" size={15} color={colors.primary}/>}</View></View><Pressable accessibilityRole="button" accessibilityLabel="Post options" onPress={onMenu} style={styles.postMenu}><IconSymbol name="ellipsis" size={22} color={colors.muted}/></Pressable></View>{category&&<View style={[styles.categoryChip,{backgroundColor:colors.surfaceAlt,borderColor:colors.border}]}><Text style={[styles.categoryText,{color:colors.muted}]}>{category}</Text></View>}{post.kind==="alert"&&<View style={[styles.alertPill,{backgroundColor:`${post.accent}18`}]}><IconSymbol name="exclamationmark.triangle.fill" size={15} color={post.accent}/><Text style={[styles.alertText,{color:post.accent}]}>LOCAL ALERT · REPORTED</Text></View>}{!!postImageUrl&&<Image source={{uri:postImageUrl}} contentFit="cover" style={styles.postImage}/>} {!!post.title&&<Text style={[styles.postTitle,{color:colors.foreground}]}>{post.title}</Text>}<Text numberOfLines={4} style={[styles.postBody,{color:colors.foreground}]}>{post.body}</Text><View style={[styles.postActions,{borderTopColor:colors.border}]}><Pressable disabled={busy} onPress={onLike} onLongPress={onLongReact} delayLongPress={350} style={styles.action}><Text style={styles.reactionEmoji}>{reaction??"👍"}</Text><Text style={[styles.actionText,{color:colors.muted}]}>{post.likes}</Text></Pressable><Pressable onPress={onOpen} style={styles.action}><IconSymbol name="bubble.left.fill" size={19} color={colors.muted}/><Text style={[styles.actionText,{color:colors.muted}]}>{post.comments}</Text></Pressable><Pressable disabled={busy} onPress={onSave} style={styles.action}><IconSymbol name="bookmark.fill" size={19} color={colors.muted}/><Text style={[styles.actionText,{color:colors.muted}]}>Save</Text></Pressable><Pressable onPress={onShare} style={styles.action}><IconSymbol name="square.and.arrow.up" size={19} color={colors.muted}/><Text style={[styles.actionText,{color:colors.muted}]}>Share</Text></Pressable></View></Pressable>;
}

function PostActionSheet({sheet,colors,onClose,onNotInterested,onReact,onShareExternal,onShareAsPost,onDelete,onReport,onEdit}:{sheet:{type:"post"|"reaction"|"share"|"delete";post?:LocalPost};colors:ReturnType<typeof useColors>;onClose:()=>void;onNotInterested:(postId:string)=>void;onReact:(postId:string,reaction:ReactionType)=>void;onShareExternal:(post:LocalPost)=>void;onShareAsPost:(post:LocalPost)=>void;onDelete:(postId:string)=>void;onReport:(postId:string)=>void;onEdit:(postId:string)=>void}) {
  const post = sheet.post;
  if (!post) return null;
  const title = sheet.type === "delete" ? "Delete this post?" : sheet.type === "reaction" ? "React to this post" : sheet.type === "share" ? "Share post" : "Post options";
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.sheetScrim} onPress={onClose}><Pressable style={[styles.sheet,{backgroundColor:colors.surface,borderColor:colors.border}]} onPress={(event)=>event.stopPropagation()}><View style={[styles.handle,{backgroundColor:colors.border}]}/><Text style={[styles.sheetTitle,{color:colors.foreground}]}>{title}</Text>{sheet.type==="delete"&&<><Text style={[styles.sheetSubtitle,{color:colors.muted}]}>This removes your post permanently.</Text><View style={styles.confirmRow}><Pressable onPress={onClose} style={[styles.confirmButton,{borderColor:colors.border}]}><Text style={[styles.confirmText,{color:colors.foreground}]}>Cancel</Text></Pressable><Pressable onPress={()=>onDelete(post.id)} style={[styles.confirmButton,{backgroundColor:colors.error,borderColor:colors.error}]}><Text style={styles.deleteText}>Delete</Text></Pressable></View></>}{sheet.type==="reaction"&&<View style={styles.reactionGrid}>{REACTION_OPTIONS.map((emoji)=><Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`React ${emoji}`} onPress={()=>onReact(post.id,emoji)} style={styles.reactionChoice}><Text style={styles.reactionChoiceText}>{emoji}</Text></Pressable>)}</View>}{sheet.type==="share"&&<View style={styles.sheetList}><SheetRow icon="repeat" label="Share as a Lekka post" onPress={()=>onShareAsPost(post)} colors={colors}/><SheetRow icon="ios-share" label="Share externally" onPress={()=>onShareExternal(post)} colors={colors}/></View>}{sheet.type==="post"&&<View style={styles.sheetList}>{post.authorId&&<SheetRow icon="visibility-off" label="Not interested" subtitle="See fewer posts like this" onPress={()=>onNotInterested(post.id)} colors={colors}/>} {post.authorId&&<SheetRow icon="link" label="Copy link" onPress={()=>onShareExternal(post)} colors={colors}/>} {post.authorId&&<SheetRow icon="flag" label="Report post" subtitle="Send this to Lekka moderators" destructive onPress={()=>onReport(post.id)} colors={colors}/>} {post.authorId&&post.id&&<SheetRow icon="ios-share" label="Share post" onPress={()=>{onClose(); onShareExternal(post);}} colors={colors}/>} {post.authorId&&<SheetRow icon="edit" label="Edit post" onPress={()=>onEdit(post.id)} colors={colors}/>}</View>}{sheet.type!=="delete"&&sheet.type!=="reaction"&&<Pressable onPress={onClose} style={styles.sheetCancel}><Text style={[styles.sheetCancelText,{color:colors.muted}]}>Cancel</Text></Pressable>}</Pressable></Pressable></Modal>;
}

function SheetRow({icon,label,subtitle,destructive,onPress,colors}:{icon:keyof typeof import("@expo/vector-icons/MaterialIcons").default.glyphMap;label:string;subtitle?:string;destructive?:boolean;onPress:()=>void;colors:ReturnType<typeof useColors>}) { return <Pressable accessibilityRole="button" accessibilityLabel={subtitle ? `${label}. ${subtitle}` : label} onPress={onPress} style={({pressed})=>[styles.sheetRow,pressed&&styles.pressed]}><View style={[styles.sheetIcon,{backgroundColor:destructive?`${colors.error}22`:colors.background}]}><IconSymbol name={icon as never} size={20} color={destructive?colors.error:colors.foreground}/></View><View style={styles.sheetRowCopy}><Text style={[styles.sheetRowLabel,{color:destructive?colors.error:colors.foreground}]}>{label}</Text>{subtitle&&<Text style={[styles.sheetRowSubtitle,{color:colors.muted}]}>{subtitle}</Text>}</View><IconSymbol name="chevron.right" size={18} color={colors.muted}/></Pressable>; }

const styles=StyleSheet.create({content:{paddingHorizontal:16,paddingBottom:30},headerRow:{height:56,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},locationSelector:{flex:1},locationLine:{flexDirection:"row",alignItems:"center",gap:6},locationText:{fontSize:16,fontWeight:"700"},headerActions:{flexDirection:"row",alignItems:"center",gap:2},iconButton:{width:44,height:44,alignItems:"center",justifyContent:"center",position:"relative"},badge:{position:"absolute",top:3,right:2,minWidth:17,height:17,borderRadius:9,alignItems:"center",justifyContent:"center",paddingHorizontal:3},badgeText:{color:"#FFF",fontSize:9,fontWeight:"900"},avatar:{width:40,height:40,borderRadius:20,backgroundColor:"#E9A23B",alignItems:"center",justifyContent:"center",overflow:"hidden",marginLeft:2},avatarImage:{width:"100%",height:"100%"},avatarText:{color:"#10211D",fontWeight:"800",fontSize:12},searchBox:{height:44,borderRadius:12,borderWidth:1,flexDirection:"row",alignItems:"center",paddingHorizontal:13,gap:9,marginTop:2},searchInput:{flex:1,fontSize:14},tabRow:{gap:8,paddingVertical:12},tab:{borderRadius:999,paddingHorizontal:14,paddingVertical:8,borderWidth:1,borderColor:"transparent"},tabText:{fontSize:13,fontWeight:"700"},card:{borderRadius:12,borderWidth:1,padding:12,marginBottom:10},postHeader:{flexDirection:"row",alignItems:"center",gap:10},authorAvatar:{width:40,height:40,borderRadius:20,alignItems:"center",justifyContent:"center",overflow:"hidden"},authorAvatarImage:{width:"100%",height:"100%"},authorInitials:{color:"#FFF",fontSize:12,fontWeight:"800"},authorCopy:{flex:1},author:{fontWeight:"700",fontSize:14},metaLine:{flexDirection:"row",alignItems:"center",gap:4,marginTop:2},meta:{fontSize:12},postMenu:{width:44,height:44,alignItems:"center",justifyContent:"center"},categoryChip:{alignSelf:"flex-start",borderRadius:999,borderWidth:1,paddingHorizontal:10,paddingVertical:4,marginTop:10},categoryText:{fontSize:11,fontWeight:"600"},alertPill:{alignSelf:"flex-start",flexDirection:"row",alignItems:"center",gap:5,borderRadius:999,paddingHorizontal:9,paddingVertical:5,marginTop:10},alertText:{fontSize:10,fontWeight:"800",letterSpacing:0.4},postImage:{width:"100%",height:210,borderRadius:10,marginTop:12},postTitle:{fontSize:17,fontWeight:"700",lineHeight:22,marginTop:12},postBody:{fontSize:14,lineHeight:21,marginTop:7},postActions:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderTopWidth:1,marginTop:12,paddingTop:8},action:{minWidth:44,minHeight:44,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5},reactionEmoji:{fontSize:18},actionText:{fontSize:12,fontWeight:"600"},empty:{alignItems:"center",paddingVertical:70,gap:8},emptyTitle:{fontSize:18,fontWeight:"700"},emptyText:{fontSize:14},syncPill:{alignSelf:"flex-start",flexDirection:"row",alignItems:"center",gap:7,borderRadius:999,paddingHorizontal:10,paddingVertical:6,marginBottom:10},outboxPill:{alignSelf:"stretch",flexDirection:"row",alignItems:"center",gap:7,borderRadius:12,paddingHorizontal:10,paddingVertical:8,marginBottom:10},syncDot:{width:7,height:7,borderRadius:4},syncText:{flex:1,fontSize:11,fontWeight:"700"},retryText:{fontSize:11,fontWeight:"900"},toast:{position:"absolute",left:16,right:16,bottom:18,minHeight:48,borderRadius:14,paddingHorizontal:14,flexDirection:"row",alignItems:"center",gap:9,backgroundColor:"#171C1B",borderWidth:1,borderColor:"#3A423F",zIndex:50},toastText:{flex:1,fontSize:13,fontWeight:"600"},sheetScrim:{flex:1,backgroundColor:"rgba(0,0,0,0.62)",justifyContent:"flex-end"},sheet:{borderTopLeftRadius:28,borderTopRightRadius:28,borderWidth:StyleSheet.hairlineWidth,borderBottomWidth:0,paddingHorizontal:20,paddingTop:10,paddingBottom:28},handle:{width:36,height:4,borderRadius:2,alignSelf:"center",marginBottom:18},sheetTitle:{fontSize:20,lineHeight:26,fontWeight:"800",marginBottom:6},sheetSubtitle:{fontSize:13,lineHeight:19,marginBottom:10},sheetList:{gap:2,marginTop:4},sheetRow:{minHeight:58,flexDirection:"row",alignItems:"center",gap:12,borderRadius:14,paddingHorizontal:4},pressed:{opacity:0.7},sheetIcon:{width:40,height:40,borderRadius:20,alignItems:"center",justifyContent:"center"},sheetRowCopy:{flex:1},sheetRowLabel:{fontSize:15,lineHeight:20,fontWeight:"600"},sheetRowSubtitle:{fontSize:12,lineHeight:17,marginTop:1},sheetCancel:{minHeight:44,alignItems:"center",justifyContent:"center",marginTop:8},sheetCancelText:{fontSize:13,fontWeight:"700"},reactionGrid:{flexDirection:"row",flexWrap:"wrap",gap:10,paddingVertical:8},reactionChoice:{width:52,height:52,borderRadius:26,alignItems:"center",justifyContent:"center",backgroundColor:"#0E1211"},reactionChoiceText:{fontSize:24},confirmRow:{flexDirection:"row",gap:10,marginTop:8},confirmButton:{flex:1,minHeight:48,borderRadius:14,borderWidth:1,alignItems:"center",justifyContent:"center"},confirmText:{fontSize:14,fontWeight:"700"},deleteText:{color:"#FFF",fontSize:14,fontWeight:"800"}});

import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AuthGate } from "@/components/auth-gate";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { createSignedMediaUrl, deleteComment, getPostInteractionState, reportContent, type SocialComment, type SocialPost } from "@/lib/social-repository";
import { createCommentSafe, getPostDetailSafe, listCommentsSafe } from "@/lib/post-social";
import { REACTION_OPTIONS, toggleReactionAtomic, toggleSavedPostAtomic, type ReactionType } from "@/lib/atomic-social";
import { deleteOwnPost } from "@/lib/post-actions";
import { formatPostMetadata, formatPostTime } from "@/lib/post-format";

export default function PostDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, user, loading: authLoading } = useSupabaseAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [post, setPost] = useState<SocialPost | null>(null);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [reaction, setReaction] = useState<ReactionType | null>(null);
  const [saved, setSaved] = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState<string | null>(null);
  const [commentAvatarUrls, setCommentAvatarUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reactionBusy, setReactionBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [reactionPicker, setReactionPicker] = useState(false);
  const [authGateAction, setAuthGateAction] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || authLoading) return;
    let mounted = true;
    void (async () => {
      setLoading(true); setLoadError(null); setFeedback(null);
      const postResult = await getPostDetailSafe(id);
      if (!mounted) return;
      if (postResult.error || !postResult.data) { setPost(null); setLoadError(postResult.error?.message || "This post is no longer available or you don't have permission to view it."); setLoading(false); return; }
      setPost(postResult.data);
      if (postResult.data.profiles?.profile_image_path) {
        const signed = await createSignedMediaUrl(postResult.data.profiles.profile_image_path);
        if (mounted) setAuthorAvatarUrl(signed.data?.signedUrl ?? null);
      }
      const [stateResult, commentsResult] = await Promise.all([getPostInteractionState(id), listCommentsSafe(id)]);
      if (!mounted) return;
      if (stateResult.error) setFeedback("Couldn't load post activity. Please try again.");
      else if (stateResult.data) { setReaction(stateResult.data.liked ? "👍" : null); setSaved(stateResult.data.saved); setReactionCount(stateResult.data.reactions); setCommentCount(stateResult.data.comments); }
      if (commentsResult.error) setFeedback((current) => current ?? "Couldn't load comments. Please try again.");
      else setComments(commentsResult.data);
      const paths = (postResult.data.post_media ?? []).filter((m) => m.media_type === "image").map((m) => m.storage_path);
      const urls = await Promise.all(paths.map(async (path) => (await createSignedMediaUrl(path)).data?.signedUrl ?? null));
      if (mounted) { setMediaUrls(urls.filter((u): u is string => Boolean(u))); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [id, authLoading]);

  useEffect(() => {
    let mounted = true;
    void Promise.all(comments.map(async (comment) => {
      const path = comment.profiles?.profile_image_path;
      if (!path) return null;
      const signed = await createSignedMediaUrl(path);
      return signed.data?.signedUrl ? [comment.id, signed.data.signedUrl] as const : null;
    })).then((pairs) => { if (mounted) setCommentAvatarUrls(Object.fromEntries(pairs.filter(Boolean) as Array<readonly [string, string]>) as Record<string, string>); });
    return () => { mounted = false; };
  }, [comments]);

  const runProtected = (action: string, callback: () => Promise<void>) => { if (!isAuthenticated) { setAuthGateAction(action); return; } void callback(); };
  const applyReaction = (nextReaction: ReactionType = "👍") => runProtected("react to posts", async () => {
    if (reactionBusy) return; setReactionBusy(true); setReactionPicker(false); setFeedback(null);
    try { const result = await toggleReactionAtomic(id, nextReaction); if (result.error) { setFeedback("Couldn't update your reaction. Please try again."); return; } setReaction(result.reaction); const refreshed = await getPostInteractionState(id); if (!refreshed.error && refreshed.data) { setReactionCount(refreshed.data.reactions); setSaved(refreshed.data.saved); setReaction(refreshed.data.liked ? "👍" : null); } }
    finally { setReactionBusy(false); }
  });
  const save = () => runProtected("save posts", async () => { if (saveBusy) return; setSaveBusy(true); setFeedback(null); try { const result = await toggleSavedPostAtomic(id); if (result.error) { setFeedback("Couldn't update saved posts. Please try again."); return; } setSaved(result.saved); } finally { setSaveBusy(false); } });
  const submitComment = async () => { if (!isAuthenticated) { setAuthGateAction("comment on posts"); return; } if (commentBusy || !commentText.trim()) return; setCommentBusy(true); setFeedback(null); try { const result = await createCommentSafe(id, commentText); if (result.error || !result.data) { setFeedback(result.error?.message || "Couldn't comment. Please try again."); return; } setComments((current) => [result.data!, ...current]); setCommentCount((current) => current + 1); setCommentText(""); } finally { setCommentBusy(false); } };
  const sharePost = async () => { const title = post?.title ?? "Lekka post"; await Share.share({ message: `${title}\n\n${post?.body ?? ""}\n\nOpen in Lekka: manuslocalradarsa://post/${id}` }); };
  const copyLink = async () => { try { await Clipboard.setStringAsync(`manuslocalradarsa://post/${id}`); setOptionsOpen(false); setFeedback("Post link copied."); } catch { setActionError("Couldn't copy the post link."); } };
  const openOptions = () => { setActionError(null); setOptionsOpen(true); };
  const reportPost = async () => { if (!isAuthenticated) { setOptionsOpen(false); setAuthGateAction("report posts"); return; } setActionBusy(true); setActionError(null); try { const result = await reportContent({ postId: id, reason: "User report" }); if (result.error) { setActionError("Couldn't submit the report. Please try again."); return; } setOptionsOpen(false); setFeedback("Report submitted. Thanks for helping keep Lekka safe."); } finally { setActionBusy(false); } };
  const deletePost = async () => { if (!isAuthenticated) { setDeleteOpen(false); setAuthGateAction("delete your post"); return; } setActionBusy(true); setActionError(null); try { const result = await deleteOwnPost(id); if (result.error || !result.deleted) { setActionError(result.error?.message || "Couldn't delete this post. Please try again."); return; } setDeleteOpen(false); setOptionsOpen(false); router.back(); } finally { setActionBusy(false); } };

  if (authGateAction) return <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />;
  if (loading) return <ScreenContainer><View style={styles.center}><Text style={[styles.status, { color: colors.muted }]}>Loading post…</Text></View></ScreenContainer>;
  if (!post) return <ScreenContainer><View style={styles.center}><Text style={[styles.status, { color: colors.foreground }]}>{loadError ?? "This post is no longer available."}</Text><Pressable onPress={() => router.back()} style={styles.backAction}><Text style={[styles.link, { color: colors.primary }]}>Go back</Text></Pressable></View></ScreenContainer>;

  const author = post.profiles?.display_name || "Local neighbour";
  const isOwner = Boolean(user?.id && post.author_id && user.id === post.author_id);
  const metadata = formatPostMetadata(post.area, post.created_at);

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back to posts"><IconSymbol name="chevron.right" size={20} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Post</Text></Pressable>
    <View style={styles.authorRow}>
      <Pressable onPress={() => router.push({ pathname: "/public-profile/[id]", params: { id: post.author_id } } as never)} style={[styles.avatar, { backgroundColor: colors.primary }]}>{authorAvatarUrl ? <Image source={{ uri: authorAvatarUrl }} contentFit="cover" transition={200} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{author.slice(0, 2).toUpperCase()}</Text>}</Pressable>
      <Pressable onPress={() => router.push({ pathname: "/public-profile/[id]", params: { id: post.author_id } } as never)} style={styles.authorCopy}><Text style={[styles.author, { color: colors.foreground }]}>{author}</Text><Text style={[styles.username, { color: colors.muted }]}>{post.profiles?.username ? `@${post.profiles.username}` : "Local neighbour"}</Text></Pressable>
      <Pressable onPress={openOptions} style={styles.moreButton} accessibilityRole="button" accessibilityLabel="Post options" accessibilityHint="Opens actions for this post"><IconSymbol name="ellipsis" size={21} color={colors.muted} /></Pressable>
    </View>
    {feedback && <View style={[styles.feedback, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.feedbackText, { color: colors.muted }]}>{feedback}</Text></View>}
    {post.title && <Text style={[styles.title, { color: colors.foreground }]}>{post.title}</Text>}
    <Text style={[styles.body, { color: colors.foreground }]}>{post.body}</Text>
    {mediaUrls.map((url) => <Image key={url} source={{ uri: url }} style={styles.media} contentFit="cover" />)}
    <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="location.fill" size={17} color={colors.primary} /><Text style={[styles.metaText, { color: colors.muted }]}>{metadata}</Text></View>
    {reactionPicker && <View style={[styles.reactionPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>{REACTION_OPTIONS.map((item) => <Pressable key={item} onPress={() => applyReaction(item)} style={styles.reactionChoice} accessibilityRole="button" accessibilityLabel={`React ${item}`}><Text style={styles.reactionEmoji}>{item}</Text></Pressable>)}</View>}
    <View style={[styles.actions, { borderColor: colors.border }]}><Pressable disabled={reactionBusy} onPress={() => applyReaction(reaction ?? "👍")} onLongPress={() => { if (isAuthenticated) setReactionPicker(true); else setAuthGateAction("react to posts"); }} delayLongPress={350} style={styles.action}>{reaction ? <Text style={styles.selectedEmoji}>{reaction}</Text> : <IconSymbol name="heart.fill" size={20} color={colors.muted} />}<Text style={[styles.actionText, { color: colors.muted }]}>{reactionCount}</Text></Pressable><Pressable onPress={() => scrollRef.current?.scrollToEnd({ animated: true })} style={styles.action}><IconSymbol name="bubble.left.fill" size={20} color={colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>{commentCount}</Text></Pressable><Pressable disabled={saveBusy} onPress={save} style={styles.action}><IconSymbol name="bookmark.fill" size={20} color={saved ? colors.primary : colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>{saved ? "Saved" : "Save"}</Text></Pressable><Pressable onPress={sharePost} style={styles.action}><IconSymbol name="square.and.arrow.up" size={20} color={colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>Share</Text></Pressable></View>
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Comments</Text>
    <View style={[styles.commentComposer, { backgroundColor: colors.surface, borderColor: colors.border }]}><TextInput value={commentText} onChangeText={setCommentText} placeholder={isAuthenticated ? "Say something useful…" : "Join Lekka to comment"} placeholderTextColor={colors.muted} editable={isAuthenticated && !commentBusy} style={[styles.commentInput, { color: colors.foreground }]} /><Pressable onPress={submitComment} disabled={commentBusy || !isAuthenticated} style={[styles.send, { backgroundColor: colors.primary, opacity: commentBusy || !isAuthenticated ? 0.55 : 1 }]} accessibilityRole="button" accessibilityLabel="Submit comment"><IconSymbol name="arrow.up.right" size={17} color="#10211D" /></Pressable></View>
    {comments.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>Be the first to say something.</Text> : comments.map((comment) => <View key={comment.id} style={[styles.comment, { borderBottomColor: colors.border }]}><View style={[styles.commentAvatar, { backgroundColor: colors.primary }]}>{commentAvatarUrls[comment.id] ? <Image source={{ uri: commentAvatarUrls[comment.id] }} contentFit="cover" style={styles.commentAvatarImage} /> : <Text style={styles.commentInitials}>{(comment.profiles?.display_name ?? "LN").slice(0, 2).toUpperCase()}</Text>}</View><View style={styles.commentCopy}><Text style={[styles.commentAuthor, { color: colors.foreground }]}>{comment.profiles?.display_name ?? "Local neighbour"}</Text><Text style={[styles.commentBody, { color: colors.foreground }]}>{comment.body}</Text><Text style={[styles.commentTime, { color: colors.muted }]}>{formatPostTime(comment.created_at)}</Text></View>{user?.id === comment.author_id && <Pressable onPress={() => void deleteComment(comment.id).then((r) => { if (!r.error) { setComments((c) => c.filter((x) => x.id !== comment.id)); setCommentCount((c) => Math.max(0, c - 1)); } else setFeedback("Couldn't delete comment. Please try again."); })} style={styles.commentDelete} accessibilityRole="button" accessibilityLabel="Delete comment"><IconSymbol name="trash.fill" size={17} color={colors.muted} /></Pressable>}</View>)}
  </ScrollView>

  <Modal visible={optionsOpen} transparent animationType="slide" onRequestClose={() => !actionBusy && setOptionsOpen(false)}>
    <View style={styles.modalBackdrop}><View style={[styles.sheet, { backgroundColor: colors.surface }]}>
      <View style={styles.handle} /><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Post options</Text>
      {actionError && <Text style={[styles.sheetError, { color: colors.danger }]}>{actionError}</Text>}
      <Pressable onPress={copyLink} disabled={actionBusy} style={styles.sheetRow} accessibilityRole="button"><IconSymbol name="square.and.arrow.up" size={20} color={colors.muted} /><Text style={[styles.sheetText, { color: colors.foreground }]}>Copy link</Text></Pressable>
      <Pressable onPress={reportPost} disabled={actionBusy} style={styles.sheetRow} accessibilityRole="button"><IconSymbol name="flag.fill" size={20} color={colors.muted} /><Text style={[styles.sheetText, { color: colors.foreground }]}>{actionBusy ? "Working…" : "Report post"}</Text></Pressable>
      {isOwner && <Pressable onPress={() => { setOptionsOpen(false); setDeleteOpen(true); setActionError(null); }} disabled={actionBusy} style={styles.sheetRow} accessibilityRole="button" accessibilityLabel="Delete post"><IconSymbol name="trash.fill" size={20} color={colors.danger} /><Text style={[styles.sheetText, { color: colors.danger }]}>Delete post</Text></Pressable>}
      <Pressable onPress={() => setOptionsOpen(false)} disabled={actionBusy} style={styles.sheetRow} accessibilityRole="button"><IconSymbol name="chevron.down" size={20} color={colors.muted} /><Text style={[styles.sheetText, { color: colors.foreground }]}>Cancel</Text></Pressable>
    </View></View>
  </Modal>

  <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => !actionBusy && setDeleteOpen(false)}>
    <View style={styles.modalBackdrop}><View style={[styles.confirmCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Delete this post?</Text><Text style={[styles.confirmText, { color: colors.muted }]}>This removes the post from Lekka. This action cannot be undone.</Text>
      {actionError && <Text style={[styles.sheetError, { color: colors.danger }]}>{actionError}</Text>}
      <View style={styles.confirmActions}><Pressable onPress={() => setDeleteOpen(false)} disabled={actionBusy} style={styles.confirmButton}><Text style={[styles.sheetText, { color: colors.foreground }]}>Cancel</Text></Pressable><Pressable onPress={() => void deletePost()} disabled={actionBusy} style={[styles.confirmButton, { backgroundColor: colors.danger }]}><Text style={[styles.sheetText, { color: "#FFF" }]}>{actionBusy ? "Deleting…" : "Delete"}</Text></Pressable></View>
    </View></View>
  </Modal>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 }, back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 20, minHeight: 44 }, backIcon: { transform: [{ rotate: "180deg" }] }, backText: { fontSize: 14, fontWeight: "800" }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }, status: { fontSize: 16, fontWeight: "800", textAlign: "center", paddingHorizontal: 24 }, link: { fontWeight: "800" }, backAction: { minHeight: 44, alignItems: "center", justifyContent: "center" }, feedback: { borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 12 }, feedbackText: { fontSize: 12, lineHeight: 17 }, authorRow: { flexDirection: "row", alignItems: "center", gap: 10 }, avatar: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "hidden" }, avatarImage: { width: "100%", height: "100%" }, avatarText: { color: "#FFF", fontWeight: "900" }, authorCopy: { flex: 1 }, author: { fontSize: 15, fontWeight: "900" }, username: { fontSize: 12, marginTop: 3 }, moreButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }, title: { fontSize: 23, lineHeight: 29, fontWeight: "900", marginTop: 22 }, body: { fontSize: 16, lineHeight: 24, marginTop: 8 }, media: { width: "100%", height: 240, borderRadius: 20, marginTop: 16 }, metaCard: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 18 }, metaText: { flex: 1, fontSize: 12, lineHeight: 17 }, reactionPicker: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderWidth: 1, borderRadius: 22, paddingVertical: 8, marginTop: 10 }, reactionChoice: { paddingHorizontal: 7, paddingVertical: 4, minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }, reactionEmoji: { fontSize: 27 }, selectedEmoji: { fontSize: 21 }, actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 15, marginTop: 10 }, action: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, minHeight: 44 }, actionText: { fontSize: 12, fontWeight: "700" }, sectionTitle: { fontSize: 19, fontWeight: "900", marginTop: 25, marginBottom: 10 }, commentComposer: { borderWidth: 1, borderRadius: 16, padding: 8, flexDirection: "row", alignItems: "center" }, commentInput: { flex: 1, minHeight: 42, paddingHorizontal: 8, fontSize: 14 }, send: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" }, empty: { paddingVertical: 25, textAlign: "center", fontSize: 13 }, comment: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 13, borderBottomWidth: 1 }, commentAvatar: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", overflow: "hidden" }, commentAvatarImage: { width: "100%", height: "100%" }, commentInitials: { color: "#FFF", fontSize: 10, fontWeight: "900" }, commentCopy: { flex: 1 }, commentAuthor: { fontSize: 13, fontWeight: "900" }, commentBody: { fontSize: 13, lineHeight: 19, marginTop: 3 }, commentTime: { fontSize: 10, marginTop: 4 }, commentDelete: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }, modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" }, sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 }, handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#6B7673", alignSelf: "center", marginBottom: 16 }, sheetTitle: { fontSize: 20, fontWeight: "900", marginBottom: 12 }, sheetError: { fontSize: 13, lineHeight: 18, marginBottom: 8 }, sheetRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 }, sheetText: { fontSize: 15, fontWeight: "800" }, confirmCard: { margin: 20, borderRadius: 20, padding: 20 }, confirmText: { fontSize: 14, lineHeight: 20, marginBottom: 18 }, confirmActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 }, confirmButton: { minHeight: 48, minWidth: 96, paddingHorizontal: 18, borderRadius: 14, alignItems: "center", justifyContent: "center" }
});

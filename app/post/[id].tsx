import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AuthGate } from "@/components/auth-gate";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { createSignedMediaUrl, createComment, deleteComment, getPostDetail, getPostInteractionState, listComments, reportContent, type SocialComment, type SocialPost } from "@/lib/social-repository";
import { toggleReactionAtomic, toggleSavedPostAtomic } from "@/lib/atomic-social";

export default function PostDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, user, loading: authLoading } = useSupabaseAuth();
  const [post, setPost] = useState<SocialPost | null>(null);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactionBusy, setReactionBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authGateAction, setAuthGateAction] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || authLoading) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const postResult = await getPostDetail(id);
      if (!mounted) return;

      if (postResult.error) {
        setPost(null);
        setLoadError(postResult.error.message || "We couldn't load this post.");
        setLoading(false);
        return;
      }
      if (!postResult.data) {
        setPost(null);
        setLoadError("This post is no longer available or you don't have permission to view it.");
        setLoading(false);
        return;
      }

      setPost(postResult.data);
      const [stateResult, commentsResult] = await Promise.all([
        getPostInteractionState(id),
        listComments(id),
      ]);
      if (!mounted) return;

      if (stateResult.error) {
        Alert.alert("Couldn't load post activity", "The post is available, but reactions and saves could not be refreshed. Please try again.");
      } else if (stateResult.data) {
        setLiked(stateResult.data.liked);
        setSaved(stateResult.data.saved);
        setReactionCount(stateResult.data.reactions);
        setCommentCount(stateResult.data.comments);
      }
      if (commentsResult.error) {
        Alert.alert("Couldn't load comments", "The post is available, but comments could not be loaded. Please try again.");
      } else {
        setComments(commentsResult.data);
      }

      const paths = (postResult.data.post_media ?? []).filter((media) => media.media_type === "image").map((media) => media.storage_path);
      const urls = await Promise.all(paths.map(async (path) => (await createSignedMediaUrl(path)).data?.signedUrl ?? null));
      if (mounted) {
        setMediaUrls(urls.filter((url): url is string => Boolean(url)));
        setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, [id, authLoading]);

  const runProtected = (action: string, callback: () => Promise<void>) => {
    if (!isAuthenticated) { setAuthGateAction(action); return; }
    void callback();
  };

  const react = () => runProtected("react to posts", async () => {
    if (reactionBusy) return;
    setReactionBusy(true);
    try {
      const result = await toggleReactionAtomic(id);
      if (result.error) {
        Alert.alert("Couldn't update reaction", result.error.message || "Please try again.");
        return;
      }
      setLiked(result.liked);
      const refreshed = await getPostInteractionState(id);
      if (!refreshed.error && refreshed.data) {
        setReactionCount(refreshed.data.reactions);
        setLiked(refreshed.data.liked);
      }
    } finally {
      setReactionBusy(false);
    }
  });

  const save = () => runProtected("save posts", async () => {
    if (saveBusy) return;
    setSaveBusy(true);
    try {
      const result = await toggleSavedPostAtomic(id);
      if (result.error) {
        Alert.alert("Couldn't update saved posts", result.error.message || "Please try again.");
        return;
      }
      setSaved(result.saved);
      const refreshed = await getPostInteractionState(id);
      if (!refreshed.error && refreshed.data) setSaved(refreshed.data.saved);
    } finally {
      setSaveBusy(false);
    }
  });

  const reportPost = () => runProtected("report posts", async () => {
    const result = await reportContent({ postId: id, reason: "User report" });
    Alert.alert(result.error ? "Couldn't report" : "Report received", result.error ? "Please try again." : "Thanks. The report has been recorded for review.");
  });

  const submitComment = async () => {
    if (!isAuthenticated) { setAuthGateAction("comment on posts"); return; }
    if (busy || !commentText.trim()) return;
    setBusy(true);
    try {
      const result = await createComment(id, commentText);
      if (result.error || !result.data) {
        Alert.alert("Couldn't comment", result.error?.message || "Try again when you have a connection.");
        return;
      }
      setComments((current) => [result.data!, ...current]);
      setCommentCount((current) => current + 1);
      setCommentText("");
    } finally {
      setBusy(false);
    }
  };

  if (authGateAction) return <AuthGate action={authGateAction} onCancel={() => setAuthGateAction(null)} />;
  if (loading) return <ScreenContainer><View style={styles.center}><Text style={[styles.status, { color: colors.muted }]}>Loading post…</Text></View></ScreenContainer>;
  if (!post) return <ScreenContainer><View style={styles.center}><Text accessibilityRole="alert" style={[styles.status, { color: colors.foreground }]}>{loadError ?? "This post is no longer available."}</Text><Pressable onPress={() => router.back()}><Text style={[styles.link, { color: colors.primary }]}>Go back</Text></Pressable></View></ScreenContainer>;

  const author = post.profiles?.display_name || "Local neighbour";
  const initials = author.slice(0, 2).toUpperCase();
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content}><Pressable onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={20} color={colors.foreground} style={styles.backIcon} /><Text style={[styles.backText, { color: colors.foreground }]}>Post</Text></Pressable><View style={styles.authorRow}><Pressable onPress={() => router.push({ pathname: "/public-profile/[id]", params: { id: post.author_id } } as never)} style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>{initials}</Text></Pressable><Pressable onPress={() => router.push({ pathname: "/public-profile/[id]", params: { id: post.author_id } } as never)} style={styles.authorCopy}><Text style={[styles.author, { color: colors.foreground }]}>{author}</Text><Text style={[styles.username, { color: colors.muted }]}>{post.profiles?.username ? `@${post.profiles.username}` : "Local neighbour"}</Text></Pressable><Pressable onPress={reportPost}><IconSymbol name="ellipsis" size={21} color={colors.muted} /></Pressable></View>{post.title && <Text style={[styles.title, { color: colors.foreground }]}>{post.title}</Text>}<Text style={[styles.body, { color: colors.foreground }]}>{post.body}</Text>{mediaUrls.map((url) => <Image key={url} source={{ uri: url }} style={styles.media} resizeMode="cover" />)}<View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="location.fill" size={17} color={colors.primary} /><Text style={[styles.metaText, { color: colors.muted }]}>{post.area} area · approximate location · {new Date(post.created_at).toLocaleString()}</Text></View><View style={[styles.actions, { borderColor: colors.border }]}><Pressable disabled={reactionBusy} onPress={react} style={[styles.action, { opacity: reactionBusy ? 0.5 : 1 }]}><IconSymbol name="heart.fill" size={20} color={liked ? colors.error : colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>{reactionCount}</Text></Pressable><Pressable onPress={() => runProtected("comment on posts", async () => undefined)} style={styles.action}><IconSymbol name="bubble.left.fill" size={20} color={colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>{commentCount}</Text></Pressable><Pressable disabled={saveBusy} onPress={save} style={[styles.action, { opacity: saveBusy ? 0.5 : 1 }]}><IconSymbol name="bookmark.fill" size={20} color={saved ? colors.primary : colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>{saved ? "Saved" : "Save"}</Text></Pressable><Pressable onPress={() => Share.share({ message: `${post.title ?? "Lekka post"}\n\n${post.body}` })} style={styles.action}><IconSymbol name="square.and.arrow.up" size={20} color={colors.muted} /></Pressable></View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Comments</Text><View style={[styles.commentComposer, { backgroundColor: colors.surface, borderColor: colors.border }]}><TextInput value={commentText} onChangeText={setCommentText} placeholder={isAuthenticated ? "Say something useful…" : "Join Lekka to comment"} placeholderTextColor={colors.muted} editable={isAuthenticated && !busy} style={[styles.commentInput, { color: colors.foreground }]} /><Pressable onPress={submitComment} disabled={busy || !isAuthenticated} style={[styles.send, { backgroundColor: colors.primary, opacity: busy || !isAuthenticated ? 0.55 : 1 }]}><IconSymbol name="arrow.up.right" size={17} color="#10211D" /></Pressable></View>{comments.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>Be the first to say something.</Text> : comments.map((comment) => <View key={comment.id} style={[styles.comment, { borderBottomColor: colors.border }]}><View style={[styles.commentAvatar, { backgroundColor: colors.primary }]}><Text style={styles.commentInitials}>{(comment.profiles?.display_name ?? "LN").slice(0, 2).toUpperCase()}</Text></View><View style={styles.commentCopy}><Text style={[styles.commentAuthor, { color: colors.foreground }]}>{comment.profiles?.display_name ?? "Local neighbour"}</Text><Text style={[styles.commentBody, { color: colors.foreground }]}>{comment.body}</Text><Text style={[styles.commentTime, { color: colors.muted }]}>{new Date(comment.created_at).toLocaleString()}</Text></View>{user?.id === comment.author_id && <Pressable onPress={() => { void deleteComment(comment.id).then((result) => { if (!result.error) { setComments((current) => current.filter((item) => item.id !== comment.id)); setCommentCount((current) => Math.max(0, current - 1)); } else Alert.alert("Couldn't delete comment", result.error.message || "Please try again."); }); }}><IconSymbol name="trash.fill" size={17} color={colors.muted} /></Pressable>}</View>)}</ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 42 }, back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 20 }, backIcon: { transform: [{ rotate: "180deg" }] }, backText: { fontSize: 14, fontWeight: "800" }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }, status: { fontSize: 16, fontWeight: "800", textAlign: "center", paddingHorizontal: 24 }, link: { fontWeight: "800" }, authorRow: { flexDirection: "row", alignItems: "center", gap: 10 }, avatar: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" }, avatarText: { color: "#FFF", fontWeight: "900" }, authorCopy: { flex: 1 }, author: { fontSize: 15, fontWeight: "900" }, username: { fontSize: 12, marginTop: 3 }, title: { fontSize: 23, lineHeight: 29, fontWeight: "900", marginTop: 22 }, body: { fontSize: 16, lineHeight: 24, marginTop: 8 }, media: { width: "100%", height: 240, borderRadius: 20, marginTop: 16, backgroundColor: "#E5E7EB" }, metaCard: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 18 }, metaText: { flex: 1, fontSize: 12, lineHeight: 17 }, actions: { flexDirection: "row", alignItems: "center", gap: 23, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 15, marginTop: 16 }, action: { flexDirection: "row", alignItems: "center", gap: 6 }, actionText: { fontSize: 12, fontWeight: "700" }, sectionTitle: { fontSize: 19, fontWeight: "900", marginTop: 25, marginBottom: 10 }, commentComposer: { borderWidth: 1, borderRadius: 16, padding: 8, flexDirection: "row", alignItems: "center" }, commentInput: { flex: 1, minHeight: 42, paddingHorizontal: 8, fontSize: 14 }, send: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, empty: { paddingVertical: 25, textAlign: "center", fontSize: 13 }, comment: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 13, borderBottomWidth: 1 }, commentAvatar: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" }, commentInitials: { color: "#FFF", fontSize: 10, fontWeight: "900" }, commentCopy: { flex: 1 }, commentAuthor: { fontSize: 13, fontWeight: "900" }, commentBody: { fontSize: 13, lineHeight: 19, marginTop: 3 }, commentTime: { fontSize: 10, marginTop: 4 },
});

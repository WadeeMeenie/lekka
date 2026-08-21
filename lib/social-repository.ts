import { supabase } from "@/lib/supabase";

export type SocialProfile = {
  id: string;
  display_name: string;
  username: string | null;
  bio: string | null;
  profile_image_path: string | null;
  interests: string[];
  home_area: string;
};

export type SocialPost = {
  id: string;
  author_id: string;
  kind: string;
  category: string | null;
  title: string | null;
  body: string;
  area: string;
  visibility: string;
  trust_score: number;
  created_at: string;
  approximate_location: unknown;
  profiles: SocialProfile | null;
  post_media: Array<{ id: string; storage_path: string; media_type: "image" | "video"; thumbnail_path: string | null; width: number | null; height: number | null; sort_order: number }>;
};

export type SocialComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: Pick<SocialProfile, "id" | "display_name" | "username" | "profile_image_path"> | null;
};

function unavailable<T>(value: T) {
  return { data: value, error: new Error("Backend is not configured") };
}

export async function getPostDetail(postId: string) {
  if (!supabase) return unavailable<SocialPost | null>(null);
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, kind, category, title, body, area, visibility, trust_score, created_at, approximate_location, profiles(id, display_name, username, bio, profile_image_path, interests, home_area), post_media(id, storage_path, media_type, thumbnail_path, width, height, sort_order)")
    .eq("id", postId)
    .maybeSingle();
  return { data: data as SocialPost | null, error };
}

export async function getPostInteractionState(postId: string) {
  if (!supabase) return unavailable({ liked: false, saved: false, reactions: 0, comments: 0 });
  const { data: { user } } = await supabase.auth.getUser();
  const [reactions, comments, mineReaction, mineSave] = await Promise.all([
    supabase.from("reactions").select("post_id", { count: "exact", head: true }).eq("post_id", postId),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", postId),
    user ? supabase.from("reactions").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    user ? supabase.from("saved_posts").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const error = reactions.error || comments.error || mineReaction.error || mineSave.error || null;
  return { data: { liked: Boolean(mineReaction.data), saved: Boolean(mineSave.data), reactions: reactions.count ?? 0, comments: comments.count ?? 0 }, error };
}

export async function listComments(postId: string, page = 0, pageSize = 20) {
  if (!supabase) return unavailable<SocialComment[]>([]);
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from("comments")
    .select("id, post_id, author_id, body, created_at, profiles(id, display_name, username, profile_image_path)")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .range(from, to);
  return { data: (data ?? []) as unknown as SocialComment[], error };
}

export async function createComment(postId: string, body: string) {
  if (!supabase) return unavailable<SocialComment | null>(null);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unavailable<SocialComment | null>(null);
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: user.id, body: body.trim() })
    .select("id, post_id, author_id, body, created_at, profiles(id, display_name, username, profile_image_path)")
    .single();
  return { data: data as SocialComment | null, error };
}

export async function deleteComment(commentId: string) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };
  return supabase.from("comments").delete().eq("id", commentId).eq("author_id", user.id);
}

export async function toggleReaction(postId: string) {
  if (!supabase) return { liked: false, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { liked: false, error: new Error("Please sign in") };
  const existing = await supabase.from("reactions").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
  if (existing.error) return { liked: false, error: existing.error };
  if (existing.data) {
    const result = await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", user.id);
    return { liked: false, error: result.error };
  }
  const result = await supabase.from("reactions").insert({ post_id: postId, user_id: user.id, reaction: "like" });
  return { liked: true, error: result.error };
}

export async function toggleSavedPost(postId: string) {
  if (!supabase) return { saved: false, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { saved: false, error: new Error("Please sign in") };
  const existing = await supabase.from("saved_posts").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
  if (existing.error) return { saved: false, error: existing.error };
  if (existing.data) {
    const result = await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
    return { saved: false, error: result.error };
  }
  const result = await supabase.from("saved_posts").insert({ post_id: postId, user_id: user.id });
  return { saved: true, error: result.error };
}

export async function listSavedPosts(page = 0, pageSize = 20) {
  if (!supabase) return unavailable<SocialPost[]>([]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: new Error("Please sign in") };
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from("saved_posts")
    .select("post_id, posts(id, author_id, kind, category, title, body, area, visibility, trust_score, created_at, approximate_location, profiles(id, display_name, username, bio, profile_image_path, interests, home_area), post_media(id, storage_path, media_type, thumbnail_path, width, height, sort_order))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);
  return { data: (data ?? []).map((row: any) => row.posts).filter(Boolean) as SocialPost[], error };
}

export async function getPublicProfile(profileId: string) {
  if (!supabase) return unavailable<SocialProfile | null>(null);
  const { data, error } = await supabase.from("profiles").select("id, display_name, username, bio, profile_image_path, interests, home_area").eq("id", profileId).maybeSingle();
  return { data: data as SocialProfile | null, error };
}

export async function getFollowState(profileId: string) {
  if (!supabase) return unavailable({ following: false, followers: 0, followingCount: 0 });
  const { data: { user } } = await supabase.auth.getUser();
  const [mine, followers, followingCount] = await Promise.all([
    user ? supabase.from("follows").select("following_id").eq("follower_id", user.id).eq("following_id", profileId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profileId),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profileId),
  ]);
  return { data: { following: Boolean(mine.data), followers: followers.count ?? 0, followingCount: followingCount.count ?? 0 }, error: mine.error || followers.error || followingCount.error || null };
}

export async function toggleFollow(profileId: string) {
  if (!supabase) return { following: false, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { following: false, error: new Error("Please sign in") };
  if (user.id === profileId) return { following: false, error: new Error("You cannot follow yourself") };
  const existing = await supabase.from("follows").select("following_id").eq("follower_id", user.id).eq("following_id", profileId).maybeSingle();
  if (existing.error) return { following: false, error: existing.error };
  if (existing.data) {
    const result = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profileId);
    return { following: false, error: result.error };
  }
  const result = await supabase.from("follows").insert({ follower_id: user.id, following_id: profileId });
  return { following: true, error: result.error };
}

export async function listNotifications(page = 0, pageSize = 30) {
  if (!supabase) return unavailable<any[]>([]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: new Error("Please sign in") };
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase.from("notifications").select("id, actor_id, kind, title, body, target_type, target_id, read_at, created_at, profiles:actor_id(id, display_name, username, profile_image_path)").eq("user_id", user.id).order("created_at", { ascending: false }).range(from, to);
  return { data: data ?? [], error };
}

export async function markNotificationRead(notificationId: string) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };
  return supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId).eq("user_id", user.id);
}

export function subscribeToSocialChanges(onChange: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase.channel("lekka-social-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, onChange)
    .subscribe();
  return () => { void supabase?.removeChannel(channel); };
}

export async function createSignedMediaUrl(path: string) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  return supabase.storage.from("local-radar-media").createSignedUrl(path, 60 * 60);
}


export async function getUnreadNotificationCount() {
  if (!supabase) return { data: 0, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: 0, error: new Error("Please sign in") };
  const result = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
  return { data: result.count ?? 0, error: result.error };
}

export async function reportContent(input: { postId?: string; commentId?: string; profileId?: string; reason: string }) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };
  return supabase.from("reports").insert({ reporter_id: user.id, post_id: input.postId ?? null, comment_id: input.commentId ?? null, profile_id: input.profileId ?? null, reason: input.reason });
}

export async function toggleBlock(profileId: string) {
  if (!supabase) return { blocked: false, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { blocked: false, error: new Error("Please sign in") };
  if (user.id === profileId) return { blocked: false, error: new Error("You cannot block yourself") };
  const existing = await supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id).eq("blocked_id", profileId).maybeSingle();
  if (existing.error) return { blocked: false, error: existing.error };
  if (existing.data) {
    const result = await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", profileId);
    return { blocked: false, error: result.error };
  }
  const result = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: profileId });
  return { blocked: true, error: result.error };
}

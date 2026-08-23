import { supabase } from "@/lib/supabase";
import type { SocialComment, SocialPost } from "@/lib/social-repository";

const POST_SELECT = "id, author_id, kind, category, title, body, area, visibility, trust_score, created_at, approximate_location, profiles!posts_author_id_fkey(id, display_name, username, bio, profile_image_path, interests, home_area), post_media(id, storage_path, media_type, thumbnail_path, width, height, sort_order)";
const COMMENT_SELECT = "id, post_id, author_id, body, created_at, profiles!comments_author_id_fkey(id, display_name, username, profile_image_path)";

function backendError() { return new Error("Backend is not configured"); }

export async function getPostDetailSafe(postId: string) {
  if (!supabase) return { data: null as SocialPost | null, error: backendError() };
  const { data, error } = await supabase.from("posts").select(POST_SELECT).eq("id", postId).maybeSingle();
  return { data: data as unknown as SocialPost | null, error };
}

export async function listCommentsSafe(postId: string, page = 0, pageSize = 20) {
  if (!supabase) return { data: [] as SocialComment[], error: backendError() };
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase.from("comments").select(COMMENT_SELECT).eq("post_id", postId).order("created_at", { ascending: false }).range(from, to);
  return { data: (data ?? []) as unknown as SocialComment[], error };
}

export async function createCommentSafe(postId: string, body: string) {
  if (!supabase) return { data: null as SocialComment | null, error: backendError() };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null as SocialComment | null, error: new Error("Please sign in") };
  const { data, error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, body: body.trim() }).select(COMMENT_SELECT).single();
  return { data: data as unknown as SocialComment | null, error };
}

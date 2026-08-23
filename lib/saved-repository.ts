import { supabase } from "@/lib/supabase";
import type { SocialPost } from "@/lib/social-repository";

export async function listSavedPostsSafe(page = 0, pageSize = 20) {
  if (!supabase) return { data: [] as SocialPost[], error: new Error("Backend is not configured") };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { data: [] as SocialPost[], error: new Error("Please sign in") };

  const from = page * pageSize;
  const to = from + pageSize - 1;
  const saved = await supabase
    .from("saved_posts")
    .select("post_id, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (saved.error) return { data: [], error: saved.error };
  const ids = (saved.data ?? []).map((row) => row.post_id);
  if (ids.length === 0) return { data: [], error: null };

  const posts = await supabase
    .from("posts")
    .select("id, author_id, kind, category, title, body, area, visibility, trust_score, created_at, approximate_location, profiles!posts_author_id_fkey(id, display_name, username, bio, profile_image_path, interests, home_area), post_media(id, storage_path, media_type, thumbnail_path, width, height, sort_order)")
    .in("id", ids);
  if (posts.error) return { data: [], error: posts.error };

  const byId = new Map((posts.data ?? []).map((post: any) => [post.id, post]));
  return { data: ids.map((id) => byId.get(id)).filter(Boolean) as SocialPost[], error: null };
}

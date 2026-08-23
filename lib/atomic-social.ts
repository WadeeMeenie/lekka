import { supabase } from "@/lib/supabase";

export async function toggleReactionAtomic(postId: string) {
  if (!supabase) return { liked: false, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { liked: false, error: new Error("Please sign in") };

  const { data, error } = await supabase.rpc("toggle_reaction", { p_post_id: postId });
  return { liked: Boolean(data), error };
}

export async function toggleSavedPostAtomic(postId: string) {
  if (!supabase) return { saved: false, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { saved: false, error: new Error("Please sign in") };

  const { data, error } = await supabase.rpc("toggle_saved_post", { p_post_id: postId });
  return { saved: Boolean(data), error };
}

export async function toggleFollowAtomic(profileId: string) {
  if (!supabase) return { following: false, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { following: false, error: new Error("Please sign in") };

  const { data, error } = await supabase.rpc("toggle_follow", { p_profile_id: profileId });
  return { following: Boolean(data), error };
}

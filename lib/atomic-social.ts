import { supabase } from "@/lib/supabase";

export const REACTION_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"] as const;
export type ReactionType = typeof REACTION_OPTIONS[number];

export async function toggleReactionAtomic(postId: string, reaction: ReactionType = "👍") {
  if (!supabase) return { liked: false, reaction: null as ReactionType | null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { liked: false, reaction: null as ReactionType | null, error: new Error("Please sign in") };
  const { data, error } = await supabase.rpc("toggle_reaction", { p_post_id: postId, p_reaction: reaction });
  const value = typeof data === "string" && data ? data as ReactionType : null;
  return { liked: Boolean(value), reaction: value, error };
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

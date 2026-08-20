import { supabase } from "@/lib/supabase";

export async function listBusinesses(filters?: { category?: string; verified?: boolean }) {
  if (!supabase) return { data: [], error: new Error("Backend is not configured") };
  let query = supabase.from("businesses").select("id, name, category, description, area, address, phone, whatsapp, website, opening_hours, verification_state, approximate_location").order("name").limit(100);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.verified) query = query.eq("verification_state", "verified");
  return query;
}

export async function listCommunities(area?: string) {
  if (!supabase) return { data: [], error: new Error("Backend is not configured") };
  let query = supabase.from("communities").select("id, name, description, image_path, area, category, visibility, rules, created_at").eq("visibility", "public").order("created_at", { ascending: false }).limit(100);
  if (area) query = query.eq("area", area);
  return query;
}

export async function followUser(followingId: string) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };
  return supabase.from("follows").insert({ follower_id: user.id, following_id: followingId });
}

export async function unfollowUser(followingId: string) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };
  return supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", followingId);
}

import { supabase } from "@/lib/supabase";

export async function listBusinesses(filters?: { category?: string; verified?: boolean }) {
  if (!supabase) return { data: [], error: new Error("Backend is not configured") };
  let query = supabase.from("businesses").select("id, name, category, description, area, address, phone, whatsapp, website, opening_hours, verification_state, approximate_location").order("name").limit(100);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.verified) query = query.eq("verification_state", "verified");
  return query;
}

export type LocalDirectoryItem = { id: string; name: string; category: string; description: string; area: string; kind: "business" | "event" | "deal" | "post"; verified?: boolean };

export async function getBusiness(id: string) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  return supabase.from("businesses").select("id, name, category, description, area, address, phone, whatsapp, website, opening_hours, verification_state").eq("id", id).maybeSingle();
}

export async function getCommunity(id: string) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  return supabase.from("communities").select("id, name, description, image_path, area, category, visibility, rules, created_at").eq("id", id).eq("visibility", "public").maybeSingle();
}

export async function getCommunityMembershipState(communityId: string) {
  if (!supabase) return { data: { memberCount: 0, isMember: false }, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  const [countResult, mineResult] = await Promise.all([
    supabase.from("community_members").select("community_id", { count: "exact", head: true }).eq("community_id", communityId),
    user ? supabase.from("community_members").select("community_id").eq("community_id", communityId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  return { data: { memberCount: countResult.count ?? 0, isMember: Boolean(mineResult.data) }, error: countResult.error || mineResult.error || null };
}

export async function joinCommunity(communityId: string) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };
  return supabase.from("community_members").upsert({ community_id: communityId, user_id: user.id }, { onConflict: "community_id,user_id", ignoreDuplicates: true });
}

export async function leaveCommunity(communityId: string) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };
  return supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", user.id);
}

export async function listLocalDirectory(category: string) {
  if (!supabase) return { data: [] as LocalDirectoryItem[], error: new Error("Backend is not configured") };
  if (category === "Businesses") {
    const result = await listBusinesses();
    return { data: (result.data ?? []).map((item: any) => ({ id: item.id, name: item.name, category: item.category, description: item.description ?? "", area: item.area, kind: "business" as const, verified: item.verification_state === "verified" })), error: result.error };
  }
  if (category === "Events") {
    const result = await supabase.from("events").select("id, title, description, category, area").order("start_time", { ascending: true }).limit(100);
    return { data: (result.data ?? []).map((item: any) => ({ id: item.id, name: item.title, category: item.category ?? "Event", description: item.description ?? "", area: item.area, kind: "event" as const })), error: result.error };
  }
  if (category === "Deals") {
    const result = await supabase.from("deals").select("id, title, description, area").order("created_at", { ascending: false }).limit(100);
    return { data: (result.data ?? []).map((item: any) => ({ id: item.id, name: item.title, category: "Deal", description: item.description ?? "", area: item.area, kind: "deal" as const })), error: result.error };
  }
  const postCategory = category === "Marketplace" ? "marketplace" : category === "Jobs" ? "job" : "service";
  const result = await supabase.from("posts").select("id, title, body, category, area").eq("category", postCategory).order("created_at", { ascending: false }).limit(100);
  return { data: (result.data ?? []).map((item: any) => ({ id: item.id, name: item.title ?? category, category, description: item.body ?? "", area: item.area, kind: "post" as const })), error: result.error };
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

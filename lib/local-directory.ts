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
  return supabase.from("communities").select("id, name, description, image_path, area, category, visibility, rules, created_by, created_at").eq("id", id).maybeSingle();
}

export async function getCommunityMembershipState(communityId: string) {
  if (!supabase) return { data: { memberCount: 0, isMember: false }, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  const [countResult, mineResult] = await Promise.all([
    supabase.from("community_members").select("community_id", { count: "exact", head: true }).eq("community_id", communityId),
    user ? supabase.from("community_members").select("community_id, is_moderator").eq("community_id", communityId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  return { data: { memberCount: countResult.count ?? 0, isMember: Boolean(mineResult.data), isModerator: Boolean(mineResult.data?.is_moderator) }, error: countResult.error || mineResult.error || null };
}

export type CommunityPost = { id: string; author_id: string; title: string | null; body: string; area: string; created_at: string; profiles: { id: string; display_name: string; username: string | null } | null };

export async function listCommunityPosts(communityId: string) {
  if (!supabase) return { data: [] as CommunityPost[], error: new Error("Backend is not configured") };
  const result = await supabase.from("posts").select("id, author_id, title, body, area, created_at, profiles(id, display_name, username)").eq("community_id", communityId).order("created_at", { ascending: false }).limit(50);
  return { data: (result.data ?? []) as unknown as CommunityPost[], error: result.error };
}

export async function removeCommunityPost(communityId: string, postId: string) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };
  const result = await supabase.from("posts").delete().eq("id", postId).eq("community_id", communityId);
  return { error: result.error };
}

export async function getCommunitySettings(communityId: string) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Please sign in") };
  return supabase.from("communities").select("id, name, description, area, category, visibility, rules, created_by, created_at").eq("id", communityId).eq("created_by", user.id).maybeSingle();
}

export async function updateCommunitySettings(communityId: string, input: { name: string; description: string; visibility: "public" | "private"; rules: string[] }) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };
  const name = input.name.trim();
  const description = input.description.trim();
  const rules = input.rules.map((rule) => rule.trim()).filter(Boolean).slice(0, 12);
  if (name.length < 3 || name.length > 80) return { error: new Error("Community name must be between 3 and 80 characters") };
  if (description.length > 500) return { error: new Error("Description must be 500 characters or fewer") };
  if (rules.some((rule) => rule.length > 200)) return { error: new Error("Each guideline must be 200 characters or fewer") };
  const result = await supabase.from("communities").update({ name, description, visibility: input.visibility, rules }).eq("id", communityId).eq("created_by", user.id);
  return { error: result.error };
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

export type CommunityMember = { user_id: string; is_moderator: boolean; joined_at: string; profiles: { id: string; display_name: string; username: string | null; profile_image_path: string | null } | null };

export async function listCommunityMembers(communityId: string) {
  if (!supabase) return { data: [] as CommunityMember[], error: new Error("Backend is not configured") };
  const result = await supabase.from("community_members").select("user_id, is_moderator, joined_at, profiles(id, display_name, username, profile_image_path)").eq("community_id", communityId).order("joined_at", { ascending: true }).limit(100);
  return { data: (result.data ?? []) as unknown as CommunityMember[], error: result.error };
}

export async function updateCommunityMemberRole(communityId: string, userId: string, isModerator: boolean) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };
  const owner = await supabase.from("communities").select("id").eq("id", communityId).eq("created_by", user.id).maybeSingle();
  if (owner.error) return { error: owner.error };
  if (!owner.data) return { error: new Error("Only the community owner can manage moderators") };
  return supabase.from("community_members").update({ is_moderator: isModerator }).eq("community_id", communityId).eq("user_id", userId);
}

export async function removeCommunityMember(communityId: string, userId: string) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };
  const owner = await supabase.from("communities").select("id").eq("id", communityId).eq("created_by", user.id).maybeSingle();
  if (owner.error) return { error: owner.error };
  if (!owner.data) return { error: new Error("Only the community owner can remove members") };
  return supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", userId);
}

export function subscribeToCommunityMembers(communityId: string, onChange: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase.channel(`community-members-${communityId}`).on("postgres_changes", { event: "*", schema: "public", table: "community_members", filter: `community_id=eq.${communityId}` }, onChange).subscribe();
  return () => { void supabase?.removeChannel(channel); };
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
  let query = supabase.from("communities").select("id, name, description, image_path, area, category, visibility, rules, created_by, created_at").eq("visibility", "public").order("created_at", { ascending: false }).limit(100);
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

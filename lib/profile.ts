import { supabase } from "@/lib/supabase";

export type ProfileInput = { displayName: string; username: string; bio: string; homeArea: string; preferredRadiusM: number };

export async function loadMyProfile() {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Please sign in") };
  return supabase.from("profiles").select("id, display_name, username, bio, home_area, preferred_radius_m, interests, location_visibility, profile_image_path").eq("id", user.id).maybeSingle();
}

export async function saveMyProfile(input: ProfileInput) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Please sign in") };
  return supabase.from("profiles").upsert({ id: user.id, display_name: input.displayName, username: input.username || null, bio: input.bio, home_area: input.homeArea, preferred_radius_m: input.preferredRadiusM, updated_at: new Date().toISOString() }).select().single();
}

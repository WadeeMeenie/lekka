import { supabase } from "@/lib/supabase";
import { uploadMedia } from "@/lib/supabase-repository";
import { createProfileAvatarPath } from "@/lib/profile-avatar";

export type ProfileInput = {
  displayName: string;
  username: string;
  bio: string;
  homeArea: string;
  preferredRadiusM: number;
  interests?: string[];
  locationVisibility?: "hidden" | "area";
};

export async function loadMyProfile() {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Please sign in") };
  return supabase
    .from("profiles")
    .select("id, display_name, username, bio, home_area, preferred_radius_m, interests, location_visibility, profile_image_path")
    .eq("id", user.id)
    .maybeSingle();
}

export async function saveMyProfile(input: ProfileInput) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Please sign in") };
  return supabase
    .from("profiles")
    .upsert({
      id: user.id,
      display_name: input.displayName,
      username: input.username || null,
      bio: input.bio,
      home_area: input.homeArea,
      preferred_radius_m: input.preferredRadiusM,
      interests: input.interests ?? [],
      location_visibility: input.locationVisibility ?? "area",
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
}

export async function saveMyProfileAvatar(uri: string, contentType = "image/jpeg") {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Please sign in") };
  // Use a new key for every avatar update. The shared media uploader intentionally
  // does not overwrite objects, and a unique key also avoids stale image caches.
  const path = createProfileAvatarPath(user.id);
  const upload = await uploadMedia(uri, path, contentType);
  if (upload.error) return { data: null, error: upload.error };
  const update = await supabase
    .from("profiles")
    .update({ profile_image_path: path, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  return { data: path, error: update.error };
}

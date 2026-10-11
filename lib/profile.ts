import { supabase } from "@/lib/supabase";
import { uploadMedia } from "@/lib/supabase-repository";
import { createProfileAvatarPath } from "@/lib/profile-avatar";

export type FriendsListVisibility = "only_me" | "friends" | "everyone";

export type ProfileInput = {
  displayName: string;
  username: string;
  bio: string;
  homeArea: string;
  preferredRadiusM: number;
  interests?: string[];
  locationVisibility?: "hidden" | "area";
  isPrivate?: boolean;
  friendsListVisibility?: FriendsListVisibility;
};

export async function loadMyProfile() {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data, error } = await supabase.rpc("get_my_profile");
  return { data: data?.[0] ?? null, error };
}

export async function saveMyProfile(input: ProfileInput) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data, error } = await supabase.rpc("update_my_profile", {
    p_display_name: input.displayName,
    p_username: input.username || null,
    p_bio: input.bio,
    p_home_area: input.homeArea,
    p_preferred_radius_m: input.preferredRadiusM,
    p_interests: input.interests ?? [],
    p_location_visibility: input.locationVisibility ?? "area",
    p_is_private: input.isPrivate ?? false,
    p_friends_list_visibility: input.friendsListVisibility ?? "friends",
  });
  return { data: data?.[0] ?? null, error };
}

export async function saveMyProfileAvatar(uri: string, contentType = "image/jpeg") {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Please sign in") };
  const path = createProfileAvatarPath(user.id);
  const upload = await uploadMedia(uri, path, contentType);
  if (upload.error) return { data: null, error: upload.error };
  const update = await supabase
    .from("profiles")
    .update({ profile_image_path: path, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  return { data: path, error: update.error };
}

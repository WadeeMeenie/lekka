import { supabase } from '@/lib/supabase';

export type FriendsListVisibility = 'only_me' | 'friends' | 'everyone';

export type ViewerProfile = {
  id: string;
  display_name: string;
  profile_image_path: string | null;
  bio: string | null;
  is_private: boolean;
  friends_list_visibility: FriendsListVisibility;
  can_view_full: boolean;
  mutual_friend_count: number;
};

export async function getProfileForViewer(ownerId: string) {
  const client = supabase;
  if (!client) return { data: null as ViewerProfile | null, error: new Error('Supabase is not configured') };
  const { data, error } = await client.rpc('get_profile_for_viewer', { owner_id: ownerId });
  return { data: (data?.[0] ?? null) as ViewerProfile | null, error };
}

export async function updateProfilePrivacy(isPrivate: boolean, friendsListVisibility: FriendsListVisibility) {
  const client = supabase;
  if (!client) return { error: new Error('Supabase is not configured') };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };
  return client.from('profiles').update({ is_private: isPrivate, friends_list_visibility: friendsListVisibility }).eq('id', user.id);
}

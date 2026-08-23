import { supabase } from '@/lib/supabase';

export async function deleteOwnPost(postId: string) {
  if (!supabase) return { deleted: false, error: new Error('Backend is not configured') };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { deleted: false, error: new Error('Please sign in') };

  const { data, error } = await supabase.rpc('delete_own_post', {
    target_post_id: postId,
  });

  return {
    deleted: data === true,
    error,
  };
}

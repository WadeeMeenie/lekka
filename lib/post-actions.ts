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

export async function reportPost(postId: string, reason: string) {
  if (!supabase) return { reported: false, error: new Error('Backend is not configured') };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { reported: false, error: new Error('Please sign in') };

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    post_id: postId,
    reason,
  });

  return {
    reported: !error,
    error,
  };
}

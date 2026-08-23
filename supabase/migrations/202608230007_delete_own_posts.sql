-- Lekka: secure post deletion
-- Users can only delete posts they authored. RLS is the final authority.

DROP POLICY IF EXISTS posts_author_delete ON public.posts;
CREATE POLICY posts_author_delete
ON public.posts
FOR DELETE
TO authenticated
USING (author_id = (SELECT auth.uid()));

-- Helpful RPC for the client. It cannot delete another user's post because
-- the DELETE policy above still applies to the underlying DELETE.
CREATE OR REPLACE FUNCTION public.delete_own_post(target_post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.posts
  WHERE id = target_post_id
    AND author_id = (SELECT auth.uid());

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_post(uuid) TO authenticated;

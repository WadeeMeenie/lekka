-- Give the like button a uniquely named RPC: toggle_reaction has overloaded
-- signatures with defaults, which can be ambiguous through PostgREST.
CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in' USING errcode = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = p_post_id
      AND (p.visibility = 'public' OR p.author_id = v_user_id OR p.visibility = 'nearby')
  ) THEN
    RAISE EXCEPTION 'Post is not available';
  END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':reaction:' || p_post_id::text, 0)
  );
  SELECT EXISTS (
    SELECT 1 FROM public.reactions
    WHERE post_id = p_post_id AND user_id = v_user_id
  ) INTO v_exists;
  IF v_exists THEN
    DELETE FROM public.reactions
    WHERE post_id = p_post_id AND user_id = v_user_id;
    RETURN false;
  END IF;
  INSERT INTO public.reactions(post_id, user_id, reaction)
  VALUES (p_post_id, v_user_id, 'like')
  ON CONFLICT (post_id, user_id) DO NOTHING;
  RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.toggle_post_like(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_post_like(uuid) TO authenticated;

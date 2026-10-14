-- Use a unique RPC name: toggle_reaction is overloaded in the live schema,
-- which can make PostgREST resolution fail when the client sends p_reaction.
CREATE OR REPLACE FUNCTION public.toggle_post_reaction(p_post_id uuid, p_reaction text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in' USING errcode = '42501';
  END IF;

  IF p_reaction IS NULL OR p_reaction NOT IN ('👍','❤️','😂','😮','😢','😡') THEN
    RAISE EXCEPTION 'Unsupported reaction';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = p_post_id
      AND (
        p.author_id = v_user_id
        OR (p.visibility::text = 'public' AND NOT is_blocked_between(v_user_id, p.author_id))
        OR p.visibility::text = 'nearby'
      )
  ) THEN
    RAISE EXCEPTION 'Post is not available';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':reaction:' || p_post_id::text, 0)
  );

  SELECT reaction INTO v_existing
  FROM public.reactions
  WHERE post_id = p_post_id AND user_id = v_user_id;

  IF v_existing = p_reaction THEN
    DELETE FROM public.reactions
    WHERE post_id = p_post_id AND user_id = v_user_id;
    RETURN NULL;
  END IF;

  INSERT INTO public.reactions(post_id, user_id, reaction)
  VALUES (p_post_id, v_user_id, p_reaction)
  ON CONFLICT (post_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction;

  RETURN p_reaction;
END;
$function$;

REVOKE ALL ON FUNCTION public.toggle_post_reaction(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_post_reaction(uuid, text) TO authenticated;

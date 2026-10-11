-- Serialize block/unblock toggles so concurrent taps and retries cannot race.
CREATE OR REPLACE FUNCTION public.toggle_block(p_profile_id uuid)
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
  IF v_user_id = p_profile_id THEN
    RAISE EXCEPTION 'You cannot block yourself';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
    RAISE EXCEPTION 'Profile is not available';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':block:' || p_profile_id::text, 0)
  );
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE blocker_id = v_user_id AND blocked_id = p_profile_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.blocks
    WHERE blocker_id = v_user_id AND blocked_id = p_profile_id;
    RETURN false;
  END IF;

  INSERT INTO public.blocks(blocker_id, blocked_id)
  VALUES (v_user_id, p_profile_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.toggle_block(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_block(uuid) TO authenticated;

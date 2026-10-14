DO $$
BEGIN
  IF NOT has_column_privilege('authenticated', 'public.profiles', 'id', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'public.profiles', 'display_name', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'public.profiles', 'username', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'public.profiles', 'profile_image_path', 'SELECT') THEN
    RAISE EXCEPTION 'Authenticated role is missing a required public profile column';
  END IF;

  IF has_column_privilege('authenticated', 'public.profiles', 'role', 'SELECT')
     OR has_column_privilege('authenticated', 'public.profiles', 'approximate_location', 'SELECT')
     OR has_column_privilege('authenticated', 'public.profiles', 'bio', 'SELECT')
     OR has_column_privilege('anon', 'public.profiles', 'display_name', 'SELECT') THEN
    RAISE EXCEPTION 'A private profile column or anonymous profile read remains granted';
  END IF;

  IF has_column_privilege('authenticated', 'public.profiles', 'is_private', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'friends_list_visibility', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'id', 'INSERT')
     OR NOT has_function_privilege('authenticated', 'public.update_my_profile_privacy(boolean,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.update_my_profile_privacy(boolean,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Profile write privileges are not least-privilege';
  END IF;
END;
$$;

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

DO $$
DECLARE
  visible_profiles integer;
BEGIN
  SELECT count(id) INTO visible_profiles FROM public.profiles;
  IF visible_profiles <> 2 THEN
    RAISE EXCEPTION 'Expected owner plus public profile only; saw % rows', visible_profiles;
  END IF;
END;
$$;

SELECT public.update_my_profile_privacy(true, 'friends');

RESET ROLE;

DO $
BEGIN
  IF NOT (SELECT p.is_private FROM public.profiles p
          WHERE p.id = '11111111-1111-4111-8111-111111111111') THEN
    RAISE EXCEPTION 'Owner-scoped privacy RPC did not update the owner profile';
  END IF;
END;
$;

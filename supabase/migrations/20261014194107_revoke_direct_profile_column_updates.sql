-- Profile writes must go through owner-scoped RPCs, which validate fields and protect identity/role invariants.
-- The app has no direct profiles UPDATE call sites; column-level grants bypass those RPC validations.
REVOKE UPDATE (display_name, username, bio, profile_image_path, interests, home_area,
  preferred_radius_m, approximate_location, location_visibility, updated_at, account_intent)
ON TABLE public.profiles FROM anon, authenticated;

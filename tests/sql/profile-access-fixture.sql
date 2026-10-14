CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;

CREATE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  username text,
  bio text,
  profile_image_path text,
  interests text[],
  home_area text,
  preferred_radius_m integer,
  role text,
  approximate_location text,
  location_visibility text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  account_intent text,
  is_private boolean NOT NULL DEFAULT false,
  friends_list_visibility text
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Model the old permissive policy and owner-scoped update policy being replaced.
CREATE POLICY profiles_public_read ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_self_write ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE FUNCTION public.is_profile_private(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT p.is_private FROM public.profiles p WHERE p.id = profile_id), false);
$$;

CREATE FUNCTION public.can_view_full_profile(viewer_id uuid, owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT viewer_id = auth.uid() AND owner_id = auth.uid();
$$;

INSERT INTO public.profiles (id, display_name, username, is_private)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Owner', 'owner', false),
  ('22222222-2222-4222-8222-222222222222', 'Public member', 'public-member', false),
  ('33333333-3333-4333-8333-333333333333', 'Private member', 'private-member', true);

-- profiles.role is server-controlled authorization metadata.
-- Users may edit their profile, but must never be able to self-promote to admin/business.

revoke insert (role) on table public.profiles from anon, authenticated;
revoke update (role) on table public.profiles from anon, authenticated;

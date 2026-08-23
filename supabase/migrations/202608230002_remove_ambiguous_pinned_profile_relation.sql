-- community_pinned_by is intentionally not a foreign key to profiles.
-- A second posts -> profiles relationship makes PostgREST profile embeds ambiguous.
alter table public.posts drop constraint if exists posts_community_pinned_by_fkey;

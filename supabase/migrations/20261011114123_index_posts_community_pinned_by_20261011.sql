-- Cover the community pinning FK so parent-row deletes/updates do not scan posts.
-- Production applied this migration on 2026-10-11; keep this version aligned with
-- the Supabase migration history to prevent duplicate or out-of-order replay.
CREATE INDEX IF NOT EXISTS posts_community_pinned_by_idx
  ON public.posts (community_pinned_by);

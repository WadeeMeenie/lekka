-- Cover the community pinning FK so parent-row deletes/updates do not scan posts.
-- Keep this as a normal transactional migration; use a maintenance window if the
-- production posts table is already large enough that index creation would block writes.
CREATE INDEX IF NOT EXISTS posts_community_pinned_by_idx
  ON public.posts (community_pinned_by);

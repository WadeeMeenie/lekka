-- Post media is written after the post row. Realtime on this table lets the feed
-- refresh again once an uploaded image has actually been attached.
alter publication supabase_realtime add table public.post_media;

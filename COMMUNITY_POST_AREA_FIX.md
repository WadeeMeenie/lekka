# Community post area fix

The `posts.area` column remains NOT NULL. Community posts must inherit `area` from their selected community.

A migration adds `public.create_community_post(p_community_id, p_author_id, p_body, p_title)`, which resolves the community area server-side and inserts the post with that area.

The app's community-post creation path should call this RPC instead of inserting a post without `area`.

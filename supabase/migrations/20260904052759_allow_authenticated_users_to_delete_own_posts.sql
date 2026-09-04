create policy "Users can delete their own posts"
on public.posts
for delete
to authenticated
using ((select auth.uid()) = author_id);

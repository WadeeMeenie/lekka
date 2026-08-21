drop policy if exists posts_author_write on public.posts;
drop policy if exists posts_author_update on public.posts;

create policy posts_author_write on public.posts for insert with check (
  auth.uid() = author_id and (
    business_id is null or exists (
      select 1 from public.business_members bm
      where bm.business_id = posts.business_id and bm.user_id = auth.uid() and bm.role in ('owner', 'manager')
    )
  )
);

create policy posts_author_update on public.posts for update using (auth.uid() = author_id) with check (
  auth.uid() = author_id and (
    business_id is null or exists (
      select 1 from public.business_members bm
      where bm.business_id = posts.business_id and bm.user_id = auth.uid() and bm.role in ('owner', 'manager')
    )
  )
);

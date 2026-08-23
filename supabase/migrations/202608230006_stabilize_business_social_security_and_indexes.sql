-- Stabilise the database boundary before monetisation work.
-- Security: client-callable SECURITY DEFINER functions are explicitly limited to authenticated users.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_business_profile(text,text,text,text,text,text,text,text,text,text,text[],jsonb,double precision,double precision) from public, anon;
revoke execute on function public.update_business_profile(uuid,text,text,text,text,text,text,text,text,text,text[],jsonb) from public, anon;
revoke execute on function public.create_business_invitation(uuid,text,text) from public, anon;
revoke execute on function public.accept_business_invitation(uuid) from public, anon;
revoke execute on function public.request_buddy(uuid) from public, anon;
revoke execute on function public.respond_to_buddy_request(uuid,text) from public, anon;
revoke execute on function public.remove_buddy(uuid) from public, anon;
revoke execute on function public.is_community_member(uuid,uuid) from public, anon;
revoke execute on function public.is_community_owner(uuid,uuid) from public, anon;

grant execute on function public.create_business_profile(text,text,text,text,text,text,text,text,text,text,text[],jsonb,double precision,double precision) to authenticated;
grant execute on function public.update_business_profile(uuid,text,text,text,text,text,text,text,text,text,text[],jsonb) to authenticated;
grant execute on function public.create_business_invitation(uuid,text,text) to authenticated;
grant execute on function public.accept_business_invitation(uuid) to authenticated;
grant execute on function public.request_buddy(uuid) to authenticated;
grant execute on function public.respond_to_buddy_request(uuid,text) to authenticated;
grant execute on function public.remove_buddy(uuid) to authenticated;
grant execute on function public.is_community_member(uuid,uuid) to authenticated;
grant execute on function public.is_community_owner(uuid,uuid) to authenticated;

-- Business staffing records are not public data. Signed-in users can read their own
-- membership and business owners/admins/managers can read their business membership.
drop policy if exists business_members_public_read on public.business_members;
create policy business_members_authenticated_read on public.business_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.business_members bm
      where bm.business_id = business_members.business_id
        and bm.user_id = (select auth.uid())
        and bm.role in ('owner','admin','manager')
    )
  );

-- Cover foreign keys used by RLS and common joins.
create index if not exists beta_feedback_user_id_idx on public.beta_feedback(user_id);
create index if not exists business_invitations_accepted_by_idx on public.business_invitations(accepted_by);
create index if not exists business_invitations_created_by_idx on public.business_invitations(created_by);
create index if not exists businesses_owner_id_idx on public.businesses(owner_id);
create index if not exists comments_author_id_idx on public.comments(author_id);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists deals_business_id_idx on public.deals(business_id);
create index if not exists direct_conversations_requested_by_idx on public.direct_conversations(requested_by);
create index if not exists direct_conversations_user_b_idx on public.direct_conversations(user_b);
create index if not exists events_business_id_idx on public.events(business_id);
create index if not exists events_community_id_idx on public.events(community_id);
create index if not exists events_owner_id_idx on public.events(owner_id);
create index if not exists follows_following_id_idx on public.follows(following_id);
create index if not exists notifications_actor_id_idx on public.notifications(actor_id);
create index if not exists post_feedback_post_id_idx on public.post_feedback(post_id);
create index if not exists post_media_post_id_idx on public.post_media(post_id);
create index if not exists posts_business_id_idx on public.posts(business_id);
create index if not exists reactions_user_id_idx on public.reactions(user_id);
create index if not exists reports_business_id_idx on public.reports(business_id);
create index if not exists reports_comment_id_idx on public.reports(comment_id);
create index if not exists reports_post_id_idx on public.reports(post_id);
create index if not exists reports_profile_id_idx on public.reports(profile_id);
create index if not exists reports_reporter_id_idx on public.reports(reporter_id);
create index if not exists saved_posts_user_id_idx on public.saved_posts(user_id);
create index if not exists username_events_user_id_idx on public.username_events(user_id);

-- Remove exact duplicate indexes reported by the Supabase performance advisor.
drop index if exists public.community_members_unique_idx;
drop index if exists public.direct_messages_sender_idx;
drop index if exists public.notifications_user_idx;

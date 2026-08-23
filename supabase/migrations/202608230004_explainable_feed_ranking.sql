-- Lekka Explainable Feed Ranking V1
-- score = affinity*W1 + weight*W2 + decay*W3, with deterministic per-refresh +/-5% jitter.
-- All factors are persisted in feed_score_log for debugging/auditing.

create table if not exists public.feed_rank_config (
  id boolean primary key default true check (id),
  affinity_weight numeric not null default 0.45 check (affinity_weight >= 0),
  content_weight numeric not null default 0.35 check (content_weight >= 0),
  decay_weight numeric not null default 0.20 check (decay_weight >= 0),
  half_life_hours numeric not null default 5 check (half_life_hours > 0),
  randomization_pct numeric not null default 0.05 check (randomization_pct between 0 and 0.25),
  max_author_slots_top10 integer not null default 2 check (max_author_slots_top10 between 1 and 10),
  comment_weight numeric not null default 3,
  share_weight numeric not null default 2,
  reaction_weight numeric not null default 1,
  view_weight numeric not null default 0.25,
  media_multiplier numeric not null default 1.10 check (media_multiplier >= 1),
  engagement_log_base numeric not null default 2 check (engagement_log_base > 1),
  updated_at timestamptz not null default now()
);
insert into public.feed_rank_config (id) values (true) on conflict (id) do nothing;

create table if not exists public.post_shares (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_shares_post_idx on public.post_shares(post_id, created_at desc);

alter table public.post_shares enable row level security;
drop policy if exists post_shares_public_read on public.post_shares;
create policy post_shares_public_read on public.post_shares for select using (true);
drop policy if exists post_shares_self_write on public.post_shares;
create policy post_shares_self_write on public.post_shares for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.feed_affinity_scores (
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  affinity_score numeric(8,6) not null default 0,
  like_signal numeric(8,6) not null default 0,
  comment_signal numeric(8,6) not null default 0,
  friendship_signal numeric(8,6) not null default 0,
  profile_visit_signal numeric(8,6) not null default 0,
  message_signal numeric(8,6) not null default 0,
  computed_at timestamptz not null default now(),
  primary key (viewer_id, author_id),
  check (viewer_id <> author_id)
);
create index if not exists feed_affinity_viewer_idx on public.feed_affinity_scores(viewer_id, affinity_score desc);

alter table public.feed_affinity_scores enable row level security;
drop policy if exists feed_affinity_self_read on public.feed_affinity_scores;
create policy feed_affinity_self_read on public.feed_affinity_scores for select using (auth.uid() = viewer_id);

-- Optional profile-visit signal. It is intentionally empty unless the app starts tracking visits.
create table if not exists public.profile_visits (
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  visited_at timestamptz not null default now(),
  primary key (viewer_id, profile_id, visited_at),
  check (viewer_id <> profile_id)
);
create index if not exists profile_visits_pair_idx on public.profile_visits(viewer_id, profile_id, visited_at desc);
alter table public.profile_visits enable row level security;
drop policy if exists profile_visits_self_write on public.profile_visits;
create policy profile_visits_self_write on public.profile_visits for all using (auth.uid() = viewer_id) with check (auth.uid() = viewer_id);

create table if not exists public.feed_score_log (
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  affinity_factor numeric not null,
  content_weight_factor numeric not null,
  decay_factor numeric not null,
  affinity_weight numeric not null,
  content_weight numeric not null,
  decay_weight numeric not null,
  random_factor numeric not null,
  raw_score numeric not null,
  final_score numeric not null,
  rank_position integer,
  computed_at timestamptz not null default now(),
  primary key (viewer_id, post_id, computed_at)
);
create index if not exists feed_score_log_viewer_time_idx on public.feed_score_log(viewer_id, computed_at desc, final_score desc);
create index if not exists feed_score_log_post_idx on public.feed_score_log(post_id, computed_at desc);
alter table public.feed_score_log enable row level security;
drop policy if exists feed_score_log_self_read on public.feed_score_log;
create policy feed_score_log_self_read on public.feed_score_log for select using (auth.uid() = viewer_id);

-- Recompute affinity for one viewer/author pair. Recent interactions are exponentially discounted.
create or replace function public.recalculate_feed_affinity(p_viewer uuid, p_author uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  like_signal numeric := 0;
  comment_signal numeric := 0;
  friendship_signal numeric := 0;
  profile_visit_signal numeric := 0;
  message_signal numeric := 0;
  combined numeric;
begin
  if p_viewer is null or p_author is null or p_viewer = p_author then return; end if;
  select coalesce(sum(exp(-extract(epoch from (now()-r.created_at))/86400.0/30.0)),0) into like_signal
    from reactions r join posts p on p.id=r.post_id where r.user_id=p_viewer and p.author_id=p_author;
  select coalesce(sum(exp(-extract(epoch from (now()-c.created_at))/86400.0/30.0)),0) into comment_signal
    from comments c join posts p on p.id=c.post_id where c.author_id=p_viewer and p.author_id=p_author;
  select case when exists (select 1 from follows f where f.follower_id=p_viewer and f.following_id=p_author) then 1 else 0 end into friendship_signal;
  select least(1, coalesce(sum(exp(-extract(epoch from (now()-pv.visited_at))/86400.0/14.0)),0)/5.0) into profile_visit_signal
    from profile_visits pv where pv.viewer_id=p_viewer and pv.profile_id=p_author;
  -- Direct-message history is optional until a stable DM schema is present; keep an explicit zero signal.
  message_signal := 0;
  combined := least(1, (like_signal*0.15) + (comment_signal*0.35) + (friendship_signal*0.30) + (profile_visit_signal*0.10) + (message_signal*0.10));
  insert into feed_affinity_scores(viewer_id,author_id,affinity_score,like_signal,comment_signal,friendship_signal,profile_visit_signal,message_signal,computed_at)
  values(p_viewer,p_author,combined,least(1,like_signal/5),least(1,comment_signal/5),friendship_signal,profile_visit_signal,message_signal,now())
  on conflict(viewer_id,author_id) do update set affinity_score=excluded.affinity_score,like_signal=excluded.like_signal,comment_signal=excluded.comment_signal,friendship_signal=excluded.friendship_signal,profile_visit_signal=excluded.profile_visit_signal,message_signal=excluded.message_signal,computed_at=now();
end;
$$;

revoke all on function public.recalculate_feed_affinity(uuid,uuid) from public;

-- Efficient set-based refresh for all known viewer/author pairs. Suitable for nightly scheduling.
create or replace function public.refresh_feed_affinity_batch()
returns integer language plpgsql security invoker set search_path = public as $$
declare r record; n integer := 0; begin
  for r in select distinct pr.id viewer_id, p.author_id from profiles pr cross join posts p where pr.id <> p.author_id loop
    perform public.recalculate_feed_affinity(r.viewer_id,r.author_id); n := n + 1;
  end loop;
  return n;
end; $$;
revoke all on function public.refresh_feed_affinity_batch() from public;

-- Ranking RPC. Cursor is final_score + id and seed is stable for one refresh/pagination session.
create or replace function public.ranked_feed_posts_page(
  latitude double precision default null,
  longitude double precision default null,
  radius_meters integer default 5000,
  cursor_score numeric default null,
  cursor_id uuid default null,
  page_size integer default 20,
  refresh_seed double precision default 0.5
)
returns table(
  id uuid, kind public.post_kind, category text, title text, body text, area text,
  trust_score numeric, created_at timestamptz, distance_label text, author_name text,
  author_id uuid, reaction_count bigint, comment_count bigint, share_count bigint,
  affinity_factor numeric, content_weight_factor numeric, decay_factor numeric, final_score numeric
) language sql stable security invoker set search_path=public,extensions as $$
with cfg as (select * from feed_rank_config where id=true limit 1),
base as (
 select p.*, coalesce(pr.display_name,'Local neighbour') author_name,
        coalesce(fa.affinity_score, case when p.author_id=auth.uid() then 1 else 0 end) affinity,
        (select count(*) from reactions r where r.post_id=p.id) reactions_count,
        (select count(*) from comments c where c.post_id=p.id) comments_count,
        (select count(*) from post_shares s where s.post_id=p.id) shares_count,
        (select count(*) from profile_visits pv where pv.profile_id=p.id) views_count,
        (select count(*) from post_media pm where pm.post_id=p.id and pm.media_type in ('image','video')) media_count
 from posts p left join profiles pr on pr.id=p.author_id left join feed_affinity_scores fa on fa.viewer_id=auth.uid() and fa.author_id=p.author_id
 where (p.visibility='public' or p.author_id=auth.uid() or (p.visibility='nearby' and auth.uid() is not null))
   and (latitude is null or p.approximate_location is null or st_dwithin(p.approximate_location, st_setsrid(st_makepoint(longitude,latitude),4326)::geography,greatest(radius_meters,500)))
), factors as (
 select b.*, c.*, least(1, (ln(1+b.comments_count*c.comment_weight + b.shares_count*c.share_weight + b.reactions_count*c.reaction_weight + b.views_count*c.view_weight)/ln(c.engagement_log_base+1)) * case when b.media_count>0 then c.media_multiplier else 1 end) content_factor,
        exp(-extract(epoch from (now()-b.created_at))/3600.0/(c.half_life_hours/ln(2))) decay_factor,
        (1 + (((hashtextextended(b.id::text || ':' || refresh_seed::text, 0)::numeric / 9223372036854775807.0)*2)-1)*c.randomization_pct) random_factor
 from base b cross join cfg c
), scored as (
 select f.*, ((f.affinity*c.affinity_weight)+(f.content_factor*c.content_weight)+(f.decay_factor*c.decay_weight)) raw_score,
        ((f.affinity*c.affinity_weight)+(f.content_factor*c.content_weight)+(f.decay_factor*c.decay_weight))*f.random_factor final_score
 from factors f cross join cfg c
), ranked as (
 select s.*, row_number() over(order by s.final_score desc,s.id desc) global_rank,
        row_number() over(partition by s.author_id order by s.final_score desc,s.id desc) author_rank
 from scored s
), diversity as (
 select * from ranked where author_rank <= 2 or global_rank <= 10
), limited as (
 select d.*, row_number() over(order by d.final_score desc,d.id desc) output_rank from diversity d
 where cursor_score is null or d.final_score < cursor_score or (d.final_score = cursor_score and d.id < cursor_id)
 order by d.final_score desc,d.id desc limit least(greatest(page_size,1),50)
)
select l.id,l.kind,l.category,l.title,l.body,l.area,l.trust_score,l.created_at,
       case when latitude is null or l.approximate_location is null then 'Nearby' else concat(round(st_distance(l.approximate_location,st_setsrid(st_makepoint(longitude,latitude),4326)::geography)::numeric/1000,1),' km') end,
       l.author_name,l.author_id,l.reactions_count,l.comments_count,l.shares_count,l.affinity,l.content_factor,l.decay_factor,l.final_score
from limited l order by l.final_score desc,l.id desc;
$$;

grant execute on function public.ranked_feed_posts_page(double precision,double precision,integer,numeric,uuid,integer,double precision) to authenticated;

-- Refresh affinity after interactions without doing a full batch.
create or replace function public.touch_feed_affinity_from_reaction() returns trigger language plpgsql security invoker set search_path=public as $$ declare a uuid; begin select author_id into a from posts where id=new.post_id; perform recalculate_feed_affinity(new.user_id,a); return new; end; $$;
drop trigger if exists reactions_affinity_trigger on reactions;
create trigger reactions_affinity_trigger after insert on reactions for each row execute function touch_feed_affinity_from_reaction();
create or replace function public.touch_feed_affinity_from_comment() returns trigger language plpgsql security invoker set search_path=public as $$ declare a uuid; begin select author_id into a from posts where id=new.post_id; perform recalculate_feed_affinity(new.author_id,a); return new; end; $$;
drop trigger if exists comments_affinity_trigger on comments;
create trigger comments_affinity_trigger after insert on comments for each row execute function touch_feed_affinity_from_comment();
create or replace function public.touch_feed_affinity_from_follow() returns trigger language plpgsql security invoker set search_path=public as $$ begin perform recalculate_feed_affinity(new.follower_id,new.following_id); return new; end; $$;
drop trigger if exists follows_affinity_trigger on follows;
create trigger follows_affinity_trigger after insert on follows for each row execute function touch_feed_affinity_from_follow();

-- Explainability/debug helper: latest factors for the current viewer.
create or replace function public.latest_feed_score_diagnostics(p_post_id uuid)
returns table(post_id uuid, affinity numeric, content_weight numeric, decay numeric, raw_score numeric, final_score numeric, computed_at timestamptz)
language sql stable security invoker set search_path=public as $$
 select post_id,affinity_factor,content_weight_factor,decay_factor,raw_score,final_score,computed_at
 from feed_score_log where viewer_id=auth.uid() and post_id=p_post_id order by computed_at desc limit 1;
$$;
grant execute on function public.latest_feed_score_diagnostics(uuid) to authenticated;

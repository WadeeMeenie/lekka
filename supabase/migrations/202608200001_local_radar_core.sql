create extension if not exists postgis;

create type public.account_role as enum ('user', 'business', 'admin');
create type public.post_kind as enum ('post', 'alert', 'event', 'deal', 'job', 'marketplace', 'service');
create type public.visibility_scope as enum ('nearby', 'community', 'followers', 'public', 'group');
create type public.alert_status as enum ('reported', 'community_confirmed', 'official');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  username text unique,
  bio text,
  profile_image_path text,
  interests text[] not null default '{}',
  home_area text not null default 'Bellville',
  preferred_radius_m integer not null default 5000 check (preferred_radius_m between 500 and 50000),
  role public.account_role not null default 'user',
  approximate_location geography(Point, 4326),
  location_visibility text not null default 'area' check (location_visibility in ('hidden', 'area')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_path text,
  area text not null,
  category text not null,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  rules text[] not null default '{}',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_moderator boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  category text not null,
  description text not null default '',
  logo_path text,
  cover_path text,
  approximate_location geography(Point, 4326),
  area text not null,
  address text,
  phone text,
  whatsapp text,
  website text,
  opening_hours jsonb not null default '{}'::jsonb,
  verification_state text not null default 'unverified' check (verification_state in ('unverified', 'pending', 'verified')),
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  community_id uuid references public.communities(id) on delete set null,
  kind public.post_kind not null default 'post',
  category text,
  title text,
  body text not null check (char_length(body) between 1 and 5000),
  visibility public.visibility_scope not null default 'nearby',
  area text not null,
  approximate_location geography(Point, 4326),
  alert_status public.alert_status,
  engagement_count integer not null default 0,
  trust_score numeric(4,3) not null default 0.500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  thumbnail_path text,
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.saved_posts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index posts_location_gix on public.posts using gist (approximate_location);
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_category_idx on public.posts (category, created_at desc);
create index businesses_location_gix on public.businesses using gist (approximate_location);
create index businesses_category_idx on public.businesses (category, verification_state);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''), nullif(new.raw_user_meta_data->>'username', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.businesses enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.saved_posts enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

create policy profiles_public_read on public.profiles for select using (true);
create policy profiles_self_write on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy follows_public_read on public.follows for select using (true);
create policy follows_self_write on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy communities_public_read on public.communities for select using (visibility = 'public' or exists (select 1 from public.community_members cm where cm.community_id = id and cm.user_id = auth.uid()));
create policy communities_owner_write on public.communities for all using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy community_members_read on public.community_members for select using (true);
create policy community_members_self_write on public.community_members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy businesses_public_read on public.businesses for select using (true);
create policy businesses_owner_write on public.businesses for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy posts_public_read on public.posts for select using (visibility = 'public' or auth.uid() = author_id or (visibility = 'nearby' and auth.uid() is not null));
create policy posts_author_write on public.posts for insert with check (auth.uid() = author_id);
create policy posts_author_update on public.posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy posts_author_delete on public.posts for delete using (auth.uid() = author_id);
create policy post_media_public_read on public.post_media for select using (true);
create policy post_media_author_write on public.post_media for all using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())) with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy comments_public_read on public.comments for select using (true);
create policy comments_self_write on public.comments for all using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy reactions_public_read on public.reactions for select using (true);
create policy reactions_self_write on public.reactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy saved_posts_self_access on public.saved_posts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reports_self_create on public.reports for insert with check (auth.uid() = reporter_id);
create policy notifications_self_read on public.notifications for select using (auth.uid() = user_id);
create policy notifications_self_update on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('local-radar-media', 'local-radar-media', false) on conflict (id) do nothing;
create policy media_authenticated_read on storage.objects for select using (bucket_id = 'local-radar-media' and auth.role() = 'authenticated');
create policy media_user_upload on storage.objects for insert with check (bucket_id = 'local-radar-media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy media_user_update on storage.objects for update using (bucket_id = 'local-radar-media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy media_user_delete on storage.objects for delete using (bucket_id = 'local-radar-media' and auth.uid()::text = (storage.foldername(name))[1]);

alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;

create or replace function public.nearby_radar(radius_meters integer, area_name text)
returns table (id uuid, category text, title text, subtitle text, area text, distance text, "time" text, accent text, icon text)
language sql stable security invoker set search_path = public as $$
  select p.id,
         coalesce(p.category, p.kind::text) as category,
         coalesce(p.title, left(p.body, 60)) as title,
         p.body as subtitle,
         p.area,
         case when p.approximate_location is null then 'Area-level' else concat(round(st_distance(p.approximate_location, p.approximate_location)::numeric / 1000, 1), ' km') end as distance,
         to_char(p.created_at, 'DD Mon · HH24:MI') as "time",
         case when p.kind = 'alert' then '#D95D4F' else '#2F7D67' end as accent,
         case when p.kind = 'alert' then 'campaign' else 'place' end as icon
  from public.posts p
  where p.area = area_name
    and (p.approximate_location is null or st_dwithin(p.approximate_location, p.approximate_location, radius_meters))
  order by p.created_at desc
  limit 100;
$$;

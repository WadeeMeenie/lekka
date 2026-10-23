-- Read-only post-deployment verification for the profile privacy helper migration.
-- Run in Supabase SQL Editor only AFTER the migration is applied.
-- Every check raises an exception if the deployed security boundary is not correct.
do $verify$
declare
  policy_definition text;
  feed_definition text;
  feed_page_definition text;
  detail_definition text;
begin
  if to_regprocedure('public.is_profile_private(uuid)') is not null then
    raise exception 'FAIL: public.is_profile_private(uuid) still exists';
  end if;

  if to_regprocedure('private.is_profile_private(uuid)') is null then
    raise exception 'FAIL: private.is_profile_private(uuid) is missing';
  end if;

  if not has_schema_privilege('authenticated', 'private', 'USAGE') then
    raise exception 'FAIL: authenticated lacks USAGE on private schema';
  end if;

  if has_schema_privilege('anon', 'private', 'USAGE') then
    raise exception 'FAIL: anon has USAGE on private schema';
  end if;

  if has_function_privilege('anon', 'private.is_profile_private(uuid)', 'EXECUTE') then
    raise exception 'FAIL: anon can execute private.is_profile_private(uuid)';
  end if;

  if not has_function_privilege('authenticated', 'private.is_profile_private(uuid)', 'EXECUTE') then
    raise exception 'FAIL: authenticated cannot execute private.is_profile_private(uuid)';
  end if;

  select qual into policy_definition
  from pg_policies
  where schemaname = 'public'
    and tablename = 'posts'
    and policyname = 'posts_public_read'
    and cmd = 'SELECT';

  if policy_definition is null or position('private.is_profile_private' in policy_definition) = 0 then
    raise exception 'FAIL: posts_public_read does not use private.is_profile_private';
  end if;

  select pg_get_functiondef('public.nearby_feed_posts(double precision,double precision,integer)'::regprocedure)
    into feed_definition;
  select pg_get_functiondef('public.nearby_feed_posts_page(double precision,double precision,integer,timestamp with time zone,uuid,integer)'::regprocedure)
    into feed_page_definition;
  select pg_get_functiondef('public.nearby_post_detail(uuid,double precision,double precision,integer)'::regprocedure)
    into detail_definition;

  if position('private.is_profile_private' in feed_definition) = 0
     or position('is_blocked_between' in feed_definition) = 0 then
    raise exception 'FAIL: nearby_feed_posts missing profile privacy or block checks';
  end if;

  if position('private.is_profile_private' in feed_page_definition) = 0
     or position('is_blocked_between' in feed_page_definition) = 0 then
    raise exception 'FAIL: nearby_feed_posts_page missing profile privacy or block checks';
  end if;

  if position('private.is_profile_private' in detail_definition) = 0
     or position('is_blocked_between' in detail_definition) = 0 then
    raise exception 'FAIL: nearby_post_detail missing profile privacy or block checks';
  end if;

  if has_function_privilege('anon', 'public.nearby_post_detail(uuid,double precision,double precision,integer)', 'EXECUTE') then
    raise exception 'FAIL: anon can execute nearby_post_detail';
  end if;

  raise notice 'PASS: profile privacy helper boundary, post-read policy, feed/detail checks, and grants verified';
end
$verify$;

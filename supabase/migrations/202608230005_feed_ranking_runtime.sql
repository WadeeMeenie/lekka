-- Runtime correction for feed ranking V1: persisted score diagnostics, stable pagination,
-- and a strict two-post-per-author cap in the top ten.

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
  affinity_factor numeric, content_weight_factor numeric, decay_factor numeric, final_score numeric,
  ranked_score numeric
) language sql volatile security invoker set search_path=public,extensions as $$
with cfg as (select * from feed_rank_config where id=true limit 1),
base as (
 select p.*, coalesce(pr.display_name,'Local neighbour') author_name,
        coalesce(fa.affinity_score, case when p.author_id=auth.uid() then 1 else 0 end) affinity,
        (select count(*) from reactions r where r.post_id=p.id) reactions_count,
        (select count(*) from comments c where c.post_id=p.id) comments_count,
        (select count(*) from post_shares s where s.post_id=p.id) shares_count,
        0::bigint views_count,
        (select count(*) from post_media pm where pm.post_id=p.id and pm.media_type in ('image','video')) media_count
 from posts p left join profiles pr on pr.id=p.author_id left join feed_affinity_scores fa on fa.viewer_id=auth.uid() and fa.author_id=p.author_id
 where (p.visibility='public' or p.author_id=auth.uid() or (p.visibility='nearby' and auth.uid() is not null))
   and (latitude is null or p.approximate_location is null or st_dwithin(p.approximate_location, st_setsrid(st_makepoint(longitude,latitude),4326)::geography,greatest(radius_meters,500)))
), scored0 as (
 select b.*, c.*,
        least(1, (ln(1+b.comments_count*c.comment_weight + b.shares_count*c.share_weight + b.reactions_count*c.reaction_weight + b.views_count*c.view_weight)/ln(c.engagement_log_base+1)) * case when b.media_count>0 then c.media_multiplier else 1 end) content_factor,
        exp(-extract(epoch from (now()-b.created_at))/3600.0/(c.half_life_hours/ln(2))) decay_factor,
        (1 + ((((hashtextextended(b.id::text || ':' || refresh_seed::text, 0)::numeric / 9223372036854775807.0)*2)-1)*c.randomization_pct)) random_factor
 from base b cross join cfg c
), scored as (
 select s.*, ((s.affinity*s.affinity_weight)+(s.content_factor*s.content_weight)+(s.decay_factor*s.decay_weight)) raw_score,
        ((s.affinity*s.affinity_weight)+(s.content_factor*s.content_weight)+(s.decay_factor*s.decay_weight))*s.random_factor final_score
 from scored0 s
), authored as (
 select s.*, row_number() over(partition by s.author_id order by s.final_score desc,s.id desc) author_rank
 from scored s
), ranked as (
 select a.*, case when a.author_rank <= a.max_author_slots_top10 then a.final_score else a.final_score - 1000000 end ranked_score
 from authored a
), logged as (
 insert into feed_score_log(viewer_id,post_id,author_id,affinity_factor,content_weight_factor,decay_factor,affinity_weight,content_weight,decay_weight,random_factor,raw_score,final_score,rank_position,computed_at)
 select auth.uid(),r.id,r.author_id,r.affinity,r.content_factor,r.decay_factor,r.affinity_weight,r.content_weight,r.decay_weight,r.random_factor,r.raw_score,r.final_score,
        row_number() over(order by r.ranked_score desc,r.id desc),now()
 from ranked r
 returning post_id
)
select r.id,r.kind,r.category,r.title,r.body,r.area,r.trust_score,r.created_at,
       case when latitude is null or r.approximate_location is null then 'Nearby' else concat(round(st_distance(r.approximate_location,st_setsrid(st_makepoint(longitude,latitude),4326)::geography)::numeric/1000,1),' km') end,
       r.author_name,r.author_id,r.reactions_count,r.comments_count,r.shares_count,r.affinity,r.content_factor,r.decay_factor,r.final_score,r.ranked_score
from ranked r
where cursor_score is null or r.ranked_score < cursor_score or (r.ranked_score = cursor_score and r.id < cursor_id)
order by r.ranked_score desc,r.id desc
limit least(greatest(page_size,1),50);
$$;

grant execute on function public.ranked_feed_posts_page(double precision,double precision,integer,numeric,uuid,integer,double precision) to authenticated;

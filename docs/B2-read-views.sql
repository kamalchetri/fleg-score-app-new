-- B2 — NSPG + events public read-views that back lib/nspg-live.ts and lib/events-live.ts.
-- STAGED: do NOT apply to production until cutover (after 24 Oct, after provisioning + the
-- ranked-results migration). Claude verifies this on isolated Postgres first. Public hub is
-- anonymous-read; these views expose ONLY already-public tournaments. No writes, no PII.
--
-- Column names verified against live schema 17 Oct 2026:
--   tournaments(slug,sport,name,visibility,status,banner_url,city,venue_name,starts_at,ends_at,...)
--   tournament_categories(id,tournament_id,name,format,entrant_type,entry_fee,...)
--   stages(id,tournament_id,category_id,name,stage_type,...)
--   matches(id,tournament_id,category_id,stage_id,round,entrant_a,entrant_b,winner_id,status,score jsonb,court,scheduled_at,...)
--   entrants(id,display_name,city,photo_url,...)
--   matches.status ∈ scheduled|live|completed|walkover ; matches.score = {a,b,display,points_a,points_b,...}
-- Gate: a match is public when its tournament.visibility='public'. (Optional finer control at B1:
--   add matches.is_public bool default false and AND it in below — decide with organisers.)

-- 1. SPORTS (hub grid) --------------------------------------------------------
create or replace view public.nspg_v_sports as
select
  t.sport                                   as slug,
  btrim(replace(t.name,'NSPG26 —','')) as name,
  case t.sport
    when 'football' then 'football' when 'basketball' then 'basketball'
    when 'volleyball' then 'volleyball' when 'boxing' then 'boxing-glove'
    when 'archery' then 'target' when 'athletics' then 'run'
    else 'trophy' end                        as icon,
  count(m.*) filter (where m.status='live')  as live_count,
  count(m.*) filter (where (m.scheduled_at at time zone 'Asia/Kolkata')::date
                           = (now() at time zone 'Asia/Kolkata')::date) as today_count
from public.tournaments t
left join public.matches m on m.tournament_id = t.id
where t.slug like 'nspg26-%' and t.visibility = 'public'
group by t.sport, t.name;

-- 2. FIXTURES (fixtures/results/live/match header) ----------------------------
create or replace view public.nspg_v_fixtures as
select
  m.id,
  t.sport                                   as sport_slug,
  coalesce(tc.name,'')                      as category,
  coalesce(st.name, 'Round '||m.round::text) as round_label,
  case when m.status in ('completed','walkover') then 'final'
       when m.status='live' then 'live' else 'scheduled' end as status,
  m.scheduled_at                            as start_at,
  m.court                                   as venue,
  m.entrant_a as side_a_id, ea.display_name as side_a_name, ea.city as side_a_district,
  ea.photo_url as side_a_logo, nullif(m.score->>'a','')::int as side_a_score,
  m.entrant_b as side_b_id, eb.display_name as side_b_name, eb.city as side_b_district,
  eb.photo_url as side_b_logo, nullif(m.score->>'b','')::int as side_b_score,
  m.score->>'clock'                         as clock,
  m.score->>'display'                       as score_display,
  m.winner_id, t.slug as tournament_slug
from public.matches m
join public.tournaments t  on t.id = m.tournament_id and t.slug like 'nspg26-%' and t.visibility='public'
left join public.tournament_categories tc on tc.id = m.category_id
left join public.stages st on st.id = m.stage_id
left join public.entrants ea on ea.id = m.entrant_a
left join public.entrants eb on eb.id = m.entrant_b;

-- 3. LIVE (Live Match Centre) -------------------------------------------------
create or replace view public.nspg_v_live as
select * from public.nspg_v_fixtures where status = 'live';

-- 4. STANDINGS (league / groups — knockout uses the bracket from fixtures) -----
create or replace view public.nspg_v_standings as
with mm as (
  select t.sport as sport_slug, m.category_id, coalesce(st.name,'League') as group_label,
         m.entrant_a as ea, m.entrant_b as eb,
         nullif(m.score->>'a','')::int as sa, nullif(m.score->>'b','')::int as sb
  from public.matches m
  join public.tournaments t on t.id=m.tournament_id and t.slug like 'nspg26-%' and t.visibility='public'
  left join public.stages st on st.id=m.stage_id
  left join public.tournament_categories tc on tc.id=m.category_id
  where m.status in ('completed','walkover') and m.entrant_a is not null and m.entrant_b is not null
    and tc.format in ('league','groups_knockout')
),
rows as (
  select sport_slug, category_id, group_label, ea as entrant,
         1 as played, (sa>sb)::int as won, (sa=sb)::int as drawn, (sa<sb)::int as lost,
         case when sa>sb then 3 when sa=sb then 1 else 0 end as pts from mm
  union all
  select sport_slug, category_id, group_label, eb,
         1, (sb>sa)::int, (sa=sb)::int, (sb<sa)::int,
         case when sb>sa then 3 when sa=sb then 1 else 0 end from mm
)
select r.sport_slug, tc.name as category, r.group_label,
  e.display_name as team, e.city as district,
  sum(r.played) as played, sum(r.won) as won, sum(r.drawn) as drawn, sum(r.lost) as lost,
  sum(r.pts) as points,
  rank() over (partition by r.sport_slug, r.category_id, r.group_label
               order by sum(r.pts) desc, sum(r.won) desc) as rank
from rows r
join public.entrants e on e.id = r.entrant
left join public.tournament_categories tc on tc.id = r.category_id
group by r.sport_slug, r.category_id, tc.name, r.group_label, e.display_name, e.city;

-- 5. MEDALS (district tally) --------------------------------------------------
-- v1: gold = winner of the highest completed round per category; silver = that match's loser.
-- Bronze/placements are sport-specific — REFINE at cutover with the committee's placement rules.
create or replace view public.nspg_v_medals as
with finals as (
  select distinct on (m.tournament_id, m.category_id)
    m.tournament_id, m.category_id, m.winner_id,
    case when m.winner_id = m.entrant_a then m.entrant_b else m.entrant_a end as runner_up_id
  from public.matches m
  join public.tournaments t on t.id=m.tournament_id and t.slug like 'nspg26-%' and t.visibility='public'
  where m.status in ('completed','walkover') and m.winner_id is not null
  order by m.tournament_id, m.category_id, m.round desc, m.completed_at desc
),
tally as (
  select e.city as district, 1 as gold, 0 as silver from finals f join public.entrants e on e.id=f.winner_id
  union all
  select e.city, 0, 1 from finals f join public.entrants e on e.id=f.runner_up_id
)
select district,
  sum(gold) as gold, sum(silver) as silver, 0::int as bronze,
  sum(gold)+sum(silver) as total
from tally where district is not null
group by district;

-- 6. EVENTS (Discover / Home) -------------------------------------------------
-- v1: reg-form events (the fleg.in generic events incl NSPG). At cutover, UNION in the
-- dedicated event tables (coffee_run, workshops, rmlcf_*, runs, fleg_one*) for full parity,
-- and source dates/banners there (reg_forms has no event date; left null here).
create or replace view public.events_v_public as
select
  f.slug, f.title,
  case when f.sport='officials' then 'other'
       when f.slug like 'nspg26-%' then 'tournament' else 'tournament' end as kind,
  nullif(f.sport,'')                 as sport,
  case f.status when 'open' then 'registration_open'
                when 'closed' then 'registration_closed'
                when 'draft' then 'upcoming'
                else 'past' end       as status,
  null::timestamptz                   as start_date,
  f.city, f.venue_name                as venue,
  f.banner_url,
  coalesce(f.is_paid,false)           as paid,
  case when coalesce(f.is_paid,false) then nullif(f.base_fee,0) else null end as price_from,
  (f.slug like 'nspg26-%')            as is_nspg,
  null::text                          as organiser
from public.reg_forms f
where f.visibility = 'public' and f.status in ('open','closed','draft');

-- Public read grants (anonymous hub) -----------------------------------------
grant select on public.nspg_v_sports, public.nspg_v_fixtures, public.nspg_v_live,
                public.nspg_v_standings, public.nspg_v_medals, public.events_v_public
  to anon, authenticated;

-- B4 — NSPG provisioning-lite: push the FINAL registration list into each discipline as
-- entrants so organisers build fixtures/brackets on top. No format/committee decisions needed.
-- STAGED: run at cutover (after 24 Oct, on the final confirmed list), p_apply=false first (dry
-- run → counts), then p_apply=true with Kamal's go. Additive inserts only; idempotent per slug.
-- Model: team sports → 1 team entrant per (district, category) with roster; all others → 1
-- entrant per (athlete, category). Doubles players pushed as individuals (paired in builder).
-- Verified on isolated Postgres.

create or replace function public.nspg_provision_lite(p_apply boolean default false)
returns table(step text, detail text, n integer)
language plpgsql security definer set search_path to 'public' as $$
declare
  team_sports text[] := array['football','basketball','volleyball','sepaktakraw'];
  f record; c record; v_tid uuid; v_cid uuid; v_entrants int := 0; v_tours int := 0; v_cats int := 0;
begin
  if not p_apply then
    -- safety gate: no inserts unless explicitly applied. Take a DB snapshot before p_apply=true.
    return query values ('info','dry run — pass p_apply=true to commit (snapshot the DB first)', 0);
    return;
  end if;

  for f in
    select id, slug, sport, title, fields from reg_forms
    where slug like 'nspg26-%' and coalesce(sport,'') <> 'officials'
  loop
    -- tournament (one per sport form), draft/private; organiser publishes later
    select id into v_tid from tournaments where slug = f.slug;
    if v_tid is null then
      insert into tournaments(slug, sport, name, status, visibility, city, state)
      values (f.slug, f.sport, f.title, 'draft', 'private', 'Chümoukedima', 'Nagaland')
      returning id into v_tid;
      v_tours := v_tours + 1;
    end if;

    -- Venue + date window per sport, from the official NSPG schedule (VENUE & DATES).
    -- Re-applied each run (idempotent — sets known values).
    update tournaments t set venue_name = m.venue, starts_at = m.sd, ends_at = m.ed
    from (values
      ('archery','Cricket Stadium, Sovima','2026-11-03 09:00+05:30'::timestamptz,'2026-11-06 18:00+05:30'::timestamptz),
      ('athletics','SAI, Dimapur','2026-11-03 09:00+05:30','2026-11-06 18:00+05:30'),
      ('badminton','Kire Stadium, NAPTC','2026-11-03 09:00+05:30','2026-11-06 18:00+05:30'),
      ('basketball','1st NAP Ground','2026-11-03 09:00+05:30','2026-11-07 18:00+05:30'),
      ('boxing','1st NAP Ground','2026-11-10 09:00+05:30','2026-11-13 18:00+05:30'),
      ('football','DGP Sports Ground','2026-11-10 09:00+05:30','2026-11-14 18:00+05:30'),
      ('lawn_tennis','Kuda, Dimapur','2026-11-10 09:00+05:30','2026-11-11 18:00+05:30'),
      ('pencak_silat','Immanuel Hall, Signal Basti, Dimapur','2026-11-03 09:00+05:30','2026-11-05 18:00+05:30'),
      ('sepaktakraw','Multi Disciplinary Stadium, Sovima','2026-11-12 09:00+05:30','2026-11-14 18:00+05:30'),
      ('table_tennis','Multi Disciplinary Stadium, Sovima','2026-11-04 09:00+05:30','2026-11-06 18:00+05:30'),
      ('taekwondo','Kire Stadium, NAPTC','2026-11-10 09:00+05:30','2026-11-11 18:00+05:30'),
      ('volleyball','1st NAP Ground','2026-11-10 09:00+05:30','2026-11-13 18:00+05:30'),
      ('wrestling','Multi Disciplinary Complex, near DC Complex, Chümoukedima','2026-11-04 09:00+05:30','2026-11-05 18:00+05:30'),
      ('wushu','Multi Disciplinary Complex, near DC Complex, Chümoukedima','2026-11-12 09:00+05:30','2026-11-13 18:00+05:30')
    ) as m(sport, venue, sd, ed)
    where t.id = v_tid and m.sport = f.sport;

    for c in select id, name from reg_form_categories where form_id = f.id order by sort_order loop
      -- category (map by name); entrant_type by sport
      select id into v_cid from tournament_categories where tournament_id = v_tid and name = c.name;
      if v_cid is null then
        insert into tournament_categories(tournament_id, name, format, entrant_type)
        values (v_tid, c.name,
                case when f.sport = any(team_sports) then 'groups_knockout' else 'knockout' end,
                case when f.sport = any(team_sports) then 'team'
                     when c.name ilike '%doubles%' then 'singles'  -- pushed individual, paired later
                     else 'singles' end)
        returning id into v_cid;
        v_cats := v_cats + 1;
      end if;

      -- idempotency: only populate a category that has no entrants yet (no unique key to
      -- conflict on, so re-running would otherwise duplicate). Safe to re-run the function.
      if not exists (select 1 from entrants where tournament_id = v_tid and category_id = v_cid) then
        if f.sport = any(team_sports) then
          -- one team entrant per district in this category (roster = that district's athletes)
          insert into entrants(tournament_id, category_id, display_name, city, players, status)
          select v_tid, v_cid,
                 coalesce(nullif(trim(s.answers->>'district'),''),'(not stated)'),
                 coalesce(nullif(trim(s.answers->>'district'),''),'(not stated)'),
                 jsonb_agg(jsonb_build_object('reg_code', s.reg_code, 'name', s.full_name) order by s.full_name),
                 'approved'
          from reg_submissions s
          join reg_submission_categories sc on sc.submission_id = s.id and sc.category_id = c.id
          where s.form_id = f.id and s.status = 'confirmed'
          group by 1,2,3,4;
        else
          -- one entrant per athlete in this category
          insert into entrants(tournament_id, category_id, display_name, city, players, status)
          select v_tid, v_cid, s.full_name,
                 coalesce(nullif(trim(s.answers->>'district'),''),'(not stated)'),
                 jsonb_build_array(jsonb_build_object('reg_code', s.reg_code, 'name', s.full_name)),
                 'approved'
          from reg_submissions s
          join reg_submission_categories sc on sc.submission_id = s.id and sc.category_id = c.id
          where s.form_id = f.id and s.status = 'confirmed';
        end if;
      end if;
    end loop;
  end loop;

  select count(*) into v_entrants from entrants e
    join tournaments t on t.id = e.tournament_id where t.slug like 'nspg26-%';

  return query values
    ('tournaments','created this run', v_tours),
    ('categories','created this run', v_cats),
    ('entrants','total on nspg26 tournaments', v_entrants);
end $$;

-- Usage at cutover (snapshot the DB first):
--   select * from public.nspg_provision_lite(false);  -- safety gate: no writes, reminder only
--   select * from public.nspg_provision_lite(true);   -- commit the push (idempotent)

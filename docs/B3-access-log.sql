-- B3 — NSPG accreditation checkpoints + access/movement log + lookup RPC.
-- Backs the accreditation scanner (Task J) and kiosk PASS card. STAGED: apply at cutover
-- with Kamal's go. Additive only — no change to registration tables. Verified on isolated PG.
-- Data = NSPG's own accredited participants at NSPG's own venues (event access control).

create table if not exists public.nspg_checkpoints (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,                 -- "Main Gate", "Cafeteria", "Volleyball Arena"
  kind       text not null default 'venue', -- venue | gate | cafeteria | village | other
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.nspg_access_scans (
  id            uuid primary key default gen_random_uuid(),
  reg_code      text not null,
  checkpoint_id uuid not null references public.nspg_checkpoints(id),
  direction     text not null default 'in' check (direction in ('in','out')),
  scanned_at    timestamptz not null default now(),
  scanned_by    uuid,
  note          text
);
create index if not exists idx_access_scans_reg   on public.nspg_access_scans (reg_code);
create index if not exists idx_access_scans_point on public.nspg_access_scans (checkpoint_id, scanned_at desc);

-- Resolve a Reg ID → person card, record the scan, return what the PASS screen shows.
-- SECURITY DEFINER so the single call both verifies accreditation and logs the movement.
create or replace function public.log_access_scan(
  p_reg_code text, p_checkpoint_id uuid, p_direction text default 'in', p_scanned_by uuid default null
) returns table (reg_code text, full_name text, role text, district text, valid boolean, scan_at timestamptz)
language plpgsql security definer set search_path to 'public' as $$
declare r record;
begin
  select s.reg_code, s.full_name,
         case when f.sport='officials'
              then coalesce((select c.name from reg_submission_categories sc
                             join reg_form_categories c on c.id=sc.category_id
                             where sc.submission_id=s.id limit 1),'Official')
              else 'Athlete' end as role,
         coalesce(nullif(trim(s.answers->>'district'),''),'—') as district,
         (s.status = 'confirmed') as valid
    into r
  from reg_submissions s join reg_forms f on f.id=s.form_id
  where f.slug like 'nspg26-%' and lower(s.reg_code)=lower(p_reg_code)
  limit 1;

  if not found then
    return query select p_reg_code, null::text, null::text, null::text, false, null::timestamptz;
    return;
  end if;

  insert into public.nspg_access_scans(reg_code, checkpoint_id, direction, scanned_by)
  values (r.reg_code, p_checkpoint_id, coalesce(nullif(p_direction,''),'in'), p_scanned_by);

  return query select r.reg_code, r.full_name, r.role, r.district, r.valid, now();
end $$;

-- RLS: accreditation/organiser/admin staff only (service role bypasses).
alter table public.nspg_checkpoints   enable row level security;
alter table public.nspg_access_scans  enable row level security;

create policy nspg_cp_staff on public.nspg_checkpoints for all
  using (exists (select 1 from profiles p where p.id = auth.uid()
                 and p.role in ('admin','nspg_lead','nspg_staff','organiser')))
  with check (exists (select 1 from profiles p where p.id = auth.uid()
                 and p.role in ('admin','nspg_lead','nspg_staff','organiser')));

create policy nspg_scan_staff on public.nspg_access_scans for all
  using (exists (select 1 from profiles p where p.id = auth.uid()
                 and p.role in ('admin','nspg_lead','nspg_staff','organiser')))
  with check (exists (select 1 from profiles p where p.id = auth.uid()
                 and p.role in ('admin','nspg_lead','nspg_staff','organiser')));

grant execute on function public.log_access_scan(text, uuid, text, uuid) to authenticated;

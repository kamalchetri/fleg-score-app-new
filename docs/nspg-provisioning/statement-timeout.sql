\set ON_ERROR_STOP on

SELECT set_config('nspg.local_import', 'on', false);
SELECT set_config('nspg.test_clock', '2026-10-16 00:00:00+00', false);
SELECT set_config('nspg.test_statement_timeout', '100ms', false);
SELECT set_config('nspg.fail_statement_timeout', 'on', false);
SET statement_timeout = '300ms';

SELECT * FROM public.nspg_apply_import(
  p_mode := 'apply',
  p_project_ref := 'local-fleg-nspg-provision',
  p_snapshot_hash := public.nspg_registration_hash(),
  p_snapshot_at := '2026-10-16 00:00:00+00',
  p_organizer_id := '00000000-0000-4000-8000-0000000000aa',
  p_acknowledgement := 'ACKNOWLEDGE_NSPG_LOCAL_IMPORT',
  p_status := 'draft',
  p_visibility := 'private',
  p_allow_null_schedule := true
);

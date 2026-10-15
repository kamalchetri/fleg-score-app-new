\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset fieldsep '|'

SELECT set_config('nspg.local_import', 'on', false);
SELECT set_config('nspg.test_clock', '2026-10-16 00:00:00+00', false);

DO $lock$
DECLARE
  v_state text;
  v_message text;
  v_hash text;
BEGIN
  SELECT public.nspg_registration_hash() INTO v_hash;
  PERFORM * FROM public.nspg_apply_import(
    p_mode := 'apply',
    p_project_ref := 'local-fleg-nspg-provision',
    p_snapshot_hash := v_hash,
    p_snapshot_at := '2026-10-16 00:00:00+00',
    p_organizer_id := '00000000-0000-4000-8000-0000000000aa',
    p_acknowledgement := 'ACKNOWLEDGE_NSPG_LOCAL_IMPORT',
    p_status := 'draft',
    p_visibility := 'private',
    p_allow_null_schedule := true
  );
  RAISE EXCEPTION 'lock_test_did_not_fail';
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
    IF v_state <> '55P03' THEN
      RAISE EXCEPTION 'unexpected % %', v_state, v_message;
    END IF;
END
$lock$;

SELECT 'lock_timeout' AS step,
       CASE WHEN count(*) = 0 THEN 'rejected' ELSE 'fail' END AS outcome,
       'tournaments=' || count(*)::text AS detail
FROM public.tournaments
WHERE slug LIKE 'nspg26-%';

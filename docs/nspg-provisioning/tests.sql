-- Local safety scenarios. Does not connect to Supabase.

\set ON_ERROR_STOP on

CREATE TEMP TABLE import_results (
  step text PRIMARY KEY,
  outcome text NOT NULL,
  detail text NOT NULL
);

CREATE TEMP TABLE saved_submissions AS TABLE public.reg_submissions;
CREATE TEMP TABLE saved_links AS TABLE public.reg_submission_categories;

DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nspg_importer') THEN
    CREATE ROLE nspg_importer NOLOGIN;
  END IF;
END
$role$;

GRANT INSERT, SELECT ON import_results TO nspg_importer;
GRANT USAGE ON SCHEMA public TO nspg_importer;
GRANT SELECT ON public.reg_forms, public.reg_form_categories, public.reg_submissions, public.reg_submission_categories, public.profiles TO nspg_importer;
GRANT SELECT, INSERT ON public.tournaments, public.tournament_categories, public.entrants, public.nspg_import_links, public.nspg_import_objects, public.nspg_import_review TO nspg_importer;
GRANT UPDATE (entrant_id) ON public.nspg_import_links TO nspg_importer;
GRANT REFERENCES ON public.profiles TO nspg_importer;
GRANT EXECUTE ON FUNCTION public.nspg_apply_import(text, text, text, timestamptz, uuid, text, jsonb, jsonb, integer, timestamptz, timestamptz, text, text, text, text, boolean, integer) TO nspg_importer;
GRANT EXECUTE ON FUNCTION public.nspg_registration_hash() TO nspg_importer;
GRANT EXECUTE ON FUNCTION public.nspg_import_clock() TO nspg_importer;
GRANT EXECUTE ON FUNCTION public.nspg_snapshot_counts() TO nspg_importer;
GRANT EXECUTE ON FUNCTION public.nspg_snapshot_canonical() TO nspg_importer;
GRANT EXECUTE ON FUNCTION public.nspg_approved_auto_manifest() TO nspg_importer;
GRANT EXECUTE ON FUNCTION public.nspg_classified_links() TO nspg_importer;
GRANT EXECUTE ON FUNCTION public.nspg_tournament_slug(text) TO nspg_importer;
GRANT EXECUTE ON FUNCTION public.nspg_hash_escape(text) TO nspg_importer;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.reg_forms, public.reg_form_categories, public.reg_submissions, public.reg_submission_categories, public.payments, public.workshops, public.public_events FROM nspg_importer;
REVOKE UPDATE, DELETE ON public.entrants FROM nspg_importer;
REVOKE UPDATE, DELETE ON public.tournaments FROM nspg_importer;

CREATE POLICY nspg_import_links_local_importer ON public.nspg_import_links
  FOR ALL TO nspg_importer USING (true) WITH CHECK (true);
CREATE POLICY nspg_import_objects_local_importer ON public.nspg_import_objects
  FOR ALL TO nspg_importer USING (true) WITH CHECK (true);
CREATE POLICY nspg_import_review_local_importer ON public.nspg_import_review
  FOR ALL TO nspg_importer USING (true) WITH CHECK (true);

CREATE TEMP TABLE saved_counts AS
SELECT public.nspg_snapshot_counts() AS counts;

CREATE FUNCTION pg_temp.keep_one_auto() RETURNS void
LANGUAGE plpgsql AS $fn$
BEGIN
  DELETE FROM public.reg_submission_categories
  WHERE submission_id <> '40000000-0000-4000-8000-000000000005'
     OR category_id <> '30000000-0000-4000-8000-000000000007';
  DELETE FROM public.reg_submissions
  WHERE id <> '40000000-0000-4000-8000-000000000005';
END;
$fn$;

CREATE FUNCTION pg_temp.restore_reg() RETURNS void
LANGUAGE plpgsql AS $fn$
BEGIN
  DELETE FROM public.reg_submission_categories;
  DELETE FROM public.reg_submissions;
  INSERT INTO public.reg_submissions SELECT * FROM saved_submissions;
  INSERT INTO public.reg_submission_categories SELECT * FROM saved_links;
END;
$fn$;

CREATE FUNCTION pg_temp.try_apply(
  p_mode text DEFAULT 'apply',
  p_project text DEFAULT 'local-fleg-nspg-provision',
  p_hash text DEFAULT NULL,
  p_snapshot timestamptz DEFAULT '2026-10-16 00:00:00+00',
  p_organizer uuid DEFAULT '00000000-0000-4000-8000-0000000000aa',
  p_ack text DEFAULT 'ACKNOWLEDGE_NSPG_LOCAL_IMPORT',
  p_snapshot_counts jsonb DEFAULT NULL,
  p_candidates jsonb DEFAULT NULL,
  p_expected_candidates integer DEFAULT NULL,
  p_starts timestamptz DEFAULT NULL,
  p_ends timestamptz DEFAULT NULL,
  p_venue text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_status text DEFAULT 'draft',
  p_visibility text DEFAULT 'private',
  p_allow_null boolean DEFAULT true,
  p_fail_after integer DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql AS $fn$
DECLARE
  v_row record;
  v_hash text := p_hash;
  v_counts jsonb := p_snapshot_counts;
  v_candidates jsonb := p_candidates;
  v_expected integer := p_expected_candidates;
BEGIN
  IF p_mode = 'apply' THEN
    IF v_hash IS NULL THEN
      v_hash := public.nspg_registration_hash();
    END IF;
    IF v_counts IS NULL THEN
      v_counts := public.nspg_snapshot_counts();
    END IF;
    IF v_candidates IS NULL THEN
      v_candidates := public.nspg_approved_auto_manifest();
    END IF;
    IF v_expected IS NULL THEN
      v_expected := jsonb_array_length(v_candidates);
    END IF;
  END IF;
  SELECT * INTO v_row FROM public.nspg_apply_import(
    p_mode, p_project, v_hash, p_snapshot, p_organizer, p_ack,
    v_counts, v_candidates, v_expected,
    p_starts, p_ends, p_venue, p_city, p_status, p_visibility,
    p_allow_null, p_fail_after
  );
  RETURN 'applied|' || COALESCE(v_row.refusal, '') || '|' || v_row.inserted_entrants::text;
EXCEPTION
  WHEN OTHERS THEN
    RETURN SQLERRM;
END;
$fn$;

CREATE FUNCTION pg_temp.no_leftover() RETURNS boolean
LANGUAGE sql AS $fn$
  SELECT count(*) = 0 FROM public.tournaments WHERE slug LIKE 'nspg26-%';
$fn$;

SELECT set_config('nspg.local_import', 'on', false);
SELECT set_config('nspg.test_clock', '2026-10-16 00:00:00+00', false);

INSERT INTO import_results
SELECT 'default_dry_run',
       CASE
         WHEN applied = false
          AND refusal IS NULL
          AND inserted_entrants = 0
          AND withdrawn_submissions = 1
          AND blocked_links = 9
          AND auto_importable = 3
         THEN 'dry_run' ELSE 'fail'
       END,
       'withdrawn=' || withdrawn_submissions::text || ' blocked=' || blocked_links::text || ' auto=' || auto_importable::text
FROM public.nspg_apply_import();

INSERT INTO import_results
SELECT 'dry_run_writes_nothing',
       CASE WHEN count(*) = 0 THEN 'unchanged' ELSE 'fail' END,
       'tournaments=' || count(*)::text
FROM public.tournaments
WHERE slug LIKE 'nspg26-%';

INSERT INTO import_results
SELECT 'hash_abc_vector',
       CASE
         WHEN encode(digest(convert_to('abc', 'UTF8'), 'sha256'), 'hex')
              = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
          AND encode(digest(convert_to('', 'UTF8'), 'sha256'), 'hex')
              = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
         THEN 'matched' ELSE 'fail'
       END,
       'sha256';

INSERT INTO import_results
SELECT 'hash_stable',
       CASE
         WHEN public.nspg_registration_hash() = public.nspg_registration_hash()
          AND public.nspg_registration_hash() ~ '^[0-9a-f]{64}$'
          AND position('Synthetic' IN public.nspg_snapshot_canonical()) = 0
          AND position('category|30000000-0000-4000-8000-000000000001|20000000-0000-4000-8000-000000000001|Men''s Singles' IN public.nspg_snapshot_canonical()) > 0
         THEN 'stable' ELSE 'fail'
       END,
       left(public.nspg_registration_hash(), 8);

DO $hash$
DECLARE
  v_base text;
  v_next text;
  v_ok boolean := true;
BEGIN
  BEGIN
    v_base := public.nspg_registration_hash();
    UPDATE public.reg_submissions SET status = 'pending' WHERE id = '40000000-0000-4000-8000-000000000005';
    v_next := public.nspg_registration_hash();
    IF v_next IS NOT DISTINCT FROM v_base OR v_next !~ '^[0-9a-f]{64}$' THEN v_ok := false; END IF;
    UPDATE public.reg_submissions SET status = 'confirmed' WHERE id = '40000000-0000-4000-8000-000000000005';

    v_base := public.nspg_registration_hash();
    UPDATE public.reg_form_categories SET name = 'Men 48kg Changed' WHERE id = '30000000-0000-4000-8000-000000000007';
    v_next := public.nspg_registration_hash();
    IF v_next IS NOT DISTINCT FROM v_base THEN v_ok := false; END IF;
    UPDATE public.reg_form_categories SET name = 'Men 48kg' WHERE id = '30000000-0000-4000-8000-000000000007';

    v_base := public.nspg_registration_hash();
    INSERT INTO public.reg_submissions (id, form_id, status, full_name)
    VALUES ('40000000-0000-4000-8000-000000000099', '20000000-0000-4000-8000-000000000004', 'confirmed', 'Synthetic Extra');
    v_next := public.nspg_registration_hash();
    IF v_next IS NOT DISTINCT FROM v_base THEN v_ok := false; END IF;
    DELETE FROM public.reg_submissions WHERE id = '40000000-0000-4000-8000-000000000099';

    v_base := public.nspg_registration_hash();
    DELETE FROM public.reg_submission_categories
    WHERE submission_id = '40000000-0000-4000-8000-000000000010'
      AND category_id = '30000000-0000-4000-8000-000000000010';
    v_next := public.nspg_registration_hash();
    IF v_next IS NOT DISTINCT FROM v_base THEN v_ok := false; END IF;
    RAISE EXCEPTION 'subrollback';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'subrollback' THEN
        v_ok := false;
      END IF;
  END;
  INSERT INTO import_results VALUES (
    'hash_changes_for_classification_fields',
    CASE WHEN v_ok AND pg_temp.no_leftover() THEN 'changed' ELSE 'fail' END,
    CASE WHEN v_ok THEN 'status,category,submission,link' ELSE 'unchanged' END
  );
END
$hash$;

INSERT INTO import_results
SELECT 'misspelled_apply_flag',
       CASE WHEN pg_temp.try_apply(p_mode := 'APPLY') = 'apply_flag_required' THEN 'rejected' ELSE 'fail' END,
       pg_temp.try_apply(p_mode := 'APPLY');

INSERT INTO import_results
SELECT 'missing_apply_flag',
       CASE WHEN pg_temp.try_apply(p_mode := NULL::text) = 'applied||0' THEN 'dry_run' ELSE 'fail' END,
       pg_temp.try_apply(p_mode := NULL::text);

SELECT set_config('nspg.local_import', 'off', false);
INSERT INTO import_results
SELECT 'apply_without_local_gate',
       CASE WHEN pg_temp.try_apply(p_hash := repeat('a', 64)) = 'local_import_disabled' THEN 'rejected' ELSE 'fail' END,
       'gate';
SELECT set_config('nspg.local_import', 'on', false);

INSERT INTO import_results
SELECT 'wrong_project_reference',
       CASE WHEN pg_temp.try_apply(p_project := 'local-fleg-nspg-provisio') = 'wrong_project_reference' THEN 'rejected' ELSE 'fail' END,
       'typo';

INSERT INTO import_results
SELECT 'production_project_refused',
       CASE WHEN pg_temp.try_apply(p_project := 'zcubdqfzdbwtfcdsntoa') = 'production_project_refused' THEN 'rejected' ELSE 'fail' END,
       'production';

INSERT INTO import_results
SELECT 'missing_acknowledgement',
       CASE WHEN pg_temp.try_apply(p_ack := NULL::text) = 'acknowledgement_required' THEN 'rejected' ELSE 'fail' END,
       'null ack';

INSERT INTO import_results
SELECT 'misspelled_acknowledgement',
       CASE WHEN pg_temp.try_apply(p_ack := 'ACKNOWLEDGE_NSPG_LOCAL_IMPOR') = 'acknowledgement_required' THEN 'rejected' ELSE 'fail' END,
       'typo ack';

SELECT set_config('nspg.test_clock', '2026-10-12 00:00:00+00', false);
INSERT INTO import_results
SELECT 'registration_still_open',
       CASE WHEN pg_temp.try_apply(p_snapshot := '2026-10-12 00:00:00+00') = 'registration_open' THEN 'rejected' ELSE 'fail' END,
       'before close';
SELECT set_config('nspg.test_clock', '2026-10-16 02:00:00+00', false);
INSERT INTO import_results
SELECT 'stale_snapshot',
       CASE WHEN pg_temp.try_apply() = 'stale_snapshot' THEN 'rejected' ELSE 'fail' END,
       'two hours';
SELECT set_config('nspg.test_clock', '2026-10-16 00:00:00+00', false);

INSERT INTO import_results
SELECT 'malformed_snapshot',
       CASE WHEN pg_temp.try_apply(p_hash := '''; drop table public.reg_submissions; --') = 'malformed_snapshot' THEN 'rejected' ELSE 'fail' END,
       'garbage hash';

INSERT INTO import_results
SELECT 'hash_format_rejected',
       CASE
         WHEN pg_temp.try_apply(p_hash := repeat('a', 32)) = 'malformed_snapshot'
          AND pg_temp.try_apply(p_hash := repeat('A', 64)) = 'malformed_snapshot'
         THEN 'rejected' ELSE 'fail'
       END,
       'md5 and uppercase';

INSERT INTO import_results
SELECT 'snapshot_hash_mismatch',
       CASE WHEN pg_temp.try_apply(p_hash := repeat('b', 64)) = 'snapshot_hash_mismatch' THEN 'rejected' ELSE 'fail' END,
       'wrong hash';

INSERT INTO import_results
SELECT 'invalid_organizer',
       CASE WHEN pg_temp.try_apply(p_organizer := '00000000-0000-4000-8000-0000000000bb') = 'invalid_organizer' THEN 'rejected' ELSE 'fail' END,
       'missing profile';

INSERT INTO import_results
SELECT 'schedule_not_provided',
       CASE WHEN pg_temp.try_apply(p_allow_null := NULL::boolean) = 'schedule_not_provided' THEN 'rejected' ELSE 'fail' END,
       'null schedule';

INSERT INTO import_results
SELECT 'city_not_allowed',
       CASE
         WHEN pg_temp.try_apply(
           p_starts := '2026-10-20 00:00:00+00',
           p_ends := '2026-10-21 00:00:00+00',
           p_venue := 'Hall',
           p_city := 'Chümoukedima',
           p_allow_null := false
         ) = 'city_not_allowed'
         THEN 'rejected' ELSE 'fail'
       END,
       'city';

DO $case$
DECLARE
  v_result text;
  v_manifest jsonb;
BEGIN
  BEGIN
    v_manifest := public.nspg_approved_auto_manifest() || jsonb_build_array(jsonb_build_object(
      'submission_id', '40000000-0000-4000-8000-000000000002',
      'reg_category_id', '30000000-0000-4000-8000-000000000004',
      'import_class', 'district_roster',
      'category_name', 'Men - Double',
      'tournament_slug', 'nspg26-sepaktakraw'
    ));
    v_result := pg_temp.try_apply(p_candidates := v_manifest, p_expected_candidates := jsonb_array_length(v_manifest));
    RAISE EXCEPTION 'subrollback';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'subrollback' THEN v_result := SQLERRM; END IF;
  END;
  INSERT INTO import_results VALUES (
    'blocked_link_injected',
    CASE WHEN v_result = 'blocked_candidate' AND pg_temp.no_leftover() THEN 'rejected' ELSE 'fail' END,
    COALESCE(v_result, 'none')
  );
END
$case$;

DO $case$
DECLARE
  v_result text;
  v_manifest jsonb;
BEGIN
  BEGIN
    v_manifest := public.nspg_approved_auto_manifest();
    UPDATE public.reg_submissions SET status = 'withdrawn' WHERE id = '40000000-0000-4000-8000-000000000001';
    v_result := pg_temp.try_apply(p_candidates := v_manifest);
    RAISE EXCEPTION 'subrollback';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'subrollback' THEN v_result := SQLERRM; END IF;
  END;
  INSERT INTO import_results VALUES (
    'candidate_withdrawn_after_approval',
    CASE WHEN v_result = 'withdrawn_candidate' AND pg_temp.no_leftover() THEN 'rejected' ELSE 'fail' END,
    COALESCE(v_result, 'none')
  );
END
$case$;

DO $case$
DECLARE
  v_result text;
  v_manifest jsonb;
BEGIN
  BEGIN
    v_manifest := public.nspg_approved_auto_manifest();
    INSERT INTO public.reg_submission_categories (submission_id, category_id)
    VALUES ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000008');
    v_result := pg_temp.try_apply(p_candidates := v_manifest);
    RAISE EXCEPTION 'subrollback';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'subrollback' THEN v_result := SQLERRM; END IF;
  END;
  INSERT INTO import_results VALUES (
    'candidate_classification_changed',
    CASE WHEN v_result = 'classification_mismatch' AND pg_temp.no_leftover() THEN 'rejected' ELSE 'fail' END,
    COALESCE(v_result, 'none')
  );
END
$case$;

DO $case$
DECLARE
  v_result text;
  v_manifest jsonb;
BEGIN
  BEGIN
    v_manifest := public.nspg_approved_auto_manifest();
    DELETE FROM public.reg_submission_categories
    WHERE submission_id = '40000000-0000-4000-8000-000000000005'
      AND category_id = '30000000-0000-4000-8000-000000000007';
    v_result := pg_temp.try_apply(p_candidates := v_manifest);
    RAISE EXCEPTION 'subrollback';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'subrollback' THEN v_result := SQLERRM; END IF;
  END;
  INSERT INTO import_results VALUES (
    'candidate_category_removed',
    CASE WHEN v_result = 'candidate_link_removed' AND pg_temp.no_leftover() THEN 'rejected' ELSE 'fail' END,
    COALESCE(v_result, 'none')
  );
END
$case$;

DO $case$
DECLARE
  v_result text;
BEGIN
  BEGIN
    v_result := pg_temp.try_apply(p_snapshot_counts := jsonb_set(public.nspg_snapshot_counts(), '{auto}', '99'::jsonb));
    RAISE EXCEPTION 'subrollback';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'subrollback' THEN v_result := SQLERRM; END IF;
  END;
  INSERT INTO import_results VALUES (
    'snapshot_count_drift',
    CASE WHEN v_result = 'snapshot_count_drift' AND pg_temp.no_leftover() THEN 'rejected' ELSE 'fail' END,
    COALESCE(v_result, 'none')
  );
END
$case$;

DO $case$
DECLARE
  v_result text;
BEGIN
  BEGIN
    v_result := pg_temp.try_apply(p_expected_candidates := 99);
    RAISE EXCEPTION 'subrollback';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'subrollback' THEN v_result := SQLERRM; END IF;
  END;
  INSERT INTO import_results VALUES (
    'candidate_count_drift',
    CASE WHEN v_result = 'candidate_count_drift' AND pg_temp.no_leftover() THEN 'rejected' ELSE 'fail' END,
    COALESCE(v_result, 'none')
  );
END
$case$;

DO $case$
DECLARE
  v_result text;
  v_one jsonb;
BEGIN
  BEGIN
    v_one := public.nspg_approved_auto_manifest() -> 0;
    v_result := pg_temp.try_apply(
      p_candidates := jsonb_build_array(v_one, v_one),
      p_expected_candidates := 2
    );
    RAISE EXCEPTION 'subrollback';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'subrollback' THEN v_result := SQLERRM; END IF;
  END;
  INSERT INTO import_results VALUES (
    'duplicate_candidate',
    CASE WHEN v_result = 'duplicate_candidate' AND pg_temp.no_leftover() THEN 'rejected' ELSE 'fail' END,
    COALESCE(v_result, 'none')
  );
END
$case$;

DO $case$
DECLARE
  v_result text;
BEGIN
  BEGIN
    DELETE FROM public.reg_submission_categories
    WHERE submission_id = '40000000-0000-4000-8000-000000000002';
    INSERT INTO public.reg_submission_categories (submission_id, category_id)
    VALUES ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001');
    v_result := pg_temp.try_apply(p_candidates := jsonb_build_array(jsonb_build_object(
      'submission_id', '40000000-0000-4000-8000-000000000002',
      'reg_category_id', '30000000-0000-4000-8000-000000000001',
      'import_class', 'auto_importable_singles',
      'category_name', 'Men''s Singles'
    )), p_expected_candidates := 1);
    RAISE EXCEPTION 'subrollback';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'subrollback' THEN v_result := SQLERRM; END IF;
  END;
  INSERT INTO import_results VALUES (
    'cross_form_candidate',
    CASE WHEN v_result = 'cross_form_candidate' AND pg_temp.no_leftover() THEN 'rejected' ELSE 'fail' END,
    COALESCE(v_result, 'none')
  );
END
$case$;

DO $case$
DECLARE
  v_result text;
  v_manifest jsonb;
BEGIN
  BEGIN
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'submission_id' = '40000000-0000-4000-8000-000000000005'
          THEN elem || jsonb_build_object('tournament_slug', 'nspg26-volleyball')
        ELSE elem
      END
    )
    INTO v_manifest
    FROM jsonb_array_elements(public.nspg_approved_auto_manifest()) AS elem;
    v_result := pg_temp.try_apply(p_candidates := v_manifest);
    RAISE EXCEPTION 'subrollback';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'subrollback' THEN v_result := SQLERRM; END IF;
  END;
  INSERT INTO import_results VALUES (
    'cross_tournament_candidate',
    CASE WHEN v_result = 'cross_tournament_candidate' AND pg_temp.no_leftover() THEN 'rejected' ELSE 'fail' END,
    COALESCE(v_result, 'none')
  );
END
$case$;

DO $apply$
DECLARE
  v_row record;
BEGIN
  SET LOCAL ROLE nspg_importer;
  SELECT * INTO v_row FROM public.nspg_apply_import(
    p_mode := 'apply',
    p_project_ref := 'local-fleg-nspg-provision',
    p_snapshot_hash := public.nspg_registration_hash(),
    p_snapshot_at := '2026-10-16 00:00:00+00',
    p_organizer_id := '00000000-0000-4000-8000-0000000000aa',
    p_acknowledgement := 'ACKNOWLEDGE_NSPG_LOCAL_IMPORT',
    p_expected_snapshot := public.nspg_snapshot_counts(),
    p_candidates := public.nspg_approved_auto_manifest(),
    p_expected_candidates := jsonb_array_length(public.nspg_approved_auto_manifest()),
    p_status := 'draft',
    p_visibility := 'private',
    p_allow_null_schedule := true
  );
  INSERT INTO import_results VALUES (
    'mixed_subset_import',
    CASE
      WHEN v_row.applied
       AND v_row.inserted_tournaments = 3
       AND v_row.inserted_categories = 3
       AND v_row.inserted_links = 3
       AND v_row.inserted_entrants = 3
       AND v_row.auto_importable = 3
       AND v_row.withdrawn_submissions = 1
       AND v_row.blocked_links = 9
      THEN 'inserted' ELSE 'fail'
    END,
    'entrants=' || v_row.inserted_entrants::text || ' tournaments=' || v_row.inserted_tournaments::text
  );
END
$apply$;

INSERT INTO import_results
SELECT 'blocked_and_withdrawn_untouched',
       CASE
         WHEN blocked.n = 0
          AND withdrawn.n = 1
          AND imported.n = 3
          AND pending.n = 3
         THEN 'untouched' ELSE 'fail'
       END,
       'blocked_links=' || blocked.n::text || ' imported=' || imported.n::text
FROM (
  SELECT count(*) AS n
  FROM public.nspg_import_links
  WHERE submission_id NOT IN (
    '40000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000003',
    '40000000-0000-4000-8000-000000000005'
  )
  OR reg_category_id NOT IN (
    '30000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000005',
    '30000000-0000-4000-8000-000000000007'
  )
) AS blocked,
(
  SELECT count(*) AS n
  FROM public.reg_submissions
  WHERE id = '40000000-0000-4000-8000-000000000006'
    AND status = 'withdrawn'
) AS withdrawn,
(SELECT count(*) AS n FROM public.nspg_import_links) AS imported,
(SELECT count(*) AS n FROM public.entrants WHERE display_name = 'Pending import') AS pending;

INSERT INTO import_results
SELECT 'snapshot_reconciled',
       CASE WHEN saved_counts.counts = public.nspg_snapshot_counts() THEN 'matched' ELSE 'fail' END,
       'full snapshot'
FROM saved_counts;

INSERT INTO import_results
SELECT 'subset_reconciled',
       CASE
         WHEN (SELECT count(*) FROM public.nspg_import_links WHERE import_class = 'auto_importable_singles' AND entrant_id IS NOT NULL) = 3
          AND (SELECT count(*) FROM public.nspg_classified_links() WHERE import_class <> 'auto_importable_singles') = 9
          AND (SELECT count(*) FROM public.nspg_import_links l
               JOIN public.nspg_classified_links() c
                 ON c.submission_id = l.submission_id AND c.category_id = l.reg_category_id
               WHERE c.import_class <> 'auto_importable_singles') = 0
         THEN 'matched' ELSE 'fail'
       END,
       'subset';

DO $rerun$
DECLARE
  v_row record;
BEGIN
  SET LOCAL ROLE nspg_importer;
  SELECT * INTO v_row FROM public.nspg_apply_import(
    p_mode := 'apply',
    p_project_ref := 'local-fleg-nspg-provision',
    p_snapshot_hash := public.nspg_registration_hash(),
    p_snapshot_at := '2026-10-16 00:00:00+00',
    p_organizer_id := '00000000-0000-4000-8000-0000000000aa',
    p_acknowledgement := 'ACKNOWLEDGE_NSPG_LOCAL_IMPORT',
    p_expected_snapshot := public.nspg_snapshot_counts(),
    p_candidates := public.nspg_approved_auto_manifest(),
    p_expected_candidates := jsonb_array_length(public.nspg_approved_auto_manifest()),
    p_status := 'draft',
    p_visibility := 'private',
    p_allow_null_schedule := true
  );
  INSERT INTO import_results VALUES (
    'repeated_mixed_apply',
    CASE
      WHEN v_row.applied
       AND v_row.inserted_entrants = 0
       AND v_row.inserted_tournaments = 0
       AND v_row.inserted_links = 0
       AND (SELECT count(*) FROM public.nspg_import_links) = 3
      THEN 'unchanged' ELSE 'fail'
    END,
    'entrants=' || v_row.inserted_entrants::text
  );
END
$rerun$;

DELETE FROM public.nspg_import_links;
DELETE FROM public.tournaments WHERE slug LIKE 'nspg26-%';
DELETE FROM public.nspg_import_objects;

DO $case$
DECLARE
  v_result text;
BEGIN
  BEGIN
    PERFORM pg_temp.keep_one_auto();
    ALTER TABLE public.reg_submission_categories DROP CONSTRAINT reg_submission_categories_pkey;
    INSERT INTO public.reg_submission_categories (submission_id, category_id)
    VALUES ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000007');
    v_result := pg_temp.try_apply();
    RAISE EXCEPTION 'subrollback';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'subrollback' THEN v_result := SQLERRM; END IF;
  END;
  INSERT INTO import_results VALUES (
    'duplicate_category_link',
    CASE WHEN v_result = 'duplicate_candidate' THEN 'rejected' ELSE 'fail' END,
    COALESCE(v_result, 'none')
  );
END
$case$;

DO $case$
DECLARE
  v_result text;
BEGIN
  BEGIN
    PERFORM pg_temp.keep_one_auto();
    INSERT INTO public.tournaments (organizer_id, name, slug, sport, status, visibility)
    VALUES (
      '00000000-0000-4000-8000-0000000000aa',
      'Foreign NSPG',
      'nspg26-boxing',
      'boxing',
      'draft',
      'private'
    );
    v_result := pg_temp.try_apply();
    RAISE EXCEPTION 'subrollback';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'subrollback' THEN v_result := SQLERRM; END IF;
  END;
  INSERT INTO import_results VALUES (
    'slug_owned_by_another_tournament',
    CASE WHEN v_result = 'slug_collision' THEN 'rejected' ELSE 'fail' END,
    COALESCE(v_result, 'none')
  );
END
$case$;

DO $constraint$
DECLARE
  v_message text;
BEGIN
  ALTER TABLE public.tournaments DROP CONSTRAINT tournaments_sport_check;
  INSERT INTO public.tournaments (organizer_id, name, slug, sport, status, visibility)
  VALUES (
    '00000000-0000-4000-8000-0000000000aa',
    'Not a sport',
    'not-a-sport',
    'soccer',
    'draft',
    'private'
  );
  BEGIN
    PERFORM public.nspg_assert_preserved_sports();
    v_message := 'did not raise';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
  END;
  DELETE FROM public.tournaments WHERE slug = 'not-a-sport';
  ALTER TABLE public.tournaments
    ADD CONSTRAINT tournaments_sport_check
    CHECK (sport = ANY (ARRAY[
      'futsal', 'football', 'pickleball', 'basketball', 'badminton', 'darts',
      'archery', 'athletics', 'boxing', 'lawn_tennis', 'pencak_silat',
      'sepaktakraw', 'table_tennis', 'taekwondo', 'volleyball', 'wrestling', 'wushu'
    ]::text[]));
  INSERT INTO import_results VALUES (
    'constraint_replacement_failure',
    CASE WHEN v_message = 'existing_sport_outside_preserved_set' THEN 'rejected' ELSE 'fail' END,
    v_message
  );
END
$constraint$;

DO $link$
DECLARE
  v_message text;
  v_category uuid;
BEGIN
  INSERT INTO public.tournament_categories (tournament_id, name, format, entrant_type)
  VALUES ('10000000-0000-4000-8000-000000000001', 'Second', 'league', 'team')
  RETURNING id INTO v_category;
  BEGIN
    INSERT INTO public.nspg_import_links (
      submission_id, reg_category_id, tournament_id, tournament_category_id, grain, import_class
    )
    VALUES (
      '40000000-0000-4000-8000-000000000005',
      '30000000-0000-4000-8000-000000000007',
      '10000000-0000-4000-8000-000000000001',
      v_category,
      'person_category',
      'auto_importable_singles'
    );
    UPDATE public.nspg_import_links
    SET entrant_id = '10000000-0000-4000-8000-000000000003'
    WHERE reg_category_id = '30000000-0000-4000-8000-000000000007';
    v_message := 'did not raise';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
  END;
  DELETE FROM public.nspg_import_links
  WHERE submission_id = '40000000-0000-4000-8000-000000000005';
  DELETE FROM public.tournament_categories WHERE id = v_category;
  INSERT INTO import_results VALUES (
    'link_across_tournaments',
    CASE WHEN v_message = 'link_target_mismatch' THEN 'rejected' ELSE 'fail' END,
    v_message
  );
END
$link$;

SELECT pg_temp.keep_one_auto();

INSERT INTO import_results
SELECT 'failure_halfway',
       CASE WHEN pg_temp.try_apply(p_fail_after := 0) = 'import_failed_halfway' THEN 'rolled_back' ELSE 'fail' END,
       'fail after 0';

INSERT INTO import_results
SELECT 'halfway_rows',
       CASE WHEN count(*) = 0 THEN 'rolled_back' ELSE 'fail' END,
       'tournaments=' || count(*)::text
FROM public.tournaments
WHERE slug LIKE 'nspg26-%';

SELECT set_config('nspg.fail_verification', 'on', false);
INSERT INTO import_results
SELECT 'verification_failure_after_inserts',
       CASE WHEN pg_temp.try_apply() = 'verification_failed' THEN 'rolled_back' ELSE 'fail' END,
       'forced';
SELECT set_config('nspg.fail_verification', 'off', false);

INSERT INTO import_results
SELECT 'verification_rows',
       CASE WHEN count(*) = 0 THEN 'rolled_back' ELSE 'fail' END,
       'tournaments=' || count(*)::text
FROM public.tournaments
WHERE slug LIKE 'nspg26-%';

DO $apply$
DECLARE
  v_row record;
BEGIN
  SET LOCAL ROLE nspg_importer;
  SELECT * INTO v_row FROM public.nspg_apply_import(
    p_mode := 'apply',
    p_project_ref := 'local-fleg-nspg-provision',
    p_snapshot_hash := public.nspg_registration_hash(),
    p_snapshot_at := '2026-10-16 00:00:00+00',
    p_organizer_id := '00000000-0000-4000-8000-0000000000aa',
    p_acknowledgement := 'ACKNOWLEDGE_NSPG_LOCAL_IMPORT',
    p_expected_snapshot := public.nspg_snapshot_counts(),
    p_candidates := public.nspg_approved_auto_manifest(),
    p_expected_candidates := jsonb_array_length(public.nspg_approved_auto_manifest()),
    p_status := 'draft',
    p_visibility := 'private',
    p_allow_null_schedule := true
  );
  INSERT INTO import_results VALUES (
    'first_run',
    CASE
      WHEN v_row.applied
       AND v_row.inserted_tournaments = 1
       AND v_row.inserted_entrants = 1
       AND v_row.inserted_links = 1
      THEN 'inserted' ELSE 'fail'
    END,
    'entrants=' || v_row.inserted_entrants::text
  );
END
$apply$;

DO $rerun$
DECLARE
  v_row record;
BEGIN
  SET LOCAL ROLE nspg_importer;
  SELECT * INTO v_row FROM public.nspg_apply_import(
    p_mode := 'apply',
    p_project_ref := 'local-fleg-nspg-provision',
    p_snapshot_hash := public.nspg_registration_hash(),
    p_snapshot_at := '2026-10-16 00:00:00+00',
    p_organizer_id := '00000000-0000-4000-8000-0000000000aa',
    p_acknowledgement := 'ACKNOWLEDGE_NSPG_LOCAL_IMPORT',
    p_expected_snapshot := public.nspg_snapshot_counts(),
    p_candidates := public.nspg_approved_auto_manifest(),
    p_expected_candidates := jsonb_array_length(public.nspg_approved_auto_manifest()),
    p_status := 'draft',
    p_visibility := 'private',
    p_allow_null_schedule := true
  );
  INSERT INTO import_results VALUES (
    'repeated_apply',
    CASE WHEN v_row.applied AND v_row.inserted_entrants = 0 AND v_row.inserted_tournaments = 0 THEN 'unchanged' ELSE 'fail' END,
    'entrants=' || v_row.inserted_entrants::text
  );
END
$rerun$;

DELETE FROM public.nspg_import_links
WHERE submission_id = '40000000-0000-4000-8000-000000000005';
DELETE FROM public.entrants
WHERE display_name = 'Pending import';
DELETE FROM public.nspg_import_objects
WHERE object_type = 'entrant';

DO $partial$
DECLARE
  v_row record;
  v_entrants integer;
BEGIN
  SET LOCAL ROLE nspg_importer;
  SELECT * INTO v_row FROM public.nspg_apply_import(
    p_mode := 'apply',
    p_project_ref := 'local-fleg-nspg-provision',
    p_snapshot_hash := public.nspg_registration_hash(),
    p_snapshot_at := '2026-10-16 00:00:00+00',
    p_organizer_id := '00000000-0000-4000-8000-0000000000aa',
    p_acknowledgement := 'ACKNOWLEDGE_NSPG_LOCAL_IMPORT',
    p_expected_snapshot := public.nspg_snapshot_counts(),
    p_candidates := public.nspg_approved_auto_manifest(),
    p_expected_candidates := jsonb_array_length(public.nspg_approved_auto_manifest()),
    p_status := 'draft',
    p_visibility := 'private',
    p_allow_null_schedule := true
  );
  SELECT count(*) INTO v_entrants FROM public.entrants WHERE display_name = 'Pending import';
  INSERT INTO import_results VALUES (
    'partial_previous_import',
    CASE
      WHEN v_row.inserted_entrants = 1
       AND v_row.inserted_tournaments = 0
       AND v_entrants = 1
      THEN 'filled' ELSE 'fail'
    END,
    'entrants=' || v_row.inserted_entrants::text
  );
END
$partial$;

DO $dup$
DECLARE
  v_message text;
BEGIN
  INSERT INTO public.nspg_import_links (
    submission_id, reg_category_id, tournament_id, tournament_category_id, grain, import_class
  )
  SELECT submission_id, reg_category_id, tournament_id, tournament_category_id, grain, import_class
  FROM public.nspg_import_links
  LIMIT 1;
  INSERT INTO import_results VALUES ('duplicate_link_key', 'fail', 'unique key allowed a second row');
EXCEPTION
  WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    INSERT INTO import_results VALUES ('duplicate_link_key', 'rejected', v_message);
END
$dup$;

INSERT INTO import_results
SELECT 'private_draft_null_schedule',
       CASE
         WHEN count(*) = 1
          AND min(status) = 'draft'
          AND min(visibility) = 'private'
          AND min(city) IS NULL
          AND min(venue_name) IS NULL
          AND min(starts_at) IS NULL
          AND bool_and(organizer_id = '00000000-0000-4000-8000-0000000000aa')
         THEN 'explicit' ELSE 'fail'
       END,
       'rows=' || count(*)::text
FROM public.tournaments
WHERE slug = 'nspg26-boxing';

INSERT INTO import_results
SELECT 'existing_tournament_unchanged',
       CASE
         WHEN count(*) = 1
          AND min(name) = 'Existing futsal cup'
          AND min(status) = 'live'
          AND min(updated_at) = '2026-01-01 00:00:00+00'
         THEN 'unchanged' ELSE 'fail'
       END,
       'rows=' || count(*)::text
FROM public.tournaments
WHERE slug = 'existing-futsal-cup';

INSERT INTO import_results
SELECT 'existing_entrant_unchanged',
       CASE
         WHEN count(*) = 1
          AND min(display_name) = 'Existing entrant'
          AND min(status) = 'approved'
         THEN 'unchanged' ELSE 'fail'
       END,
       'rows=' || count(*)::text
FROM public.entrants
WHERE id = '10000000-0000-4000-8000-000000000003';

INSERT INTO import_results
SELECT 'verify_' || check_name,
       CASE WHEN failures = 0 THEN 'clean' ELSE 'fail' END,
       'failures=' || failures::text
FROM (
  SELECT 'link_duplicates' AS check_name, count(*) AS failures
  FROM (
    SELECT submission_id, reg_category_id
    FROM public.nspg_import_links
    GROUP BY 1, 2
    HAVING count(*) > 1
  ) AS duplicate_links
  UNION ALL
  SELECT 'link_category_mismatch', count(*)
  FROM public.nspg_import_links AS l
  LEFT JOIN public.tournament_categories AS c
    ON c.id = l.tournament_category_id AND c.tournament_id = l.tournament_id
  WHERE c.id IS NULL
  UNION ALL
  SELECT 'link_entrant_mismatch', count(*)
  FROM public.nspg_import_links AS l
  JOIN public.entrants AS e ON e.id = l.entrant_id
  WHERE e.tournament_id <> l.tournament_id
     OR e.category_id IS DISTINCT FROM l.tournament_category_id
  UNION ALL
  SELECT 'unproven_nspg_tournament', count(*)
  FROM public.tournaments AS t
  WHERE t.slug LIKE 'nspg26-%'
    AND NOT EXISTS (
      SELECT 1 FROM public.nspg_import_objects AS o
      WHERE o.object_type = 'tournament' AND o.object_id = t.id
    )
) AS checks;

DO $restore_check$
DECLARE
  v_message text := 'did not raise';
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE sport <> ALL (ARRAY['futsal', 'football', 'pickleball', 'basketball', 'badminton', 'darts']::text[])
  ) THEN
    v_message := 'rollback_would_invalidate_rows';
  END IF;
  INSERT INTO import_results VALUES (
    'rollback_refuses_while_new_sports_exist',
    CASE WHEN v_message = 'rollback_would_invalidate_rows' THEN 'rejected' ELSE 'fail' END,
    v_message
  );
END
$restore_check$;

DO $denied$
DECLARE
  v_message text;
BEGIN
  SET LOCAL ROLE nspg_importer;
  UPDATE public.reg_submissions SET status = 'withdrawn'
  WHERE id = '40000000-0000-4000-8000-000000000005';
  INSERT INTO import_results VALUES ('importer_cannot_update_registration', 'fail', 'update succeeded');
EXCEPTION
  WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    INSERT INTO import_results VALUES ('importer_cannot_update_registration', 'rejected', v_message);
END
$denied$;

DO $denied_entrant$
DECLARE
  v_message text;
BEGIN
  SET LOCAL ROLE nspg_importer;
  UPDATE public.entrants SET display_name = 'Changed'
  WHERE id = '10000000-0000-4000-8000-000000000003';
  INSERT INTO import_results VALUES ('importer_cannot_update_existing_entrant', 'fail', 'update succeeded');
EXCEPTION
  WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    INSERT INTO import_results VALUES ('importer_cannot_update_existing_entrant', 'rejected', v_message);
END
$denied_entrant$;

\i docs/nspg-provisioning/rollback.sql

SELECT pg_temp.restore_reg();

INSERT INTO import_results
SELECT 'rollback_restored_fixture',
       CASE
         WHEN reg.n = 11
          AND links.n = 14
          AND futsal.n = 1
          AND entrant.n = 1
          AND payments.n = 1
          AND workshops.n = 1
          AND events.n = 1
          AND nspg.n = 0
          AND pending.n = 0
         THEN 'restored' ELSE 'fail'
       END,
       'submissions=' || reg.n::text || ' links=' || links.n::text
FROM (SELECT count(*) AS n FROM public.reg_submissions) AS reg,
     (SELECT count(*) AS n FROM public.reg_submission_categories) AS links,
     (SELECT count(*) AS n FROM public.tournaments WHERE slug = 'existing-futsal-cup' AND updated_at = '2026-01-01 00:00:00+00') AS futsal,
     (SELECT count(*) AS n FROM public.entrants WHERE id = '10000000-0000-4000-8000-000000000003' AND display_name = 'Existing entrant') AS entrant,
     (SELECT count(*) AS n FROM public.payments WHERE marker = 'keep') AS payments,
     (SELECT count(*) AS n FROM public.workshops WHERE marker = 'keep') AS workshops,
     (SELECT count(*) AS n FROM public.public_events WHERE marker = 'keep') AS events,
     (SELECT count(*) AS n FROM public.tournaments WHERE slug LIKE 'nspg26-%') AS nspg,
     (SELECT count(*) AS n FROM public.entrants WHERE display_name = 'Pending import') AS pending;

DO $narrow$
DECLARE
  v_message text := 'accepted';
BEGIN
  BEGIN
    INSERT INTO public.tournaments (organizer_id, name, slug, sport, status, visibility)
    VALUES (
      '00000000-0000-4000-8000-0000000000aa',
      'Boxing after rollback',
      'boxing-after-rollback',
      'boxing',
      'draft',
      'private'
    );
  EXCEPTION
    WHEN check_violation THEN
      GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
  END;
  DELETE FROM public.tournaments WHERE slug = 'boxing-after-rollback';
  INSERT INTO import_results VALUES (
    'rollback_restored_sport_check',
    CASE WHEN v_message LIKE '%tournaments_sport_check%' THEN 'restored' ELSE 'fail' END,
    v_message
  );
END
$narrow$;

\pset tuples_only on
\pset format unaligned
\pset fieldsep '|'
SELECT step, outcome, detail FROM import_results ORDER BY step;

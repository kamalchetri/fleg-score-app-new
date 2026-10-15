-- NOT APPLIED. Local disposable cluster only.
-- There is no remote execution command in this package.
-- The only accepted project reference is local-fleg-nspg-provision.
-- The production reference zcubdqfzdbwtfcdsntoa is refused.
-- Default mode is dry-run. Apply requires the exact mode text "apply"
-- plus every precondition below. A missing or misspelled mode cannot write.
--
-- Three separate inputs:
--   1. Full registration snapshot. It may contain withdrawn, roster, pair,
--      artistic, qualification, ranked, and multi-weight rows. Their presence
--      is counted and does not, by itself, refuse the import.
--   2. Classification report. nspg_snapshot_counts() is that report.
--   3. Approved candidate manifest. Apply writes only those rows, and only
--      when every row is one confirmed auto_importable_singles link.
-- A blocked or withdrawn row inside the manifest aborts the whole transaction.
-- SECURITY INVOKER. Registration, payments, workshops, public events,
-- and pre-existing tournaments and entrants are never updated or deleted.

SET client_min_messages TO warning;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP FUNCTION IF EXISTS public.nspg_apply_import(
  text, text, text, timestamptz, uuid, text,
  integer, integer, integer,
  timestamptz, timestamptz, text, text, text, text, boolean, integer
);

CREATE OR REPLACE FUNCTION public.nspg_hash_escape(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT replace(
    replace(
      replace(
        replace(COALESCE(p_value, ''), E'\\', E'\\\\'),
        '|',
        E'\\|'
      ),
      E'\r',
      E'\\r'
    ),
    E'\n',
    E'\\n'
  );
$function$;

CREATE OR REPLACE FUNCTION public.nspg_tournament_slug(p_sport text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT CASE p_sport
    WHEN 'archery' THEN 'nspg26-archery'
    WHEN 'athletics' THEN 'nspg26-athletics'
    WHEN 'badminton' THEN 'nspg26-badminton'
    WHEN 'basketball' THEN 'nspg26-basketball'
    WHEN 'boxing' THEN 'nspg26-boxing'
    WHEN 'football' THEN 'nspg26-football'
    WHEN 'lawn_tennis' THEN 'nspg26-lawn-tennis'
    WHEN 'pencak_silat' THEN 'nspg26-pencak-silat'
    WHEN 'sepaktakraw' THEN 'nspg26-sepaktakraw'
    WHEN 'table_tennis' THEN 'nspg26-table-tennis'
    WHEN 'taekwondo' THEN 'nspg26-taekwondo'
    WHEN 'volleyball' THEN 'nspg26-volleyball'
    WHEN 'wrestling' THEN 'nspg26-wrestling'
    WHEN 'wushu' THEN 'nspg26-wushu'
    ELSE NULL
  END;
$function$;

CREATE OR REPLACE FUNCTION public.nspg_import_clock()
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
DECLARE
  v_clock text;
BEGIN
  IF current_setting('nspg.local_import', true) = 'on' THEN
    v_clock := current_setting('nspg.test_clock', true);
    IF v_clock IS NOT NULL AND v_clock <> '' THEN
      RETURN v_clock::timestamptz;
    END IF;
  END IF;
  RETURN clock_timestamp();
END;
$function$;

-- Classification-relevant rows only. Officials are excluded. Personal fields are not read.
CREATE OR REPLACE FUNCTION public.nspg_snapshot_canonical()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT COALESCE(string_agg(line, E'\n' ORDER BY line COLLATE "C"), '')
  FROM (
    SELECT 'form|' || f.id::text || '|' || public.nspg_hash_escape(f.slug) || '|' || public.nspg_hash_escape(f.sport) AS line
    FROM public.reg_forms AS f
    WHERE f.slug ILIKE 'nspg26-%'
      AND f.sport <> 'officials'
    UNION ALL
    SELECT 'category|' || c.id::text || '|' || c.form_id::text || '|' || public.nspg_hash_escape(c.name)
    FROM public.reg_form_categories AS c
    JOIN public.reg_forms AS f ON f.id = c.form_id
    WHERE f.slug ILIKE 'nspg26-%'
      AND f.sport <> 'officials'
    UNION ALL
    SELECT 'submission|' || s.id::text || '|' || s.form_id::text || '|' || public.nspg_hash_escape(s.status)
    FROM public.reg_submissions AS s
    JOIN public.reg_forms AS f ON f.id = s.form_id
    WHERE f.slug ILIKE 'nspg26-%'
      AND f.sport <> 'officials'
    UNION ALL
    SELECT 'link|' || sc.submission_id::text || '|' || sc.category_id::text
    FROM public.reg_submission_categories AS sc
    JOIN public.reg_submissions AS s ON s.id = sc.submission_id
    JOIN public.reg_forms AS f ON f.id = s.form_id
    WHERE f.slug ILIKE 'nspg26-%'
      AND f.sport <> 'officials'
  ) AS lines;
$function$;

CREATE OR REPLACE FUNCTION public.nspg_registration_hash()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT encode(digest(convert_to(public.nspg_snapshot_canonical(), 'UTF8'), 'sha256'), 'hex');
$function$;

CREATE OR REPLACE FUNCTION public.nspg_classified_links()
RETURNS TABLE (
  submission_id uuid,
  form_id uuid,
  sport text,
  status text,
  category_id uuid,
  category_name text,
  category_form_id uuid,
  import_class text,
  cross_form boolean
)
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  WITH competition_forms AS (
    SELECT id, sport
    FROM public.reg_forms
    WHERE slug ILIKE 'nspg26-%'
      AND sport <> 'officials'
  ), raw_links AS (
    SELECT s.id AS submission_id,
           s.form_id,
           f.sport,
           s.status,
           sc.category_id,
           c.name AS category_name,
           c.form_id AS category_form_id,
           (c.id IS NOT NULL AND c.form_id IS DISTINCT FROM s.form_id) AS cross_form
    FROM public.reg_submissions AS s
    JOIN competition_forms AS f ON f.id = s.form_id
    JOIN public.reg_submission_categories AS sc ON sc.submission_id = s.id
    LEFT JOIN public.reg_form_categories AS c ON c.id = sc.category_id
  ), weights AS (
    SELECT submission_id, sport, count(*)::int AS weight_n
    FROM (
      SELECT DISTINCT submission_id, sport, category_id
      FROM raw_links
      WHERE status = 'confirmed'
        AND category_name IS NOT NULL
        AND (
          sport IN ('boxing', 'taekwondo', 'wrestling', 'wushu')
          OR (sport = 'pencak_silat' AND category_name ILIKE '%Tanding%')
        )
    ) AS distinct_weights
    GROUP BY submission_id, sport
  ), classified AS (
    SELECT l.submission_id,
           l.form_id,
           l.sport,
           l.status,
           l.category_id,
           l.category_name,
           l.category_form_id,
           l.cross_form,
           CASE
             WHEN l.status IS DISTINCT FROM 'confirmed' THEN NULL
             WHEN l.category_name IS NULL THEN 'other_unresolved'
             WHEN (l.sport IN ('boxing', 'taekwondo', 'wrestling', 'wushu')
                   OR (l.sport = 'pencak_silat' AND l.category_name ILIKE '%Tanding%'))
                  AND COALESCE(w.weight_n, 0) > 1 THEN 'multi_weight_conflict'
             WHEN (l.sport IN ('boxing', 'taekwondo', 'wrestling', 'wushu')
                   OR (l.sport = 'pencak_silat' AND l.category_name ILIKE '%Tanding%'))
                  AND COALESCE(w.weight_n, 0) = 1 THEN 'auto_importable_singles'
             WHEN l.sport IN ('badminton', 'lawn_tennis', 'table_tennis')
                  AND l.category_name ILIKE '%Singles%' THEN 'auto_importable_singles'
             WHEN l.sport IN ('badminton', 'lawn_tennis', 'table_tennis')
                  AND l.category_name ILIKE '%Doubles%' THEN 'unlinked_pair'
             WHEN l.sport = 'archery' AND l.category_name ILIKE '%Team%' THEN 'district_roster'
             WHEN l.sport = 'archery' AND l.category_name ILIKE '%Olympic Round%' THEN 'pending_qualification'
             WHEN l.sport = 'archery' THEN 'ranked_result'
             WHEN l.sport = 'athletics' AND l.category_name ILIKE '%Relay%' THEN 'district_roster'
             WHEN l.sport = 'athletics' THEN 'ranked_result'
             WHEN l.sport = 'pencak_silat'
                  AND (l.category_name ILIKE '%Tunggal%' OR l.category_name ILIKE '%Solo Creative%')
                  THEN 'ranked_result'
             WHEN l.sport = 'pencak_silat'
                  AND (l.category_name ILIKE '%Ganda%' OR l.category_name ILIKE '%Regu%')
                  THEN 'artistic_ensemble'
             WHEN l.sport IN ('football', 'basketball', 'volleyball', 'sepaktakraw') THEN 'district_roster'
             WHEN l.category_name ILIKE '%Team%' THEN 'district_roster'
             ELSE 'other_unresolved'
           END AS import_class
    FROM raw_links AS l
    LEFT JOIN weights AS w
      ON w.submission_id = l.submission_id
     AND w.sport = l.sport
  )
  SELECT DISTINCT ON (submission_id, category_id)
         submission_id, form_id, sport, status, category_id, category_name,
         category_form_id, import_class, cross_form
  FROM classified
  ORDER BY submission_id, category_id;
$function$;

CREATE OR REPLACE FUNCTION public.nspg_snapshot_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT jsonb_build_object(
    'submissions', (SELECT count(*) FROM public.reg_submissions AS s JOIN public.reg_forms AS f ON f.id = s.form_id WHERE f.slug ILIKE 'nspg26-%' AND f.sport <> 'officials'),
    'links', (SELECT count(*) FROM public.reg_submission_categories AS sc JOIN public.reg_submissions AS s ON s.id = sc.submission_id JOIN public.reg_forms AS f ON f.id = s.form_id WHERE f.slug ILIKE 'nspg26-%' AND f.sport <> 'officials'),
    'withdrawn_submissions', (SELECT count(*) FROM public.reg_submissions AS s JOIN public.reg_forms AS f ON f.id = s.form_id WHERE f.slug ILIKE 'nspg26-%' AND f.sport <> 'officials' AND s.status = 'withdrawn'),
    'withdrawn_links', (SELECT count(*) FROM public.reg_submission_categories AS sc JOIN public.reg_submissions AS s ON s.id = sc.submission_id JOIN public.reg_forms AS f ON f.id = s.form_id WHERE f.slug ILIKE 'nspg26-%' AND f.sport <> 'officials' AND s.status = 'withdrawn'),
    'confirmed_submissions', (SELECT count(DISTINCT submission_id) FROM public.nspg_classified_links() WHERE status = 'confirmed' AND import_class IS NOT NULL),
    'confirmed_links', (SELECT count(*) FROM public.nspg_classified_links() WHERE status = 'confirmed' AND import_class IS NOT NULL),
    'auto', (SELECT count(*) FROM public.nspg_classified_links() WHERE import_class = 'auto_importable_singles'),
    'roster', (SELECT count(*) FROM public.nspg_classified_links() WHERE import_class = 'district_roster'),
    'pairs', (SELECT count(*) FROM public.nspg_classified_links() WHERE import_class = 'unlinked_pair'),
    'artistic', (SELECT count(*) FROM public.nspg_classified_links() WHERE import_class = 'artistic_ensemble'),
    'qualification', (SELECT count(*) FROM public.nspg_classified_links() WHERE import_class = 'pending_qualification'),
    'ranked', (SELECT count(*) FROM public.nspg_classified_links() WHERE import_class = 'ranked_result'),
    'multi_weight', (SELECT count(*) FROM public.nspg_classified_links() WHERE import_class = 'multi_weight_conflict'),
    'unresolved', (SELECT count(*) FROM public.nspg_classified_links() WHERE import_class = 'other_unresolved')
  );
$function$;

CREATE OR REPLACE FUNCTION public.nspg_approved_auto_manifest()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'submission_id', submission_id,
    'reg_category_id', category_id,
    'import_class', import_class,
    'category_name', category_name,
    'tournament_slug', public.nspg_tournament_slug(sport)
  ) ORDER BY submission_id::text COLLATE "C", category_id::text COLLATE "C"), '[]'::jsonb)
  FROM public.nspg_classified_links()
  WHERE import_class = 'auto_importable_singles'
    AND status = 'confirmed'
    AND NOT cross_form;
$function$;

CREATE OR REPLACE FUNCTION public.nspg_apply_import(
  p_mode text DEFAULT 'dry-run',
  p_project_ref text DEFAULT NULL,
  p_snapshot_hash text DEFAULT NULL,
  p_snapshot_at timestamptz DEFAULT NULL,
  p_organizer_id uuid DEFAULT NULL,
  p_acknowledgement text DEFAULT NULL,
  p_expected_snapshot jsonb DEFAULT NULL,
  p_candidates jsonb DEFAULT NULL,
  p_expected_candidates integer DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_venue_name text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_visibility text DEFAULT NULL,
  p_allow_null_schedule boolean DEFAULT NULL,
  p_fail_after integer DEFAULT NULL
)
RETURNS TABLE (
  applied boolean,
  refusal text,
  confirmed_submissions integer,
  confirmed_links integer,
  auto_importable integer,
  inserted_tournaments integer,
  inserted_categories integer,
  inserted_links integer,
  inserted_entrants integer,
  withdrawn_submissions integer,
  blocked_links integer,
  snapshot_submissions integer,
  snapshot_links integer,
  candidate_count integer
)
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_apply boolean := false;
  v_refusal text := NULL;
  v_now timestamptz;
  v_counts jsonb;
  rec record;
  v_tournament uuid;
  v_category uuid;
  v_link uuid;
  v_entrant uuid;
  v_slug text;
  v_submissions integer := 0;
  v_links integer := 0;
  v_confirmed_submissions integer := 0;
  v_confirmed_links integer := 0;
  v_auto integer := 0;
  v_withdrawn integer := 0;
  v_blocked integer := 0;
  v_slug_collision integer := 0;
  v_candidates integer := 0;
  v_tournaments integer := 0;
  v_categories integer := 0;
  v_new_links integer := 0;
  v_entrants integer := 0;
  v_uuid text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  PERFORM set_config('client_min_messages', 'warning', true);
  IF p_mode IS NULL OR p_mode = 'dry-run' THEN
    v_apply := false;
  ELSIF p_mode = 'apply' THEN
    v_apply := true;
  ELSE
    RAISE EXCEPTION 'apply_flag_required';
  END IF;

  IF v_apply THEN
    IF current_setting('nspg.local_import', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'local_import_disabled';
    END IF;
    IF p_project_ref = 'zcubdqfzdbwtfcdsntoa' THEN
      RAISE EXCEPTION 'production_project_refused';
    END IF;
    IF p_project_ref IS DISTINCT FROM 'local-fleg-nspg-provision' THEN
      RAISE EXCEPTION 'wrong_project_reference';
    END IF;
    IF p_acknowledgement IS DISTINCT FROM 'ACKNOWLEDGE_NSPG_LOCAL_IMPORT' THEN
      RAISE EXCEPTION 'acknowledgement_required';
    END IF;

    v_now := public.nspg_import_clock();
    IF p_snapshot_at IS NULL THEN
      RAISE EXCEPTION 'snapshot_required';
    END IF;
    IF v_now < TIMESTAMPTZ '2026-10-15 18:29:00+00' THEN
      RAISE EXCEPTION 'registration_open';
    END IF;
    IF p_snapshot_at < TIMESTAMPTZ '2026-10-15 18:29:00+00'
       OR p_snapshot_at > v_now
       OR v_now - p_snapshot_at > INTERVAL '15 minutes' THEN
      RAISE EXCEPTION 'stale_snapshot';
    END IF;
    IF p_snapshot_hash IS NULL OR p_snapshot_hash !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION 'malformed_snapshot';
    END IF;
    IF p_snapshot_hash IS DISTINCT FROM public.nspg_registration_hash() THEN
      RAISE EXCEPTION 'snapshot_hash_mismatch';
    END IF;
    IF p_organizer_id IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_organizer_id) THEN
      RAISE EXCEPTION 'invalid_organizer';
    END IF;
    IF p_status IS DISTINCT FROM 'draft' OR p_visibility IS DISTINCT FROM 'private' THEN
      RAISE EXCEPTION 'status_not_explicit';
    END IF;
    IF (p_starts_at IS NULL OR p_ends_at IS NULL OR p_venue_name IS NULL OR p_city IS NULL)
       AND p_allow_null_schedule IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'schedule_not_provided';
    END IF;
    IF p_city IS NOT NULL AND p_city <> ALL (ARRAY['kohima', 'dimapur']::text[]) THEN
      RAISE EXCEPTION 'city_not_allowed';
    END IF;

    PERFORM set_config('lock_timeout', '3s', true);
    IF COALESCE(current_setting('nspg.test_statement_timeout', true), '') <> '' THEN
      PERFORM set_config('statement_timeout', current_setting('nspg.test_statement_timeout', true), true);
    ELSE
      PERFORM set_config('statement_timeout', '15s', true);
    END IF;
    IF current_setting('nspg.fail_statement_timeout', true) = 'on' THEN
      PERFORM pg_sleep(2);
    END IF;
    -- Take the tournaments lock before manifest checks so a held lock fails closed.
    PERFORM id FROM public.tournaments LIMIT 1;
  END IF;

  v_counts := public.nspg_snapshot_counts();
  v_submissions := (v_counts->>'submissions')::integer;
  v_links := (v_counts->>'links')::integer;
  v_confirmed_submissions := (v_counts->>'confirmed_submissions')::integer;
  v_confirmed_links := (v_counts->>'confirmed_links')::integer;
  v_auto := (v_counts->>'auto')::integer;
  v_withdrawn := (v_counts->>'withdrawn_submissions')::integer;
  v_blocked := v_confirmed_links - v_auto;

  IF v_apply AND p_candidates IS NULL THEN
    v_refusal := 'manifest_required';
  ELSIF v_apply AND p_expected_snapshot IS NULL THEN
    v_refusal := 'snapshot_counts_required';
  ELSIF v_apply AND p_expected_candidates IS NULL THEN
    v_refusal := 'candidate_counts_required';
  ELSIF p_candidates IS NOT NULL AND jsonb_typeof(p_candidates) IS DISTINCT FROM 'array' THEN
    v_refusal := 'manifest_malformed';
  ELSIF p_candidates IS NOT NULL AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_candidates) AS elem
    WHERE COALESCE(elem->>'submission_id', '') !~* v_uuid
       OR COALESCE(elem->>'reg_category_id', '') !~* v_uuid
       OR elem->>'import_class' IS NULL
       OR elem->>'category_name' IS NULL
  ) THEN
    v_refusal := 'manifest_malformed';
  END IF;

  IF v_refusal IS NULL AND p_candidates IS NOT NULL THEN
    CREATE TEMP TABLE pg_temp.nspg_candidates ON COMMIT DROP AS
    SELECT (elem->>'submission_id')::uuid AS submission_id,
           (elem->>'reg_category_id')::uuid AS reg_category_id,
           elem->>'import_class' AS import_class,
           elem->>'category_name' AS category_name,
           NULLIF(elem->>'tournament_slug', '') AS tournament_slug
    FROM jsonb_array_elements(p_candidates) AS elem;

    SELECT count(*) INTO v_candidates FROM pg_temp.nspg_candidates;

    IF EXISTS (
      SELECT 1 FROM pg_temp.nspg_candidates
      WHERE import_class IS DISTINCT FROM 'auto_importable_singles'
    ) THEN
      v_refusal := 'blocked_candidate';
    ELSIF EXISTS (
      SELECT 1
      FROM pg_temp.nspg_candidates AS c
      JOIN public.reg_submissions AS s ON s.id = c.submission_id
      WHERE s.status = 'withdrawn'
    ) THEN
      v_refusal := 'withdrawn_candidate';
    ELSIF EXISTS (
      SELECT 1
      FROM pg_temp.nspg_candidates AS c
      LEFT JOIN public.reg_submissions AS s ON s.id = c.submission_id
      WHERE s.id IS NULL OR s.status IS DISTINCT FROM 'confirmed'
    ) THEN
      v_refusal := 'candidate_not_confirmed';
    ELSIF EXISTS (
      SELECT 1
      FROM pg_temp.nspg_candidates AS c
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.reg_submission_categories AS sc
        WHERE sc.submission_id = c.submission_id
          AND sc.category_id = c.reg_category_id
      )
    ) THEN
      v_refusal := 'candidate_link_removed';
    ELSIF EXISTS (
      SELECT 1
      FROM pg_temp.nspg_candidates
      GROUP BY submission_id, reg_category_id
      HAVING count(*) > 1
    ) OR EXISTS (
      SELECT 1
      FROM pg_temp.nspg_candidates AS c
      JOIN public.reg_submission_categories AS sc
        ON sc.submission_id = c.submission_id
       AND sc.category_id = c.reg_category_id
      GROUP BY c.submission_id, c.reg_category_id
      HAVING count(*) > 1
    ) THEN
      v_refusal := 'duplicate_candidate';
    ELSIF EXISTS (
      SELECT 1
      FROM pg_temp.nspg_candidates AS c
      JOIN public.reg_submissions AS s ON s.id = c.submission_id
      JOIN public.reg_form_categories AS cat ON cat.id = c.reg_category_id
      WHERE cat.form_id IS DISTINCT FROM s.form_id
    ) THEN
      v_refusal := 'cross_form_candidate';
    ELSIF EXISTS (
      SELECT 1
      FROM pg_temp.nspg_candidates AS c
      JOIN public.reg_submissions AS s ON s.id = c.submission_id
      JOIN public.reg_forms AS f ON f.id = s.form_id
      WHERE c.tournament_slug IS NOT NULL
        AND c.tournament_slug IS DISTINCT FROM public.nspg_tournament_slug(f.sport)
    ) THEN
      v_refusal := 'cross_tournament_candidate';
    ELSIF EXISTS (
      SELECT 1
      FROM pg_temp.nspg_candidates AS c
      JOIN public.reg_form_categories AS cat ON cat.id = c.reg_category_id
      WHERE cat.name IS DISTINCT FROM c.category_name
    ) THEN
      v_refusal := 'candidate_category_changed';
    ELSIF EXISTS (
      SELECT 1
      FROM pg_temp.nspg_candidates AS c
      LEFT JOIN public.nspg_classified_links() AS cl
        ON cl.submission_id = c.submission_id
       AND cl.category_id = c.reg_category_id
       AND cl.status = 'confirmed'
       AND NOT cl.cross_form
      WHERE cl.import_class IS DISTINCT FROM 'auto_importable_singles'
         OR cl.import_class IS DISTINCT FROM c.import_class
    ) THEN
      v_refusal := 'classification_mismatch';
    ELSIF p_expected_snapshot IS NOT NULL AND p_expected_snapshot IS DISTINCT FROM v_counts THEN
      v_refusal := 'snapshot_count_drift';
    ELSIF p_expected_candidates IS NOT NULL AND p_expected_candidates IS DISTINCT FROM v_candidates THEN
      v_refusal := 'candidate_count_drift';
    END IF;
  END IF;

  IF v_refusal IS NULL AND v_apply AND p_expected_snapshot IS DISTINCT FROM v_counts THEN
    v_refusal := 'snapshot_count_drift';
  END IF;

  SELECT count(*) INTO v_slug_collision
  FROM public.tournaments AS t
  WHERE t.slug LIKE 'nspg26-%'
    AND NOT EXISTS (
      SELECT 1
      FROM public.nspg_import_objects AS o
      WHERE o.object_type = 'tournament'
        AND o.object_id = t.id
    );
  IF v_refusal IS NULL AND v_slug_collision > 0 THEN
    v_refusal := 'slug_collision';
  END IF;

  IF NOT v_apply THEN
    RETURN QUERY
    SELECT false, v_refusal, v_confirmed_submissions, v_confirmed_links, v_auto,
           0, 0, 0, 0, v_withdrawn, v_blocked, v_submissions, v_links, v_candidates;
    RETURN;
  END IF;

  IF v_refusal IS NOT NULL THEN
    RAISE EXCEPTION '%', v_refusal;
  END IF;

  FOR rec IN
    SELECT c.submission_id, cl.sport, c.reg_category_id AS category_id, c.category_name
    FROM pg_temp.nspg_candidates AS c
    JOIN public.nspg_classified_links() AS cl
      ON cl.submission_id = c.submission_id
     AND cl.category_id = c.reg_category_id
    ORDER BY c.submission_id, c.reg_category_id
  LOOP
    IF p_fail_after IS NOT NULL AND v_entrants >= p_fail_after THEN
      RAISE EXCEPTION 'import_failed_halfway';
    END IF;

    v_slug := public.nspg_tournament_slug(rec.sport);
    IF v_slug IS NULL THEN
      RAISE EXCEPTION 'unknown_sport';
    END IF;

    SELECT id INTO v_tournament FROM public.tournaments WHERE slug = v_slug;
    IF v_tournament IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.nspg_import_objects
        WHERE object_type = 'tournament' AND object_id = v_tournament
      ) THEN
        RAISE EXCEPTION 'slug_collision';
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.tournaments
        WHERE id = v_tournament AND organizer_id IS DISTINCT FROM p_organizer_id
      ) THEN
        RAISE EXCEPTION 'organizer_mismatch';
      END IF;
    ELSE
      INSERT INTO public.tournaments (
        organizer_id, name, slug, sport, status, visibility,
        venue_name, city, starts_at, ends_at
      )
      VALUES (
        p_organizer_id,
        'NSPG26 ' || rec.sport,
        v_slug,
        rec.sport,
        p_status,
        p_visibility,
        p_venue_name,
        p_city,
        p_starts_at,
        p_ends_at
      )
      RETURNING id INTO v_tournament;
      INSERT INTO public.nspg_import_objects (object_type, object_id)
      VALUES ('tournament', v_tournament);
      v_tournaments := v_tournaments + 1;
    END IF;

    SELECT c.id INTO v_category
    FROM public.tournament_categories AS c
    WHERE c.tournament_id = v_tournament
      AND c.name = rec.category_name;
    IF v_category IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.nspg_import_objects
        WHERE object_type = 'category' AND object_id = v_category
      ) THEN
        RAISE EXCEPTION 'slug_collision';
      END IF;
    ELSE
      INSERT INTO public.tournament_categories (
        tournament_id, name, format, entrant_type, sort_order
      )
      VALUES (v_tournament, rec.category_name, 'knockout', 'singles', 0)
      RETURNING id INTO v_category;
      INSERT INTO public.nspg_import_objects (object_type, object_id)
      VALUES ('category', v_category);
      v_categories := v_categories + 1;
    END IF;

    v_link := NULL;
    INSERT INTO public.nspg_import_links (
      submission_id, reg_category_id, tournament_id, tournament_category_id,
      grain, import_class, block_reason
    )
    VALUES (
      rec.submission_id, rec.category_id, v_tournament, v_category,
      'person_category', 'auto_importable_singles', NULL
    )
    ON CONFLICT (submission_id, reg_category_id) DO NOTHING
    RETURNING id INTO v_link;

    IF v_link IS NULL THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.nspg_import_links AS l
        JOIN public.nspg_import_objects AS o
          ON o.object_type = 'entrant' AND o.object_id = l.entrant_id
        WHERE l.submission_id = rec.submission_id
          AND l.reg_category_id = rec.category_id
          AND l.tournament_id = v_tournament
          AND l.tournament_category_id = v_category
      ) THEN
        RAISE EXCEPTION 'verification_failed';
      END IF;
      CONTINUE;
    END IF;
    v_new_links := v_new_links + 1;

    INSERT INTO public.entrants (tournament_id, category_id, display_name, status)
    VALUES (v_tournament, v_category, 'Pending import', 'pending')
    RETURNING id INTO v_entrant;
    INSERT INTO public.nspg_import_objects (object_type, object_id)
    VALUES ('entrant', v_entrant);
    v_entrants := v_entrants + 1;

    UPDATE public.nspg_import_links
    SET entrant_id = v_entrant
    WHERE id = v_link;
  END LOOP;

  IF current_setting('nspg.local_import', true) = 'on'
     AND current_setting('nspg.fail_verification', true) = 'on' THEN
    RAISE EXCEPTION 'verification_failed';
  END IF;

  IF (SELECT count(*) FROM public.nspg_import_links WHERE entrant_id IS NOT NULL) <> v_candidates
     OR (SELECT count(*) FROM public.nspg_import_links) <> v_candidates
     OR EXISTS (
       SELECT 1
       FROM public.nspg_import_links AS l
       LEFT JOIN public.nspg_classified_links() AS cl
         ON cl.submission_id = l.submission_id
        AND cl.category_id = l.reg_category_id
       WHERE cl.import_class IS DISTINCT FROM 'auto_importable_singles'
          OR cl.status IS DISTINCT FROM 'confirmed'
     )
     OR public.nspg_snapshot_counts() IS DISTINCT FROM v_counts
     OR (SELECT count(*) FROM public.tournaments WHERE slug LIKE 'nspg26-%' AND (status <> 'draft' OR visibility <> 'private')) > 0
     OR EXISTS (
       SELECT 1
       FROM public.tournaments AS t
       WHERE t.slug LIKE 'nspg26-%'
         AND NOT EXISTS (
           SELECT 1 FROM public.nspg_import_objects AS o
           WHERE o.object_type = 'tournament' AND o.object_id = t.id
         )
     ) THEN
    RAISE EXCEPTION 'verification_failed';
  END IF;

  RETURN QUERY
  SELECT true, NULL::text, v_confirmed_submissions, v_confirmed_links, v_auto,
         v_tournaments, v_categories, v_new_links, v_entrants,
         v_withdrawn, v_blocked, v_submissions, v_links, v_candidates;
END;
$function$;

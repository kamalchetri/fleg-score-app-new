-- NSPG district seed, production-safe and intentionally separate from the
-- local-only importer in this directory.
--
-- Scope: confirmed auto-importable singles from Tseminyu, Longleng, Noklak and Peren.
-- The function is not exposed to the app: EXECUTE is revoked from PUBLIC,
-- anon and authenticated. It never updates registration, payment, workshop or
-- public-event rows. It is idempotent through nspg_import_links.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SET lock_timeout = '3s';
SET statement_timeout = '15s';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE sport <> ALL (ARRAY[
      'futsal','football','pickleball','basketball','badminton','darts'
    ]::text[])
  ) THEN
    RAISE EXCEPTION 'existing_sport_outside_preserved_set';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tournaments'::regclass
      AND conname = 'tournaments_sport_check_nspg'
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_sport_check_nspg
      CHECK (sport = ANY (ARRAY[
        'futsal','football','pickleball','basketball','badminton','darts',
        'archery','athletics','boxing','lawn_tennis','pencak_silat',
        'sepaktakraw','table_tennis','taekwondo','volleyball','wrestling','wushu'
      ]::text[])) NOT VALID;
    ALTER TABLE public.tournaments
      VALIDATE CONSTRAINT tournaments_sport_check_nspg;
    ALTER TABLE public.tournaments DROP CONSTRAINT tournaments_sport_check;
    ALTER TABLE public.tournaments
      RENAME CONSTRAINT tournaments_sport_check_nspg TO tournaments_sport_check;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.nspg_import_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.reg_submissions (id),
  reg_category_id uuid NOT NULL REFERENCES public.reg_form_categories (id),
  tournament_id uuid NOT NULL REFERENCES public.tournaments (id),
  tournament_category_id uuid NOT NULL REFERENCES public.tournament_categories (id),
  entrant_id uuid REFERENCES public.entrants (id),
  grain text NOT NULL CHECK (grain = 'person_category'),
  import_class text NOT NULL CHECK (import_class = 'auto_importable_singles'),
  block_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nspg_import_links_one_link UNIQUE (submission_id, reg_category_id),
  CONSTRAINT nspg_import_links_block_reason CHECK (block_reason IS NULL),
  CONSTRAINT nspg_import_links_entrant_only_auto CHECK (entrant_id IS NULL OR import_class = 'auto_importable_singles')
);
CREATE INDEX IF NOT EXISTS nspg_import_links_tournament_id_idx
  ON public.nspg_import_links (tournament_id);

CREATE TABLE IF NOT EXISTS public.nspg_import_objects (
  object_type text NOT NULL CHECK (object_type IN ('tournament','category','entrant')),
  object_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (object_type, object_id)
);

ALTER TABLE public.nspg_import_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nspg_import_objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.nspg_import_links_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tournament_categories c
    WHERE c.id = NEW.tournament_category_id AND c.tournament_id = NEW.tournament_id
  ) THEN
    RAISE EXCEPTION 'link_category_mismatch';
  END IF;
  IF NEW.entrant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.entrants e
    WHERE e.id = NEW.entrant_id
      AND e.tournament_id = NEW.tournament_id
      AND e.category_id = NEW.tournament_category_id
  ) THEN
    RAISE EXCEPTION 'link_target_mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS nspg_import_links_guard ON public.nspg_import_links;
CREATE TRIGGER nspg_import_links_guard
  BEFORE INSERT OR UPDATE ON public.nspg_import_links
  FOR EACH ROW EXECUTE FUNCTION public.nspg_import_links_guard();

CREATE OR REPLACE FUNCTION public.nspg_seed_verified_districts(
  p_apply boolean DEFAULT false,
  p_project_ref text DEFAULT NULL,
  p_acknowledgement text DEFAULT NULL,
  p_organizer_id uuid DEFAULT NULL,
  p_snapshot_hash text DEFAULT NULL
)
RETURNS TABLE(
  district text,
  candidates integer,
  tournaments_created integer,
  categories_created integer,
  links_created integer,
  entrants_created integer,
  snapshot_hash text
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_candidates integer;
  v_tournaments integer := 0;
  v_categories integer := 0;
  v_links integer := 0;
  v_entrants integer := 0;
  v_tournament uuid;
  v_category uuid;
  v_link uuid;
  v_entrant uuid;
  v_hash_after text;
  row_data record;
BEGIN
  IF p_project_ref IS DISTINCT FROM 'zcubdqfzdbwtfcdsntoa' THEN
    RAISE EXCEPTION 'wrong_project_reference';
  END IF;
  IF p_apply AND p_acknowledgement IS DISTINCT FROM 'ACKNOWLEDGE_NSPG_DISTRICT_SEED' THEN
    RAISE EXCEPTION 'acknowledgement_required';
  END IF;
  IF p_apply AND (p_organizer_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_organizer_id)) THEN
    RAISE EXCEPTION 'invalid_organizer';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('fleg:nspg:district-seed', 0));

  CREATE TEMP TABLE pg_temp.nspg_seed_candidates ON COMMIT DROP AS
  WITH raw AS (
    SELECT s.id AS submission_id, s.form_id, s.full_name, s.reg_code,
           f.sport, s.status, sc.category_id, c.name AS category_name,
           lower(trim(s.answers->>'district')) AS district
    FROM public.reg_submissions s
    JOIN public.reg_forms f ON f.id = s.form_id
      AND f.slug ILIKE 'nspg26-%' AND f.sport <> 'officials'
    JOIN public.reg_submission_categories sc ON sc.submission_id = s.id
    LEFT JOIN public.reg_form_categories c ON c.id = sc.category_id
  ), weights AS (
    SELECT submission_id, sport, count(DISTINCT category_id)::int AS weight_n
    FROM raw
    WHERE status = 'confirmed' AND category_name IS NOT NULL
      AND (sport IN ('boxing','taekwondo','wrestling','wushu')
        OR (sport = 'pencak_silat' AND category_name ILIKE '%Tanding%'))
    GROUP BY submission_id, sport
  ), classified AS (
    SELECT src.*, CASE
      WHEN src.status = 'confirmed' AND src.category_name IS NOT NULL
       AND ((src.sport IN ('boxing','taekwondo','wrestling','wushu')
             OR (src.sport = 'pencak_silat' AND src.category_name ILIKE '%Tanding%'))
            AND coalesce(w.weight_n, 0) = 1)
        THEN 'auto_importable_singles'
      WHEN src.status = 'confirmed' AND src.category_name IS NOT NULL
       AND src.sport IN ('badminton','lawn_tennis','table_tennis')
       AND src.category_name ILIKE '%Singles%'
        THEN 'auto_importable_singles'
      ELSE NULL END AS import_class
    FROM raw src LEFT JOIN weights w USING (submission_id, sport)
  )
  SELECT * FROM classified
  WHERE classified.import_class = 'auto_importable_singles'
    AND classified.district IN ('tseminyü','longleng','noklak','peren');

  SELECT encode(extensions.digest(convert_to(coalesce(string_agg(
    c.submission_id::text || '|' || c.category_id::text || '|' || c.sport || '|' ||
    c.category_name || '|' || c.district || '|' || c.status,
    E'\n' ORDER BY c.submission_id::text, c.category_id::text), ''), 'UTF8'), 'sha256'), 'hex')
    INTO v_hash
  FROM pg_temp.nspg_seed_candidates c;
  SELECT count(*) INTO v_candidates FROM pg_temp.nspg_seed_candidates;

  IF p_apply AND (p_snapshot_hash IS NULL OR p_snapshot_hash IS DISTINCT FROM v_hash) THEN
    RAISE EXCEPTION 'snapshot_hash_mismatch';
  END IF;

  IF NOT p_apply THEN
    RETURN QUERY SELECT d.district, count(c.submission_id)::int, 0, 0, 0, 0, v_hash
      FROM unnest(ARRAY['tseminyü','longleng','noklak','peren']::text[]) d(district)
      LEFT JOIN pg_temp.nspg_seed_candidates c ON c.district = d.district
      GROUP BY d.district ORDER BY d.district;
    RETURN;
  END IF;

  FOR row_data IN SELECT * FROM pg_temp.nspg_seed_candidates ORDER BY sport, category_name, submission_id LOOP
    SELECT id INTO v_tournament FROM public.tournaments WHERE slug = 'nspg26-' || replace(row_data.sport, '_', '-');
    IF v_tournament IS NULL THEN
      INSERT INTO public.tournaments(organizer_id, name, slug, sport, status, visibility)
      VALUES (p_organizer_id, 'NSPG 2026 ' || initcap(replace(row_data.sport, '_', ' ')),
              'nspg26-' || replace(row_data.sport, '_', '-'), row_data.sport, 'draft', 'private')
      RETURNING id INTO v_tournament;
      INSERT INTO public.nspg_import_objects(object_type, object_id) VALUES ('tournament', v_tournament);
      v_tournaments := v_tournaments + 1;
    ELSIF NOT EXISTS (SELECT 1 FROM public.nspg_import_objects WHERE object_type = 'tournament' AND object_id = v_tournament) THEN
      RAISE EXCEPTION 'slug_collision';
    END IF;

    SELECT id INTO v_category FROM public.tournament_categories
      WHERE tournament_id = v_tournament AND name = row_data.category_name;
    IF v_category IS NULL THEN
      INSERT INTO public.tournament_categories(tournament_id, name, format, entrant_type, sort_order)
      VALUES (v_tournament, row_data.category_name, 'knockout', 'singles', 0)
      RETURNING id INTO v_category;
      INSERT INTO public.nspg_import_objects(object_type, object_id) VALUES ('category', v_category);
      v_categories := v_categories + 1;
    END IF;

    INSERT INTO public.nspg_import_links(
      submission_id, reg_category_id, tournament_id, tournament_category_id,
      grain, import_class
    ) VALUES (row_data.submission_id, row_data.category_id, v_tournament, v_category,
              'person_category', 'auto_importable_singles')
    ON CONFLICT (submission_id, reg_category_id) DO NOTHING
    RETURNING id INTO v_link;

    IF v_link IS NOT NULL THEN
      INSERT INTO public.entrants(
        tournament_id, category_id, display_name, players, status, created_by
      ) VALUES (
        v_tournament, v_category, coalesce(nullif(trim(row_data.full_name), ''), row_data.reg_code, row_data.submission_id::text),
        jsonb_build_array(jsonb_build_object('registration_id', row_data.submission_id::text, 'reg_code', row_data.reg_code)),
        'approved', p_organizer_id
      ) RETURNING id INTO v_entrant;
      INSERT INTO public.nspg_import_objects(object_type, object_id) VALUES ('entrant', v_entrant);
      UPDATE public.nspg_import_links SET entrant_id = v_entrant WHERE id = v_link;
      v_links := v_links + 1;
      v_entrants := v_entrants + 1;
    END IF;
  END LOOP;

  SELECT encode(extensions.digest(convert_to(coalesce(string_agg(
    c.submission_id::text || '|' || c.category_id::text || '|' || c.sport || '|' || c.category_name || '|' || c.district || '|' || c.status,
    E'\n' ORDER BY c.submission_id::text, c.category_id::text), ''), 'UTF8'), 'sha256'), 'hex')
    INTO v_hash_after
  FROM pg_temp.nspg_seed_candidates c;

  IF (SELECT count(*) FROM public.nspg_import_links l
      JOIN pg_temp.nspg_seed_candidates c
        ON c.submission_id = l.submission_id AND c.category_id = l.reg_category_id) <> v_candidates
     OR EXISTS (SELECT 1 FROM public.nspg_import_links l
                JOIN pg_temp.nspg_seed_candidates c
                  ON c.submission_id = l.submission_id AND c.category_id = l.reg_category_id
                WHERE l.entrant_id IS NULL)
     OR v_hash_after IS DISTINCT FROM v_hash
  THEN
    RAISE EXCEPTION 'verification_failed';
  END IF;

  RETURN QUERY SELECT d.district,
      count(c.submission_id)::int, v_tournaments, v_categories, v_links, v_entrants, v_hash
    FROM unnest(ARRAY['tseminyü','longleng','noklak','peren']::text[]) d(district)
    LEFT JOIN pg_temp.nspg_seed_candidates c ON c.district = d.district
    GROUP BY d.district ORDER BY d.district;
END;
$$;

REVOKE ALL ON FUNCTION public.nspg_seed_verified_districts(boolean,text,text,uuid,text) FROM PUBLIC, anon, authenticated;

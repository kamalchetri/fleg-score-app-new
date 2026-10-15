-- NOT APPLIED. Local disposable cluster only.
-- Do not run against Supabase project zcubdqfzdbwtfcdsntoa.
--
-- Lock behavior for tournaments_sport_check, measured on PostgreSQL:
-- 1. The precheck is a read. It takes ACCESS SHARE and does not rewrite the table.
-- 2. ADD CONSTRAINT ... NOT VALID takes ACCESS EXCLUSIVE only long enough to
--    update the catalog, then this script commits so that lock is released
--    before the table scan. Existing rows are not validated in that step.
-- 3. VALIDATE CONSTRAINT takes SHARE UPDATE EXCLUSIVE. Reads and writes continue.
--    Other DDL waits. lock_timeout makes a busy table fail instead of waiting
--    without a bound.
-- 4. Dropping the old constraint and renaming the new one takes ACCESS
--    EXCLUSIVE again, only for those two catalog changes, in its own transaction.
-- A failure before step 4 leaves the original six-sport check in force.
-- The wider check does not by itself insert a tournament.

CREATE OR REPLACE FUNCTION public.nspg_assert_preserved_sports()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.tournaments
    WHERE sport <> ALL (ARRAY[
      'futsal', 'football', 'pickleball', 'basketball', 'badminton', 'darts'
    ]::text[])
  ) THEN
    RAISE EXCEPTION 'existing_sport_outside_preserved_set';
  END IF;
END;
$function$;

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
SELECT public.nspg_assert_preserved_sports();
COMMIT;

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_sport_check_nspg
  CHECK (sport = ANY (ARRAY[
    'futsal', 'football', 'pickleball', 'basketball', 'badminton', 'darts',
    'archery', 'athletics', 'boxing', 'lawn_tennis', 'pencak_silat',
    'sepaktakraw', 'table_tennis', 'taekwondo', 'volleyball', 'wrestling', 'wushu'
  ]::text[])) NOT VALID;
COMMIT;

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE public.tournaments VALIDATE CONSTRAINT tournaments_sport_check_nspg;
COMMIT;

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
ALTER TABLE public.tournaments DROP CONSTRAINT tournaments_sport_check;
ALTER TABLE public.tournaments
  RENAME CONSTRAINT tournaments_sport_check_nspg TO tournaments_sport_check;
COMMIT;

CREATE TABLE public.nspg_import_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.reg_submissions (id),
  reg_category_id uuid NOT NULL REFERENCES public.reg_form_categories (id),
  tournament_id uuid NOT NULL REFERENCES public.tournaments (id),
  tournament_category_id uuid NOT NULL REFERENCES public.tournament_categories (id),
  entrant_id uuid REFERENCES public.entrants (id),
  grain text NOT NULL CHECK (grain = ANY (ARRAY['person_category', 'district_team']::text[])),
  import_class text NOT NULL CHECK (import_class = ANY (ARRAY[
    'auto_importable_singles', 'pending_qualification', 'ranked_result',
    'district_roster', 'unlinked_pair', 'artistic_ensemble',
    'multi_weight_conflict', 'other_unresolved'
  ]::text[])),
  block_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nspg_import_links_one_link UNIQUE (submission_id, reg_category_id),
  CONSTRAINT nspg_import_links_block_reason CHECK (
    (import_class = 'auto_importable_singles' AND block_reason IS NULL)
    OR (import_class <> 'auto_importable_singles' AND block_reason = import_class)
  ),
  CONSTRAINT nspg_import_links_entrant_only_auto CHECK (
    entrant_id IS NULL OR import_class = 'auto_importable_singles'
  )
);

CREATE INDEX nspg_import_links_tournament_id_idx ON public.nspg_import_links (tournament_id);

CREATE OR REPLACE FUNCTION public.nspg_import_links_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.tournament_categories AS c
    WHERE c.id = NEW.tournament_category_id
      AND c.tournament_id = NEW.tournament_id
  ) THEN
    RAISE EXCEPTION 'link_category_mismatch';
  END IF;

  IF NEW.entrant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.entrants AS e
    WHERE e.id = NEW.entrant_id
      AND e.tournament_id = NEW.tournament_id
      AND e.category_id = NEW.tournament_category_id
  ) THEN
    RAISE EXCEPTION 'link_target_mismatch';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER nspg_import_links_guard
  BEFORE INSERT OR UPDATE ON public.nspg_import_links
  FOR EACH ROW
  EXECUTE FUNCTION public.nspg_import_links_guard();

CREATE TABLE public.nspg_import_objects (
  object_type text NOT NULL CHECK (object_type = ANY (ARRAY['tournament', 'category', 'entrant']::text[])),
  object_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (object_type, object_id)
);

CREATE TABLE public.nspg_import_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reason text NOT NULL CHECK (reason = ANY (ARRAY[
    'withdrawn', 'status_changed', 'link_removed', 'unknown_category', 'duplicate_link'
  ]::text[])),
  submission_id uuid NOT NULL,
  reg_category_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nspg_import_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nspg_import_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nspg_import_review ENABLE ROW LEVEL SECURITY;
-- No permissive policy. These tables stay default-deny until a separate
-- approval adds organizer policies. The local harness adds a policy only
-- for its disposable role.

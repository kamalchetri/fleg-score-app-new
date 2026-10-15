-- NOT APPLIED. One transaction. Do not run against Supabase project zcubdqfzdbwtfcdsntoa.
-- Deletes only rows recorded in nspg_import_objects. Registration, payments,
-- workshops, public events, and every tournament without that provenance stay.
-- The six-sport check is restored only when every remaining tournament sport
-- is one of the six original values. If a new-sport row remains, this
-- transaction rolls back and the wider check stays.

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DROP TABLE IF EXISTS public.nspg_import_review;
DROP TABLE IF EXISTS public.nspg_import_links;

DELETE FROM public.tournaments
WHERE id IN (
  SELECT object_id FROM public.nspg_import_objects WHERE object_type = 'tournament'
);

DROP TABLE IF EXISTS public.nspg_import_objects;

DO $restore$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.tournaments
    WHERE sport <> ALL (ARRAY[
      'futsal', 'football', 'pickleball', 'basketball', 'badminton', 'darts'
    ]::text[])
  ) THEN
    RAISE EXCEPTION 'rollback_would_invalidate_rows';
  END IF;
END;
$restore$;

ALTER TABLE public.tournaments DROP CONSTRAINT tournaments_sport_check;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_sport_check
  CHECK (sport = ANY (ARRAY[
    'futsal', 'football', 'pickleball', 'basketball', 'badminton', 'darts'
  ]::text[]));

COMMIT;

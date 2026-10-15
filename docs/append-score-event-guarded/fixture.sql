-- Minimal local stand-in for the Fleg-web objects this RPC uses.
-- Not a Supabase schema. Apply only on the disposable cluster.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $function$
  SELECT NULLIF(
    COALESCE(
      NULLIF(current_setting('request.jwt.claim.sub', true), ''),
      NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  )::uuid;
$function$;

REVOKE ALL ON FUNCTION auth.uid() FROM PUBLIC;

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$roles$;

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO postgres, anon, authenticated, service_role;

CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY,
  organizer_id uuid NOT NULL
);

CREATE TABLE public.tournament_staff (
  tournament_id uuid NOT NULL REFERENCES public.tournaments (id),
  user_id uuid NOT NULL,
  staff_role text NOT NULL,
  PRIMARY KEY (tournament_id, user_id),
  CONSTRAINT tournament_staff_staff_role_check CHECK (
    staff_role = ANY (ARRAY['owner', 'co_organizer', 'referee', 'scorekeeper'])
  )
);

CREATE TABLE public.matches (
  id uuid PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments (id),
  status text NOT NULL,
  CONSTRAINT matches_status_check CHECK (
    status = ANY (ARRAY['scheduled', 'live', 'completed', 'walkover', 'cancelled'])
  )
);

CREATE TABLE public.score_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches (id),
  tournament_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_tournament_staff(t_id uuid, roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT EXISTS (
           SELECT 1
           FROM public.tournaments AS t
           WHERE t.id = t_id
             AND t.organizer_id = auth.uid()
         )
      OR EXISTS (
           SELECT 1
           FROM public.tournament_staff AS s
           WHERE s.tournament_id = t_id
             AND s.user_id = auth.uid()
             AND s.staff_role = ANY (roles)
         );
$function$;

CREATE OR REPLACE FUNCTION public.set_score_event_tournament()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  SELECT m.tournament_id
    INTO NEW.tournament_id
  FROM public.matches AS m
  WHERE m.id = NEW.match_id;

  IF NOT FOUND OR NEW.tournament_id IS NULL THEN
    RAISE EXCEPTION 'invalid match';
  END IF;

  NEW.created_by := coalesce(auth.uid(), NEW.created_by);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_score_event_insert
BEFORE INSERT ON public.score_events
FOR EACH ROW
EXECUTE FUNCTION public.set_score_event_tournament();

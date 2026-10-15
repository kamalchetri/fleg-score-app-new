CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
CREATE TABLE public.tournaments (id uuid PRIMARY KEY, organizer_id uuid, status text DEFAULT 'draft');
CREATE TABLE public.matches (id uuid PRIMARY KEY, tournament_id uuid REFERENCES public.tournaments(id), status text DEFAULT 'scheduled');
CREATE TABLE public.tournament_staff (tournament_id uuid, user_id uuid, staff_role text);
CREATE OR REPLACE FUNCTION public.is_tournament_staff(t_id uuid, roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tournament_staff s
                 WHERE s.tournament_id=t_id AND s.user_id=auth.uid() AND s.staff_role=ANY(roles)); $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
END $$;
GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.tournaments, public.matches, public.tournament_staff TO authenticated;

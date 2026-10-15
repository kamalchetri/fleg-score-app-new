-- Local stand-in for the Fleg-web objects the ranked-results RPCs use. Disposable cluster only.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE TABLE public.tournaments (id uuid PRIMARY KEY, organizer_id uuid);
CREATE TABLE public.tournament_categories (id uuid PRIMARY KEY, tournament_id uuid REFERENCES public.tournaments(id));
CREATE TABLE public.entrants (id uuid PRIMARY KEY, tournament_id uuid REFERENCES public.tournaments(id));
CREATE TABLE public.tournament_staff (tournament_id uuid, user_id uuid, staff_role text);
CREATE OR REPLACE FUNCTION public.is_tournament_staff(t_id uuid, roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tournament_staff s
                 WHERE s.tournament_id = t_id AND s.user_id = auth.uid() AND s.staff_role = ANY(roles));
$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
END $$;
GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon;
-- seed
INSERT INTO public.tournaments VALUES ('aaaaaaaa-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000aa');
INSERT INTO public.tournament_categories VALUES ('cccccccc-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001');
INSERT INTO public.entrants VALUES ('eeee0000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001'),
                                    ('eeee0000-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000001');
INSERT INTO public.tournament_staff VALUES ('aaaaaaaa-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','scorekeeper');

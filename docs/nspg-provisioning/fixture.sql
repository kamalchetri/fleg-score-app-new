-- Disposable local stand-in. Not a Supabase schema and not production data.

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY
);

CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.profiles (id),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sport text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  visibility text NOT NULL DEFAULT 'private',
  venue_name text,
  city text,
  starts_at timestamptz,
  ends_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tournaments_city_check CHECK (city IS NULL OR city = ANY (ARRAY['kohima', 'dimapur']::text[])),
  CONSTRAINT tournaments_sport_check CHECK (sport = ANY (ARRAY[
    'futsal', 'football', 'pickleball', 'basketball', 'badminton', 'darts'
  ]::text[])),
  CONSTRAINT tournaments_status_check CHECK (status = ANY (ARRAY[
    'draft', 'published', 'registration_open', 'registration_closed', 'live', 'completed', 'archived'
  ]::text[])),
  CONSTRAINT tournaments_visibility_check CHECK (visibility = ANY (ARRAY[
    'public', 'unlisted', 'private'
  ]::text[]))
);

CREATE TABLE public.tournament_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments (id) ON DELETE CASCADE,
  name text NOT NULL,
  format text NOT NULL,
  entrant_type text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT tournament_categories_format_check CHECK (format = ANY (ARRAY[
    'knockout', 'league', 'groups_knockout'
  ]::text[])),
  CONSTRAINT tournament_categories_entrant_type_check CHECK (entrant_type = ANY (ARRAY[
    'team', 'singles', 'doubles'
  ]::text[]))
);

CREATE TABLE public.entrants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments (id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.tournament_categories (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  city text,
  status text NOT NULL DEFAULT 'pending',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entrants_city_check CHECK (city IS NULL OR city = ANY (ARRAY['kohima', 'dimapur']::text[]))
);

CREATE TABLE public.reg_forms (
  id uuid PRIMARY KEY,
  slug text NOT NULL,
  sport text NOT NULL
);

CREATE TABLE public.reg_form_categories (
  id uuid PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES public.reg_forms (id),
  name text NOT NULL
);

CREATE TABLE public.reg_submissions (
  id uuid PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES public.reg_forms (id),
  status text NOT NULL,
  full_name text NOT NULL
);

CREATE TABLE public.reg_submission_categories (
  submission_id uuid NOT NULL REFERENCES public.reg_submissions (id),
  category_id uuid NOT NULL REFERENCES public.reg_form_categories (id),
  PRIMARY KEY (submission_id, category_id)
);

CREATE TABLE public.payments (
  id text PRIMARY KEY,
  marker text NOT NULL
);

CREATE TABLE public.workshops (
  id text PRIMARY KEY,
  marker text NOT NULL
);

CREATE TABLE public.public_events (
  id text PRIMARY KEY,
  marker text NOT NULL
);

INSERT INTO public.profiles (id)
VALUES ('00000000-0000-4000-8000-0000000000aa');

INSERT INTO public.tournaments (id, organizer_id, name, slug, sport, status, visibility, updated_at)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000aa',
  'Existing futsal cup',
  'existing-futsal-cup',
  'futsal',
  'live',
  'public',
  '2026-01-01 00:00:00+00'
);

INSERT INTO public.tournament_categories (id, tournament_id, name, format, entrant_type)
VALUES (
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'Open',
  'league',
  'team'
);

INSERT INTO public.entrants (id, tournament_id, category_id, display_name, status, updated_at)
VALUES (
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'Existing entrant',
  'approved',
  '2026-01-01 00:00:00+00'
);

INSERT INTO public.payments (id, marker) VALUES ('pay-1', 'keep');
INSERT INTO public.workshops (id, marker) VALUES ('shop-1', 'keep');
INSERT INTO public.public_events (id, marker) VALUES ('event-1', 'keep');

INSERT INTO public.reg_forms (id, slug, sport) VALUES
  ('20000000-0000-4000-8000-000000000001', 'nspg26-badminton', 'badminton'),
  ('20000000-0000-4000-8000-000000000002', 'nspg26-sepaktakraw', 'sepaktakraw'),
  ('20000000-0000-4000-8000-000000000003', 'nspg26-pencak-silat', 'pencak_silat'),
  ('20000000-0000-4000-8000-000000000004', 'nspg26-boxing', 'boxing'),
  ('20000000-0000-4000-8000-000000000005', 'nspg26-officials', 'officials'),
  ('20000000-0000-4000-8000-000000000009', 'nspg26-archery', 'archery'),
  ('20000000-0000-4000-8000-000000000010', 'nspg26-athletics', 'athletics');

INSERT INTO public.reg_form_categories (id, form_id, name) VALUES
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Men''s Singles'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Men''s Doubles'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Exhibition'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'Men - Double'),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', 'Men Tanding - Class A (45-50kg)'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', 'Men Artistic - Regu'),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000004', 'Men 48kg'),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000004', 'Men 52kg'),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000009', 'Women Recurve - Individual Olympic Round'),
  ('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000010', 'Women 100m'),
  ('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000010', 'Men 4x100m Relay');

INSERT INTO public.reg_submissions (id, form_id, status, full_name) VALUES
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'confirmed', 'Synthetic Singles'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'confirmed', 'Synthetic Squad'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'confirmed', 'Synthetic Tanding'),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', 'confirmed', 'Synthetic Weights'),
  ('40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004', 'confirmed', 'Synthetic One Weight'),
  ('40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 'withdrawn', 'Synthetic Withdrawn'),
  ('40000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000001', 'confirmed', 'Synthetic Unknown'),
  ('40000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000005', 'confirmed', 'Synthetic Official'),
  ('40000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000009', 'confirmed', 'Synthetic Qualification'),
  ('40000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000010', 'confirmed', 'Synthetic Ranked'),
  ('40000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000010', 'confirmed', 'Synthetic Relay');

INSERT INTO public.reg_submission_categories (submission_id, category_id) VALUES
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000006'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000007'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000008'),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000007'),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000003'),
  ('40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000009'),
  ('40000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000010'),
  ('40000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000011');

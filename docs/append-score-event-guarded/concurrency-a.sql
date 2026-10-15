-- Session A. Holds the transaction open after the append so Session B blocks.
\set ON_ERROR_STOP on
\pset pager off
\pset tuples_only on
\pset format unaligned
\pset fieldsep '|'
BEGIN;
\o NUL
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
\o
SET LOCAL ROLE authenticated;
SELECT ok, conflict, event_id, last_event_id
FROM public.append_score_event_guarded(
  '55555555-5555-4555-8555-555555555555',
  'point',
  '{"side":"a"}'::jsonb,
  0
);
\o NUL
SELECT pg_sleep(3);
\o
COMMIT;

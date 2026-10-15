-- Single-session checks for the disposable local cluster.
-- The two-session race is concurrency-a.sql and concurrency-b.sql.
-- Does not read or write registration, payment, workshop, or public-event tables.

\set ON_ERROR_STOP on

INSERT INTO public.tournaments (id, organizer_id)
VALUES ('33333333-3333-4333-8333-333333333333', '00000000-0000-4000-8000-000000000001');

INSERT INTO public.tournament_staff (tournament_id, user_id, staff_role)
VALUES (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'scorekeeper'
);

INSERT INTO public.matches (id, tournament_id, status)
VALUES
  ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'live'),
  ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333', 'live'),
  ('66666666-6666-4666-8666-666666666666', '33333333-3333-4333-8333-333333333333', 'scheduled'),
  ('77777777-7777-4777-8777-777777777777', '33333333-3333-4333-8333-333333333333', 'completed'),
  ('88888888-8888-4888-8888-888888888888', '33333333-3333-4333-8333-333333333333', 'live');

INSERT INTO public.score_events (match_id, tournament_id, event_type, payload, created_by)
VALUES (
  '88888888-8888-4888-8888-888888888888',
  '33333333-3333-4333-8333-333333333333',
  'goal',
  '{"side":"a","marker":"preexisting"}'::jsonb,
  '11111111-1111-4111-8111-111111111111'
);

CREATE TEMP TABLE guard_preexisting AS
SELECT id, match_id, tournament_id, event_type, payload, created_by
FROM public.score_events
WHERE match_id = '88888888-8888-4888-8888-888888888888';

CREATE TEMP TABLE guard_results (
  step text PRIMARY KEY,
  outcome text NOT NULL,
  detail text NOT NULL
);
GRANT ALL ON TABLE guard_results TO authenticated;

-- Anonymous role has no execute privilege.
DO $test$
DECLARE
  v_sqlstate text;
  v_message text;
  v_outcome text := 'fail';
  v_detail text := 'call was allowed';
BEGIN
  BEGIN
    SET LOCAL ROLE anon;
    PERFORM *
    FROM public.append_score_event_guarded(
      '44444444-4444-4444-8444-444444444444',
      'point',
      '{"side":"a"}'::jsonb,
      0
    );
    RAISE EXCEPTION 'unexpected_success';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
    IF v_sqlstate = '42501' AND v_message IS DISTINCT FROM 'unexpected_success' THEN
      v_outcome := 'rejected';
      v_detail := v_sqlstate || ' ' || v_message;
    ELSE
      v_detail := COALESCE(v_sqlstate, '') || ' ' || COALESCE(v_message, '');
    END IF;
  END;
  INSERT INTO guard_results VALUES ('anon', v_outcome, v_detail);
END
$test$;

-- Authenticated session with no user id.
DO $test$
DECLARE
  v_sqlstate text;
  v_message text;
  v_outcome text := 'fail';
  v_detail text := 'call was allowed';
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM *
    FROM public.append_score_event_guarded(
      '44444444-4444-4444-8444-444444444444',
      'point',
      '{"side":"a"}'::jsonb,
      0
    );
    RAISE EXCEPTION 'unexpected_success';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
    IF v_sqlstate = '42501' AND v_message = 'not_authenticated' THEN
      v_outcome := 'rejected';
    END IF;
    v_detail := COALESCE(v_sqlstate, '') || ' ' || COALESCE(v_message, '');
  END;
  INSERT INTO guard_results VALUES ('authenticated_no_user', v_outcome, v_detail);
END
$test$;

-- Authenticated user who is not tournament staff.
DO $test$
DECLARE
  v_sqlstate text;
  v_message text;
  v_outcome text := 'fail';
  v_detail text := 'call was allowed';
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
    true
  );
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM *
    FROM public.append_score_event_guarded(
      '44444444-4444-4444-8444-444444444444',
      'point',
      '{"side":"a"}'::jsonb,
      0
    );
    RAISE EXCEPTION 'unexpected_success';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
    IF v_sqlstate = '42501' AND v_message = 'not_tournament_staff' THEN
      v_outcome := 'rejected';
    END IF;
    v_detail := COALESCE(v_sqlstate, '') || ' ' || COALESCE(v_message, '');
  END;
  INSERT INTO guard_results VALUES ('non_staff', v_outcome, v_detail);
END
$test$;

-- Unknown event types insert nothing.
DO $test$
DECLARE
  v_sqlstate text;
  v_message text;
  v_outcome text := 'fail';
  v_detail text := 'call was allowed';
  v_before bigint;
  v_after bigint;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
    true
  );
  SELECT count(*) INTO v_before
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';

  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM *
    FROM public.append_score_event_guarded(
      '44444444-4444-4444-8444-444444444444',
      'not_a_score_event',
      '{}'::jsonb,
      0
    );
    RAISE EXCEPTION 'unexpected_success';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
    IF v_sqlstate = '22023' AND v_message = 'unknown_event_type' THEN
      v_outcome := 'rejected';
    END IF;
    v_detail := COALESCE(v_sqlstate, '') || ' ' || COALESCE(v_message, '');
  END;

  SELECT count(*) INTO v_after
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';
  INSERT INTO guard_results VALUES ('unknown_event', v_outcome, v_detail);
  INSERT INTO guard_results VALUES (
    'unknown_event_rows',
    CASE WHEN v_before = 0 AND v_after = 0 THEN 'unchanged' ELSE 'fail' END,
    v_before::text || ' -> ' || v_after::text
  );
END
$test$;

DO $test$
DECLARE
  v_sqlstate text;
  v_message text;
  v_outcome text := 'fail';
  v_detail text := 'call was allowed';
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
    true
  );
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM *
    FROM public.append_score_event_guarded(
      '44444444-4444-4444-8444-444444444444',
      'leg_won',
      '{}'::jsonb,
      0
    );
    RAISE EXCEPTION 'unexpected_success';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
    IF v_sqlstate = '22023' AND v_message = 'unknown_event_type' THEN
      v_outcome := 'rejected';
    END IF;
    v_detail := COALESCE(v_sqlstate, '') || ' ' || COALESCE(v_message, '');
  END;
  INSERT INTO guard_results VALUES ('whitelist_leg_won', v_outcome, v_detail);
END
$test$;

-- Scheduled and completed matches are rejected after the locks.
DO $test$
DECLARE
  v_sqlstate text;
  v_message text;
  v_scheduled text := 'fail';
  v_scheduled_detail text := 'call was allowed';
  v_completed text := 'fail';
  v_completed_detail text := 'call was allowed';
  v_rows bigint;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
    true
  );

  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM *
    FROM public.append_score_event_guarded(
      '66666666-6666-4666-8666-666666666666',
      'point',
      '{"side":"a"}'::jsonb,
      0
    );
    RAISE EXCEPTION 'unexpected_success';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
    IF v_sqlstate = 'P0001' AND v_message = 'match_not_live' THEN
      v_scheduled := 'rejected';
    END IF;
    v_scheduled_detail := COALESCE(v_sqlstate, '') || ' ' || COALESCE(v_message, '');
  END;

  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM *
    FROM public.append_score_event_guarded(
      '77777777-7777-4777-8777-777777777777',
      'point',
      '{"side":"a"}'::jsonb,
      0
    );
    RAISE EXCEPTION 'unexpected_success';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
    IF v_sqlstate = 'P0001' AND v_message = 'match_not_live' THEN
      v_completed := 'rejected';
    END IF;
    v_completed_detail := COALESCE(v_sqlstate, '') || ' ' || COALESCE(v_message, '');
  END;

  SELECT count(*) INTO v_rows
  FROM public.score_events
  WHERE match_id IN (
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  );
  INSERT INTO guard_results VALUES ('scheduled', v_scheduled, v_scheduled_detail);
  INSERT INTO guard_results VALUES ('completed', v_completed, v_completed_detail);
  INSERT INTO guard_results VALUES (
    'non_live_rows',
    CASE WHEN v_rows = 0 THEN 'unchanged' ELSE 'fail' END,
    'rows=' || v_rows::text
  );
END
$test$;

-- Expected id 0 inserts one event. The trigger fills tournament_id and created_by.
DO $test$
DECLARE
  v_row record;
  v_event record;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
    true
  );
  SET LOCAL ROLE authenticated;
  SELECT *
    INTO v_row
  FROM public.append_score_event_guarded(
    '44444444-4444-4444-8444-444444444444',
    'point',
    '{"side":"a"}'::jsonb,
    0
  );
  RESET ROLE;

  SELECT * INTO v_event
  FROM public.score_events
  WHERE id = v_row.event_id;

  INSERT INTO guard_results VALUES (
    'insert_once',
    CASE
      WHEN v_row.ok AND NOT v_row.conflict
       AND v_row.event_id IS NOT NULL
       AND v_row.event_id = v_row.last_event_id
      THEN 'inserted' ELSE 'fail'
    END,
    'event_id=' || COALESCE(v_row.event_id::text, 'null')
      || ' last=' || COALESCE(v_row.last_event_id::text, 'null')
  );
  INSERT INTO guard_results VALUES (
    'trigger_columns',
    CASE
      WHEN v_event.tournament_id = '33333333-3333-4333-8333-333333333333'
       AND v_event.created_by = '11111111-1111-4111-8111-111111111111'
       AND v_event.event_type = 'point'
       AND v_event.payload = '{"side":"a"}'::jsonb
      THEN 'filled_by_trigger' ELSE 'fail'
    END,
    'tournament_id=' || COALESCE(v_event.tournament_id::text, 'null')
      || ' created_by=' || COALESCE(v_event.created_by::text, 'null')
  );
END
$test$;

-- A second caller with the same expected id conflicts and inserts nothing.
DO $test$
DECLARE
  v_row record;
  v_before bigint;
  v_after bigint;
BEGIN
  SELECT count(*) INTO v_before
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';

  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
    true
  );
  SET LOCAL ROLE authenticated;
  SELECT *
    INTO v_row
  FROM public.append_score_event_guarded(
    '44444444-4444-4444-8444-444444444444',
    'point',
    '{"side":"b"}'::jsonb,
    0
  );
  RESET ROLE;

  SELECT count(*) INTO v_after
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';

  INSERT INTO guard_results VALUES (
    'stale_expected_id',
    CASE
      WHEN NOT v_row.ok AND v_row.conflict
       AND v_row.event_id IS NULL
       AND v_row.last_event_id IS NOT NULL
       AND v_row.last_event_id <> 0
       AND v_before = 1
       AND v_after = 1
      THEN 'conflict' ELSE 'fail'
    END,
    'last=' || COALESCE(v_row.last_event_id::text, 'null')
      || ' rows ' || v_before::text || ' -> ' || v_after::text
  );
END
$test$;

-- bout_result is an allowed combat event. It does not replace the earlier point.
DO $test$
DECLARE
  v_row record;
  v_event record;
  v_last bigint;
  v_before bigint;
  v_after bigint;
BEGIN
  SELECT count(*) INTO v_before
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';
  SELECT COALESCE(MAX(id), 0) INTO v_last
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';

  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
    true
  );
  SET LOCAL ROLE authenticated;
  SELECT *
    INTO v_row
  FROM public.append_score_event_guarded(
    '44444444-4444-4444-8444-444444444444',
    'bout_result',
    '{"winnerSide":"a","method":"decision","pointsA":10,"pointsB":8}'::jsonb,
    v_last
  );
  RESET ROLE;

  SELECT * INTO v_event FROM public.score_events WHERE id = v_row.event_id;
  SELECT count(*) INTO v_after
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';

  INSERT INTO guard_results VALUES (
    'bout_result',
    CASE
      WHEN v_row.ok AND NOT v_row.conflict
       AND v_before = 1
       AND v_after = 2
       AND v_event.event_type = 'bout_result'
       AND v_event.payload = '{"winnerSide":"a","method":"decision","pointsA":10,"pointsB":8}'::jsonb
       AND v_event.tournament_id = '33333333-3333-4333-8333-333333333333'
       AND v_event.created_by = '11111111-1111-4111-8111-111111111111'
      THEN 'inserted' ELSE 'fail'
    END,
    'event_id=' || COALESCE(v_row.event_id::text, 'null')
      || ' rows ' || v_before::text || ' -> ' || v_after::text
  );
END
$test$;

-- end_result is an allowed archery end. It does not replace the earlier rows.
DO $test$
DECLARE
  v_row record;
  v_event record;
  v_last bigint;
  v_before bigint;
  v_after bigint;
BEGIN
  SELECT count(*) INTO v_before
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';
  SELECT COALESCE(MAX(id), 0) INTO v_last
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';

  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
    true
  );
  SET LOCAL ROLE authenticated;
  SELECT *
    INTO v_row
  FROM public.append_score_event_guarded(
    '44444444-4444-4444-8444-444444444444',
    'end_result',
    '{"a":27,"b":24}'::jsonb,
    v_last
  );
  RESET ROLE;

  SELECT * INTO v_event FROM public.score_events WHERE id = v_row.event_id;
  SELECT count(*) INTO v_after
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';

  INSERT INTO guard_results VALUES (
    'end_result',
    CASE
      WHEN v_row.ok AND NOT v_row.conflict
       AND v_before = 2
       AND v_after = 3
       AND v_event.event_type = 'end_result'
       AND v_event.payload = '{"a":27,"b":24}'::jsonb
       AND v_event.tournament_id = '33333333-3333-4333-8333-333333333333'
       AND v_event.created_by = '11111111-1111-4111-8111-111111111111'
      THEN 'inserted' ELSE 'fail'
    END,
    'event_id=' || COALESCE(v_row.event_id::text, 'null')
      || ' rows ' || v_before::text || ' -> ' || v_after::text
  );
END
$test$;

-- shoot_off is an allowed archery tie break. The winner is stored explicitly.
DO $test$
DECLARE
  v_row record;
  v_event record;
  v_last bigint;
  v_before bigint;
  v_after bigint;
BEGIN
  SELECT count(*) INTO v_before
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';
  SELECT COALESCE(MAX(id), 0) INTO v_last
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';

  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
    true
  );
  SET LOCAL ROLE authenticated;
  SELECT *
    INTO v_row
  FROM public.append_score_event_guarded(
    '44444444-4444-4444-8444-444444444444',
    'shoot_off',
    '{"winnerSide":"a","scoreA":9,"scoreB":9,"note":"Closest to centre"}'::jsonb,
    v_last
  );
  RESET ROLE;

  SELECT * INTO v_event FROM public.score_events WHERE id = v_row.event_id;
  SELECT count(*) INTO v_after
  FROM public.score_events
  WHERE match_id = '44444444-4444-4444-8444-444444444444';

  INSERT INTO guard_results VALUES (
    'shoot_off',
    CASE
      WHEN v_row.ok AND NOT v_row.conflict
       AND v_before = 3
       AND v_after = 4
       AND v_event.event_type = 'shoot_off'
       AND v_event.payload = '{"note":"Closest to centre","scoreA":9,"scoreB":9,"winnerSide":"a"}'::jsonb
      THEN 'inserted' ELSE 'fail'
    END,
    'event_id=' || COALESCE(v_row.event_id::text, 'null')
      || ' rows ' || v_before::text || ' -> ' || v_after::text
  );
END
$test$;

INSERT INTO guard_results
SELECT
  'preexisting_direct_row',
  CASE WHEN count(*) = 1 THEN 'unchanged' ELSE 'fail' END,
  'matching_rows=' || count(*)::text
FROM public.score_events AS se
JOIN guard_preexisting AS p
  ON se.id = p.id
 AND se.match_id = p.match_id
 AND se.tournament_id = p.tournament_id
 AND se.event_type = p.event_type
 AND se.payload = p.payload
 AND se.created_by IS NOT DISTINCT FROM p.created_by;

INSERT INTO guard_results
SELECT
  'concurrency_match_untouched',
  CASE WHEN count(*) = 0 THEN 'unchanged' ELSE 'fail' END,
  'rows=' || count(*)::text
FROM public.score_events
WHERE match_id = '55555555-5555-4555-8555-555555555555';

\pset tuples_only on
\pset format unaligned
\pset fieldsep '|'
SELECT step, outcome, detail FROM guard_results ORDER BY step;

DO $test$
BEGIN
  IF EXISTS (SELECT 1 FROM guard_results WHERE outcome = 'fail') THEN
    RAISE EXCEPTION 'local guard tests failed';
  END IF;
END
$test$;

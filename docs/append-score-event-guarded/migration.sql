-- NOT APPLIED to Supabase.
-- Apply only to a disposable local cluster or a future development branch.
-- Never run this against production project zcubdqfzdbwtfcdsntoa.

CREATE OR REPLACE FUNCTION public.append_score_event_guarded(
  p_match_id uuid,
  p_event_type text,
  p_payload jsonb,
  p_expected_last_event_id bigint
)
RETURNS TABLE (
  ok boolean,
  conflict boolean,
  event_id bigint,
  last_event_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_uid uuid;
  v_tournament_id uuid;
  v_locked_tournament_id uuid;
  v_status text;
  v_last bigint;
  v_new bigint;
  -- Union of event types folded or documented by the web and mobile
  -- scoring engines (lib/scoring plus the web match clock).
  -- leg_won and set_won are listed in web sports config but are not
  -- folded by the darts engine, so they are rejected.
  v_allowed constant text[] := ARRAY[
    'goal',
    'card',
    'foul',
    'substitution',
    'shot',
    'shot_on_target',
    'possession',
    'period_start',
    'period_end',
    'clock_pause',
    'clock_resume',
    'point',
    'serve_change',
    'game_start',
    'timeout',
    'visit',
    'undo',
    'undo_side_goal',
    'bout_result',
    'end_result',
    'shoot_off'
  ];
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING ERRCODE = '42501';
  END IF;

  IF p_event_type IS NULL OR NOT (p_event_type = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'unknown_event_type'
      USING ERRCODE = '22023';
  END IF;

  -- Authorization uses a preliminary read. The live/not-live decision
  -- uses the row locked below, after the advisory lock.
  SELECT m.tournament_id
    INTO v_tournament_id
  FROM public.matches AS m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'match_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_tournament_staff(
    v_tournament_id,
    ARRAY['owner', 'co_organizer', 'referee', 'scorekeeper']
  ) THEN
    RAISE EXCEPTION 'not_tournament_staff'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'append_score_event_guarded:' || p_match_id::text,
      0
    )
  );

  SELECT m.tournament_id, m.status
    INTO v_locked_tournament_id, v_status
  FROM public.matches AS m
  WHERE m.id = p_match_id
  FOR UPDATE;

  IF NOT FOUND OR v_locked_tournament_id IS DISTINCT FROM v_tournament_id THEN
    RAISE EXCEPTION 'match_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_status IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'match_not_live'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(MAX(se.id), 0)
    INTO v_last
  FROM public.score_events AS se
  WHERE se.match_id = p_match_id;

  IF v_last IS DISTINCT FROM p_expected_last_event_id THEN
    ok := false;
    conflict := true;
    event_id := NULL;
    last_event_id := v_last;
    RETURN NEXT;
    RETURN;
  END IF;

  -- tournament_id and created_by are filled by set_score_event_tournament.
  INSERT INTO public.score_events (match_id, event_type, payload)
  VALUES (p_match_id, p_event_type, COALESCE(p_payload, '{}'::jsonb))
  RETURNING id INTO v_new;

  ok := true;
  conflict := false;
  event_id := v_new;
  last_event_id := v_new;
  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.append_score_event_guarded(uuid, text, jsonb, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.append_score_event_guarded(uuid, text, jsonb, bigint) FROM anon;
REVOKE ALL ON FUNCTION public.append_score_event_guarded(uuid, text, jsonb, bigint) FROM service_role;
GRANT EXECUTE ON FUNCTION public.append_score_event_guarded(uuid, text, jsonb, bigint) TO authenticated;

COMMENT ON FUNCTION public.append_score_event_guarded(uuid, text, jsonb, bigint) IS
  'Compare-and-append one score event for a live match. Staff only. Does not accept created_by or tournament_id.';

-- NSPG ranked-results persistence — athletics + archery ranking/qualification boards.
-- ADDITIVE ONLY. NOT APPLIED to Supabase. Apply only to a disposable local cluster
-- or a future dev branch. Never run against production project zcubdqfzdbwtfcdsntoa
-- without explicit approval after registration closes.
--
-- Model (matches docs/ranked-results-contract.md):
--   ranked_boards        : one board per ranked event (tournament_category + label), holds explicit rules.
--   ranked_result_actions: append-only, one row per confirmed action, ordered by action_index.
--   Projection = replay action_index order through the app engine. Qualification is derived,
--   never an entrant insert and never a bracket seed.

-- ---------- tables ----------

CREATE TABLE IF NOT EXISTS public.ranked_boards (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id          uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  tournament_category_id uuid REFERENCES public.tournament_categories(id) ON DELETE CASCADE,
  label                  text NOT NULL CHECK (length(btrim(label)) > 0),
  rules                  jsonb NOT NULL,
  status                 text NOT NULL DEFAULT 'open' CHECK (status IN ('open','finalized')),
  created_by             uuid,
  created_at             timestamptz NOT NULL DEFAULT now(),
  -- minimal structural guard; full validation stays in the app engine
  CONSTRAINT ranked_boards_rules_mode_ck
    CHECK ((rules ->> 'mode') IN ('time','distance','points')),
  CONSTRAINT ranked_boards_unique UNIQUE (tournament_id, tournament_category_id, label)
);

CREATE TABLE IF NOT EXISTS public.ranked_result_actions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  board_id      uuid NOT NULL REFERENCES public.ranked_boards(id) ON DELETE CASCADE,
  action_index  integer NOT NULL CHECK (action_index >= 1),
  entrant_id    uuid NOT NULL REFERENCES public.entrants(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('attempt','status')),
  value_integer bigint,
  unit          text CHECK (unit IN ('ms','mm','points')),
  status        text CHECK (status IN ('DNS','DNF','DSQ')),
  rules_snapshot jsonb NOT NULL,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- exactly one of (attempt with value+unit) or (status)
  CONSTRAINT ranked_action_shape_ck CHECK (
    (kind = 'attempt' AND value_integer IS NOT NULL AND unit IS NOT NULL AND status IS NULL)
    OR
    (kind = 'status' AND status IS NOT NULL AND value_integer IS NULL AND unit IS NULL)
  ),
  CONSTRAINT ranked_action_index_unique UNIQUE (board_id, action_index)
);

CREATE INDEX IF NOT EXISTS ranked_result_actions_board_idx
  ON public.ranked_result_actions (board_id, action_index);

-- ---------- RLS: public read, writes only via SECURITY DEFINER RPC ----------

ALTER TABLE public.ranked_boards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranked_result_actions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ranked_boards_read ON public.ranked_boards;
CREATE POLICY ranked_boards_read ON public.ranked_boards FOR SELECT USING (true);

DROP POLICY IF EXISTS ranked_actions_read ON public.ranked_result_actions;
CREATE POLICY ranked_actions_read ON public.ranked_result_actions FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policies: only the definer RPCs below may write.

-- ---------- guarded append (compare-and-swap on action_index) ----------

CREATE OR REPLACE FUNCTION public.append_ranked_action_guarded(
  p_board_id uuid,
  p_entrant_id uuid,
  p_kind text,
  p_value_integer bigint,
  p_unit text,
  p_status text,
  p_rules_snapshot jsonb,
  p_expected_last_index integer
)
RETURNS TABLE (ok boolean, conflict boolean, action_index integer, last_index integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_uid uuid;
  v_tournament uuid;
  v_board_status text;
  v_current_last integer;
  v_next integer;
  v_new_id bigint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT tournament_id, status INTO v_tournament, v_board_status
  FROM public.ranked_boards WHERE id = p_board_id;
  IF v_tournament IS NULL THEN
    RAISE EXCEPTION 'board_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.is_tournament_staff(v_tournament,
       ARRAY['owner','co_organizer','referee','scorekeeper']) THEN
    RAISE EXCEPTION 'not_tournament_staff' USING ERRCODE = '42501';
  END IF;

  IF v_board_status <> 'open' THEN
    RAISE EXCEPTION 'board_not_open' USING ERRCODE = 'P0001';
  END IF;

  IF p_kind NOT IN ('attempt','status') THEN
    RAISE EXCEPTION 'bad_kind' USING ERRCODE = '22023';
  END IF;

  -- serialize writers for this board
  PERFORM pg_advisory_xact_lock(hashtextextended(p_board_id::text, 0));

  SELECT coalesce(max(rra.action_index), 0) INTO v_current_last
  FROM public.ranked_result_actions rra WHERE rra.board_id = p_board_id;

  IF coalesce(p_expected_last_index, 0) <> v_current_last THEN
    RETURN QUERY SELECT false, true, NULL::integer, v_current_last;
    RETURN;
  END IF;

  v_next := v_current_last + 1;

  INSERT INTO public.ranked_result_actions
    (board_id, action_index, entrant_id, kind, value_integer, unit, status, rules_snapshot, created_by)
  VALUES
    (p_board_id, v_next, p_entrant_id, p_kind, p_value_integer, p_unit, p_status, p_rules_snapshot, v_uid)
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT true, false, v_next, v_next;
END;
$function$;

REVOKE ALL ON FUNCTION public.append_ranked_action_guarded(uuid,uuid,text,bigint,text,text,jsonb,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_ranked_action_guarded(uuid,uuid,text,bigint,text,text,jsonb,integer) TO authenticated;

-- ---------- guarded undo (removes only the latest action, compare-and-swap) ----------

CREATE OR REPLACE FUNCTION public.undo_ranked_action_guarded(
  p_board_id uuid,
  p_expected_last_index integer
)
RETURNS TABLE (ok boolean, conflict boolean, last_index integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_uid uuid;
  v_tournament uuid;
  v_board_status text;
  v_current_last integer;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT tournament_id, status INTO v_tournament, v_board_status
  FROM public.ranked_boards WHERE id = p_board_id;
  IF v_tournament IS NULL THEN
    RAISE EXCEPTION 'board_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.is_tournament_staff(v_tournament,
       ARRAY['owner','co_organizer','referee','scorekeeper']) THEN
    RAISE EXCEPTION 'not_tournament_staff' USING ERRCODE = '42501';
  END IF;

  IF v_board_status <> 'open' THEN
    RAISE EXCEPTION 'board_not_open' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_board_id::text, 0));

  SELECT coalesce(max(rra.action_index), 0) INTO v_current_last
  FROM public.ranked_result_actions rra WHERE rra.board_id = p_board_id;

  IF v_current_last = 0 THEN
    RETURN QUERY SELECT false, false, 0;  -- nothing to undo
    RETURN;
  END IF;

  IF coalesce(p_expected_last_index, 0) <> v_current_last THEN
    RETURN QUERY SELECT false, true, v_current_last;
    RETURN;
  END IF;

  DELETE FROM public.ranked_result_actions
  WHERE board_id = p_board_id AND action_index = v_current_last;

  RETURN QUERY SELECT true, false, v_current_last - 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.undo_ranked_action_guarded(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_ranked_action_guarded(uuid,integer) TO authenticated;

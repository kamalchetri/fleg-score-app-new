-- NSPG governance — append-only audit log.
-- ADDITIVE ONLY. NOT APPLIED to Supabase. Apply only to a disposable local cluster
-- or a future dev branch. Never run against production project zcubdqfzdbwtfcdsntoa
-- without explicit approval.
--
-- Captures NOA-governance events (slide 13: competition created, result updated/finalized,
-- event published, role granted/updated, data exported, backup completed). Append-only.
-- Writes happen two ways:
--   1. DB triggers for tamper-resistant core events (tournament create/status, staff role, match finalize).
--   2. The log_audit_event() RPC for app/ops events (data_exported, backup_completed, publish intent).

CREATE TABLE IF NOT EXISTS public.audit_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  actor_id      uuid,                                   -- auth.uid() at the time; null for system
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  action        text NOT NULL CHECK (length(btrim(action)) > 0),
  entity_type   text,
  entity_id     text,
  details       jsonb NOT NULL DEFAULT '{}'::jsonb      -- non-PII summary only
);

CREATE INDEX IF NOT EXISTS audit_log_tournament_idx ON public.audit_log (tournament_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_occurred_idx   ON public.audit_log (occurred_at DESC);

-- ---------- RLS: staff/admin read; writes only via definer RPC + triggers ----------
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_read ON public.audit_log;
CREATE POLICY audit_log_read ON public.audit_log FOR SELECT
USING (
  tournament_id IS NOT NULL
  AND public.is_tournament_staff(tournament_id, ARRAY['owner','co_organizer'])
);
-- No client INSERT/UPDATE/DELETE policy. Append-only; no updates/deletes from anyone.

-- ---------- app/ops RPC ----------
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_tournament_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_details jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_uid uuid;
  v_id bigint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  -- when scoped to a tournament, require staff of it
  IF p_tournament_id IS NOT NULL
     AND NOT public.is_tournament_staff(p_tournament_id,
            ARRAY['owner','co_organizer','referee','scorekeeper']) THEN
    RAISE EXCEPTION 'not_tournament_staff' USING ERRCODE = '42501';
  END IF;
  IF p_action IS NULL OR length(btrim(p_action)) = 0 THEN
    RAISE EXCEPTION 'bad_action' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_log (actor_id, tournament_id, action, entity_type, entity_id, details)
  VALUES (v_uid, p_tournament_id, p_action, p_entity_type, p_entity_id, COALESCE(p_details, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.log_audit_event(uuid,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid,text,text,text,jsonb) TO authenticated;

-- ---------- tamper-resistant triggers ----------
-- helper to write a row regardless of RLS (SECURITY DEFINER context of trigger owner)
CREATE OR REPLACE FUNCTION public.audit_tournaments_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, public AS $f$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (actor_id, tournament_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), NEW.id, 'competition_created', 'tournament', NEW.id::text,
            jsonb_build_object('status', NEW.status));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_log (actor_id, tournament_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), NEW.id,
            CASE WHEN NEW.status = 'published' THEN 'event_published' ELSE 'tournament_status_changed' END,
            'tournament', NEW.id::text,
            jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NULL;
END;$f$;

DROP TRIGGER IF EXISTS audit_tournaments ON public.tournaments;
CREATE TRIGGER audit_tournaments
AFTER INSERT OR UPDATE ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.audit_tournaments_trg();

CREATE OR REPLACE FUNCTION public.audit_staff_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, public AS $f$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (actor_id, tournament_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), NEW.tournament_id, 'role_granted', 'user', NEW.user_id::text,
            jsonb_build_object('role', NEW.staff_role));
  ELSIF TG_OP = 'UPDATE' AND NEW.staff_role IS DISTINCT FROM OLD.staff_role THEN
    INSERT INTO public.audit_log (actor_id, tournament_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), NEW.tournament_id, 'role_updated', 'user', NEW.user_id::text,
            jsonb_build_object('from', OLD.staff_role, 'to', NEW.staff_role));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (actor_id, tournament_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), OLD.tournament_id, 'role_revoked', 'user', OLD.user_id::text,
            jsonb_build_object('role', OLD.staff_role));
  END IF;
  RETURN NULL;
END;$f$;

DROP TRIGGER IF EXISTS audit_staff ON public.tournament_staff;
CREATE TRIGGER audit_staff
AFTER INSERT OR UPDATE OR DELETE ON public.tournament_staff
FOR EACH ROW EXECUTE FUNCTION public.audit_staff_trg();

CREATE OR REPLACE FUNCTION public.audit_match_finalize_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, public AS $f$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.audit_log (actor_id, tournament_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), NEW.tournament_id, 'result_finalized', 'match', NEW.id::text, '{}'::jsonb);
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.audit_log (actor_id, tournament_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), NEW.tournament_id, 'result_reopened', 'match', NEW.id::text,
            jsonb_build_object('to', NEW.status));
  END IF;
  RETURN NULL;
END;$f$;

DROP TRIGGER IF EXISTS audit_match_finalize ON public.matches;
CREATE TRIGGER audit_match_finalize
AFTER UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.audit_match_finalize_trg();

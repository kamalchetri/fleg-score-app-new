-- NOT APPLIED.
-- Drops only append_score_event_guarded. Does not touch data, policies, or other functions.
-- Run on the development branch only, never on project zcubdqfzdbwtfcdsntoa.

DROP FUNCTION IF EXISTS public.append_score_event_guarded(uuid, text, jsonb, bigint);

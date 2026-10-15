-- SELECT only. Do not run this as a write, and do not add personal columns.
-- Excluded on purpose: full_name, phone, email, answers, reg_code, user_id,
-- display_name, contact_phone, payment ids, and document fields.
-- The result is a local snapshot for the dry-run classifier. It is not an import.

SELECT json_build_object(
  'inspectedAt', now(),
  'forms', COALESCE((
    SELECT json_agg(json_build_object(
      'id', f.id, 'slug', f.slug, 'sport', f.sport, 'status', f.status
    ) ORDER BY f.slug)
    FROM public.reg_forms AS f
    WHERE f.slug ILIKE 'nspg26-%'
  ), '[]'::json),
  'categories', COALESCE((
    SELECT json_agg(json_build_object(
      'id', c.id, 'formId', c.form_id, 'name', c.name, 'sortOrder', c.sort_order
    ) ORDER BY f.slug, c.sort_order, c.name)
    FROM public.reg_form_categories AS c
    JOIN public.reg_forms AS f ON f.id = c.form_id
    WHERE f.slug ILIKE 'nspg26-%'
  ), '[]'::json),
  'submissions', COALESCE((
    SELECT json_agg(json_build_object(
      'id', s.id, 'formId', s.form_id, 'status', s.status
    ) ORDER BY s.id)
    FROM public.reg_submissions AS s
    JOIN public.reg_forms AS f ON f.id = s.form_id
    WHERE f.slug ILIKE 'nspg26-%'
  ), '[]'::json),
  'links', COALESCE((
    SELECT json_agg(json_build_object(
      'submissionId', sc.submission_id, 'categoryId', sc.category_id
    ) ORDER BY sc.submission_id, sc.category_id)
    FROM public.reg_submission_categories AS sc
    JOIN public.reg_submissions AS s ON s.id = sc.submission_id
    JOIN public.reg_forms AS f ON f.id = s.form_id
    WHERE f.slug ILIKE 'nspg26-%'
  ), '[]'::json),
  'tournaments', COALESCE((
    SELECT json_agg(json_build_object(
      'id', t.id, 'slug', t.slug, 'sport', t.sport, 'status', t.status, 'visibility', t.visibility
    ) ORDER BY t.slug)
    FROM public.tournaments AS t
  ), '[]'::json),
  'entrants', COALESCE((
    SELECT json_agg(json_build_object(
      'id', e.id, 'tournamentId', e.tournament_id, 'categoryId', e.category_id, 'status', e.status
    ) ORDER BY e.id)
    FROM public.entrants AS e
  ), '[]'::json),
  'importLinks', '[]'::json
) AS snapshot;

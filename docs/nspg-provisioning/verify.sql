-- Read-only checks for a local cluster after a dry import. Inserts nothing.

SELECT 'link_duplicates' AS check_name,
       count(*) AS failures
FROM (
  SELECT submission_id, reg_category_id
  FROM public.nspg_import_links
  GROUP BY 1, 2
  HAVING count(*) > 1
) AS duplicate_links

UNION ALL

SELECT 'links_per_entrant',
       count(*)
FROM (
  SELECT entrant_id
  FROM public.nspg_import_links
  WHERE entrant_id IS NOT NULL
  GROUP BY entrant_id
  HAVING count(*) > 1
) AS shared_entrants

UNION ALL

SELECT 'non_auto_entrants',
       count(*)
FROM public.nspg_import_links
WHERE import_class <> 'auto_importable_singles'
  AND entrant_id IS NOT NULL

UNION ALL

SELECT 'nspg_tournaments_not_private_draft',
       count(*)
FROM public.tournaments
WHERE slug LIKE 'nspg26-%'
  AND (status <> 'draft' OR visibility <> 'private')

UNION ALL

SELECT 'link_category_mismatch',
       count(*)
FROM public.nspg_import_links AS l
LEFT JOIN public.tournament_categories AS c
  ON c.id = l.tournament_category_id
 AND c.tournament_id = l.tournament_id
WHERE c.id IS NULL

UNION ALL

SELECT 'link_entrant_mismatch',
       count(*)
FROM public.nspg_import_links AS l
JOIN public.entrants AS e ON e.id = l.entrant_id
WHERE e.tournament_id <> l.tournament_id
   OR e.category_id IS DISTINCT FROM l.tournament_category_id

UNION ALL

SELECT 'unproven_nspg_tournament',
       count(*)
FROM public.tournaments AS t
WHERE t.slug LIKE 'nspg26-%'
  AND NOT EXISTS (
    SELECT 1
    FROM public.nspg_import_objects AS o
    WHERE o.object_type = 'tournament'
      AND o.object_id = t.id
  );

-- Leaves one auto-importable confirmed link so the lock test can reach the tournament read.
DELETE FROM public.reg_submission_categories
WHERE submission_id <> '40000000-0000-4000-8000-000000000005'
   OR category_id <> '30000000-0000-4000-8000-000000000007';

DELETE FROM public.reg_submissions
WHERE id <> '40000000-0000-4000-8000-000000000005';

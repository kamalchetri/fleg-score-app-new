# NSPG provisioning safety review

Read-only production inspection on 12 October 2026. The migration and importer were not applied to Supabase project `zcubdqfzdbwtfcdsntoa`. Mutation tests ran only on a disposable local PostgreSQL cluster.

This package has no remote apply command. The only project reference the importer accepts is `local-fleg-nspg-provision`. Passing `zcubdqfzdbwtfcdsntoa` is refused.

## What the audit changed

- Dry-run is the default. Mode `apply` is the only write path. A missing mode stays a dry run. Any other spelling raises `apply_flag_required` and writes nothing.
- Apply also requires the local gate, the exact acknowledgement `ACKNOWLEDGE_NSPG_LOCAL_IMPORT`, a snapshot timestamp after registration close and no more than 15 minutes old, a 64-character SHA-256 digest of the classification fields, the full-snapshot counts, the approved candidate manifest, the candidate count, and an organizer id that already exists in `profiles`.
- Registration close is `2026-10-15 18:29:00+00`. An earlier clock is refused.
- The full snapshot may contain withdrawn, roster, pair, artistic, qualification, ranked, and multi-weight rows. Those counts are reported and do not, by themselves, refuse the import. Apply writes only the approved manifest, and only when every manifest row is one confirmed `auto_importable_singles` link. A blocked or withdrawn row in the manifest, a classification or count change, a removed category, a duplicate, or a cross-form or cross-tournament candidate aborts the whole transaction.
- Dates, venue, and city stay null only when `p_allow_null_schedule` is exactly true. The city value, when supplied, must be `kohima` or `dimapur`. Status and visibility must be passed as `draft` and `private`.
- `lock_timeout` is 3 seconds and `statement_timeout` is 15 seconds on the apply path.
- A rerun reuses a tournament, category, or entrant only when `nspg_import_objects` records that this importer created it.
- A link whose category or entrant belongs to a different tournament is rejected by a trigger.
- The sport-check change keeps `futsal`, `football`, `pickleball`, `basketball`, `badminton`, and `darts`, adds the 11 NSPG slugs, and checks existing rows before the constraint moves. `ADD CONSTRAINT ... NOT VALID`, `VALIDATE`, and the final rename are separate transactions so the strong lock is not held for the table scan.
- Rollback deletes only provenance rows. It restores the six-sport check only when that would not invalidate a remaining row. Otherwise the transaction rolls back.

`nspg_import_links` keeps the unique key `(submission_id, reg_category_id)`, foreign keys, and default-deny row level security. It stores linkage ids only.

## File check

Committed report `DRY-RUN-REPORT.md` has counts and public category names. It has no submission ids, contact details, answers, or document values. Identifier manifests stay in gitignored `.nspg-dry-run/`. Local fixture names are synthetic. The importer does not read `full_name`.

The live `tournaments_sport_check` still allows only the six original sports. Sports present in production are darts, football, futsal, and pickleball. `nspg_import_links` is absent. `entrants.city` still allows only null, `kohima`, or `dimapur`.

## Verification

`npx tsc --noEmit` exited 0. The TypeScript suites passed 162 tests and failed 0, including 19 in `tests/nspg-provision.test.ts`. The disposable local harness (`docs/nspg-provisioning/harness.ps1`, PostgreSQL 18 on `127.0.0.1:55433`) printed `HARNESS_OK`. On the mixed fixture it imported 3 auto-importable entrants and left the withdrawn and blocked rows without linkage. The same run covered manifest, hash, count-drift, timeout, and lock-timeout failures, each leaving zero `nspg26-%` tournaments. The temporary cluster was removed. Production was not written.

## Approval checklist

These decisions are still required before any production apply. This package cannot perform that apply.

| Decision | Needed from | Current state |
| --- | --- | --- |
| Organizer profile | NSPG organizers | Not selected. The importer will not choose one. |
| Tournament start and end | NSPG organizers | Null only if explicitly allowed. No guessed dates. |
| Venue and city | NSPG organizers | Null only if explicitly allowed. City must fit `kohima` or `dimapur` if stored on an entrant or tournament. |
| Final snapshot time | Operator, after `2026-10-15 18:29:00+00` | The 12 October export is already stale. Re-export and approve the counts in the same 15-minute window. |
| Withdrawn submissions | NSPG organizers | Six competition submissions, 13 links. Counted in the snapshot and excluded from the candidate manifest. Not imported. |
| Nine multi-weight submissions | NSPG organizers | One boxing submission and eight wushu submissions, 18 links. Excluded from the candidate manifest. Not imported. |
| Volleyball Men/Women overlap | NSPG organizers | 12 people and 13 links. Roster rows are excluded from the candidate manifest. Not imported. |
| Roster, pair, artistic, qualification, and ranked-result workflows | NSPG organizers | 409 roster, 39 pairs, 1 artistic, 46 qualification, 120 ranked. These workflows are still undecided. Their rows stay in the report and out of the manifest. |
| Database backup and rollback owner | Operator | Name the person who takes the backup and who may run the local rollback on a branch. No production rollback has been authorized. |

## Production risks that remain

Replacing `tournaments_sport_check` is still production DDL. Between the commit that adds the `NOT VALID` constraint and the commit that drops the old one, the old check still blocks NSPG sports. A crash there does not leave the table without a check. `VALIDATE` takes `SHARE UPDATE EXCLUSIVE` and can wait on other DDL; `lock_timeout` of 3 seconds fails that wait instead of holding a queue open. The final drop and rename need `ACCESS EXCLUSIVE` for a short catalog update and will fail closed if a lock is not available in 3 seconds.

Do not schedule that change, or any insert, until the checklist is complete and a fresh snapshot matches the approved counts.

# FLEG SCORE APP — NSPG delivery and seeding status

**Prepared:** 22 October 2026  
**Purpose:** Handoff report for Claude and the implementation team  
**Repository:** `fleg-score-app` (Expo SDK 57 / React Native 0.86 / expo-router)  
**Production Supabase project:** `zcubdqfzdbwtfcdsntoa`

## Executive summary

FLEG Score is now a working foundation for a multi-sport tournament platform: public NSPG viewing, organiser controls, live scoring engines, ranked-result recording, event discovery, profiles, analytics groundwork, kiosk/inquiry workflows, and accreditation/access-log groundwork are in the app.

The NSPG import process is deliberately fail-closed. Registration data is read and reconciled first; only approved, confirmed, workbook-listed, auto-importable singles are seeded as entrants. Team/roster, doubles/pairs, ranked/qualification, artistic, multi-weight, officials, withdrawn, duplicate, and unmatched rows are held back. Registration rows, Aadhaar/photo documents, payments, workshops, and public events are not modified by seeding.

## Product work completed

### App shell and access

- Electric Dark Score visual foundation, shared tokens, typography, cards, pills, buttons, inputs, and tab navigation.
- Supabase email/Google authentication and `useRole()` role gating.
- Both `organizer` (database spelling) and `organiser` are accepted for organiser access.
- Public NSPG/live viewing does not require login; organiser/admin and personal actions remain gated.
- Admin/organiser entry points are visible only to elevated roles.
- Native Android debug/release builds were installed and exercised on the physical device `2311DRN14I` (`GUMFUO69NZBQLBS8`).

### NSPG public experience

- NSPG hub, sport views, live match centre, Live tab, medal tally, branded NSPG presentation, and live subscription path.
- NSPG routes read through the NSPG live data layer rather than screens querying raw tables.
- Public match, fixture, schedule, and medal surfaces are seed-backed and designed to swap to live data at cutover.

### Organiser and tournament operations

- Role-gated organiser/admin dashboard and discipline grid.
- Tournament/discipline views for entrants, fixtures/brackets, schedules, scores, settings, publish state, venues, and referee assignment groundwork.
- Fixture/bracket helpers support generation, editing, entrant swaps/seeds/rounds, regeneration, and winner advancement in the seed workflow.
- Seed score-pad route resolves the tournament discipline instead of always opening football.
- Super-admin direction is reserved for the elevated admin account and must be enforced by the database role/RLS, not only by UI.

### Scoring and results

- Scoring engines/labs cover the NSPG disciplines through the supported archetypes: football/futsal, basketball, volleyball, sepaktakraw, badminton, table tennis, lawn tennis, combat sports (boxing, taekwondo, wushu sanda, wrestling, pencak silat/tanding), and ranked/measured disciplines such as athletics and archery.
- Ranked results support time (milliseconds, lower is better), distance (millimetres, higher is better), points (higher is better), statuses such as DNS/DNF/DSQ, shared ranks, and unresolved cut-line ties.
- Tennis, volleyball, sepaktakraw, archery, and ranked-results flows were manually exercised on the physical phone.
- Guarded scoring/RPC integration remains the production write boundary; UI can optimistically update, but authoritative RPC results must win during reconciliation.

### FLEG user experience and platform groundwork

- Home/Discover event feed, event cards, NSPG routing, event detail/registration groundwork, profile photo upload, athlete profile/analytics groundwork, kiosk Reg-ID lookup, accreditation/access-log groundwork, XP/streak/achievement groundwork, and notification direction.
- NSPG and FLEG branding assets were added/adjusted for public and organiser views.
- Several stale seed event cards were removed from the app feed; event freshness still needs a live-data policy before release.

## QA and verification history

- TypeScript was repeatedly kept clean with `npx tsc --noEmit` at each major checkpoint.
- Scoring/provisioning test milestones reported during the work included 115, 135, 143, 156, 162, and 172 passing tests as features were added; no failed test suite was reported at those checkpoints.
- Physical-device QA covered normal, advantage, tiebreak, deciding-set, completed, missing-rules, long-name, undo, review, and bottom-navigation safety cases.
- Development-build reliability issues were diagnosed as Metro connectivity, ADB reverse/tunnel selection, Node heap limits, and Gradle memory/daemon problems; these are development workflow issues, not production data changes.

## Production safety posture

- No production migrations were run for the NSPG seed work.
- Existing FLEG events, registrations, payments, workshops, public events, and non-NSPG entrants were left untouched.
- Seed tournaments use deterministic `nspg26-*` slugs and remain `draft`/`private` until an explicit publish decision.
- Import idempotency is based on `(submission_id, reg_category_id)` with provenance in `nspg_import_links` and `nspg_import_objects`.
- Guard checks include project/snapshot identity, registration digest, candidate counts, organiser validity, category classification, withdrawn/duplicate/cross-form checks, lock/statement timeouts, rollback, and post-insert verification.
- A failed guard or verification rolls back the complete import. A rerun may reuse only objects proven to have been created by this importer.
- Personal fields are not copied into importer manifests. Aadhaar/photo source data remains in the registration system for the separate ID/accreditation process.

## How district seeding is done

1. Receive the district workbook from the verification team.
2. Read the actual athlete/official sheets; do not trust a workbook summary cell when it conflicts with row counts.
3. Match workbook registration IDs to live confirmed registration records and verify district, gender, category, withdrawal state, and duplicates.
4. Treat the workbook as the candidate boundary. Live records absent from the approved workbook are not added automatically.
5. Classify every link. Only `auto_importable_singles` may proceed in the first controlled seed.
6. Exclude officials, withdrawn links, team/roster entries, doubles/pairs, ranked/qualification/artistic entries, multi-weight conflicts, duplicates, and unmatched/changed records.
7. Produce a review list with counts and IDs for the district team.
8. Apply only after the approved snapshot/digest/counts and organiser gate match. The transaction creates or reuses the NSPG tournament/category/entrant objects and linkage rows, then verifies counts before commit.
9. Keep the source registration rows and documents intact. Seeding is additive and provenance-tracked.

## District seeding status

| District | Status | Result |
|---|---|---|
| Tseminyu | **Seeded** | 37 entrants/links |
| Longleng | **Seeded** | 16 entrants/links |
| Noklak | **Seeded** | 23 entrants/links |
| Peren | **Seeded** | 29 entrants/links |
| Mon | **Seeded** | 36 entrants/links; only approved singles imported |
| Shamator | **Seeded** | 22 singles (combat/racket) + held-back teams/individuals now seeded |
| Tuensang | **Seeded** | 31 singles (combat/racket) + held-back teams/individuals now seeded |

## Addendum — 22 Oct 2026 (Claude): all 7 districts + held-back entrants seeded

Shamator + Tuensang singles were seeded via the existing guarded `nspg_seed_verified_districts`
(district whitelist extended to all 7; dry-run hash matched, organizer gate + post-insert
verification passed). Singles total went **141 → 194**.

The held-back entrants (teams, ranked individuals, relays, doubles-as-squad) were then seeded
via a new companion importer `nspg_seed_heldback_v1` — same fail-closed design (project ref +
acknowledgement + organizer + snapshot-hash gates, advisory lock, ON CONFLICT idempotency,
post-insert verification, provenance in `nspg_import_links`/`nspg_import_objects`). It was
verified on isolated Postgres (dry-run/apply counts, roster correctness, combat exclusion,
pre-seeded-singles untouched, **stable-hash idempotency**, all four guards) before production.

The three singles-only CHECKs on `nspg_import_links` were additively relaxed (loosening only)
to allow `grain='district_team'` and `import_class IN ('heldback_individual','heldback_team')`;
the shared `UNIQUE(submission_id,reg_category_id)` now cross-guards both importers.

**Model:** individual ranked events (athletics track/field, archery individual, pencak tunggal/
solo) → one `singles` entrant per athlete; collective events (football, volleyball, basketball,
sepaktakraw, athletics relays, archery team, badminton/table-tennis team + doubles squads,
pencak ganda/regu) → one `team` entrant per district with full roster in `players[]`.

**Production state after this session (reconciled):**
- `nspg_import_links` = **1246** (194 singles + 298 held-back individual + 754 team members), 0 orphans.
- NSPG entrants = **605** (194 singles + 298 individual + 113 district teams), 0 empty rosters.
- NSPG tournaments = **13** (7 combat/racket + football, volleyball, basketball, sepaktakraw, athletics, archery), 122 categories.
- All 13 tournaments remain **draft/private**; the `nspg_v_*` read-views are **not** applied. Read-path switch (apply B2 views + publish) is the deliberate cutover step, gated until after registration close (24 Oct) — not flipped while registration is live.

**Held back for organiser review (not auto-seeded):** 2 wushu Sanda multi-weight rows
(athlete registered in 2 weight classes — needs a weight choice); badminton/TT doubles are
seeded as district squads (no partner field exists to form deterministic pairs — organiser
pairs in the fixture builder). Mon/Peren 5 earlier corrections still await the organiser.

The five seeded districts total **141** imported entrants/links. After the Mon seed, the production audit showed **7 NSPG tournaments, 54 NSPG categories, and 141 NSPG entrants** in importer provenance. The wider production database showed **24 tournaments and 404 entrants**, with the non-NSPG baseline unchanged at **17 tournaments and 263 entrants**. *(Superseded by the 22 Oct addendum below: now 7 districts, 13 NSPG tournaments, 605 NSPG entrants.)*

Other district workbooks (including Wokha, Kohima, Phek, Dimapur, and others) were reviewed or updated during the verification process. They must not be considered seeded unless they are explicitly added to the seeded table above and verified in production.

## Current gaps before association release

- Complete the reusable, reviewed seed path for every remaining verified district; correct the Tuensang snapshot/hash and rerun only after a fresh export.
- Keep held-back team/doubles/ranked/qualification/artistic entries out of singles imports until their tournament-specific roster/result model is approved.
- Finish production-grade fixture/bracket, group-table, schedule, venue/court, referee, publish, and result workflows across all 16 disciplines.
- Finish detailed athlete analytics: match history, sport-specific statistics, rankings, medals, XP economy, streaks, achievements, and polished animations.
- Finish volunteer/kiosk role policies, camera QR scanning, checkpoint configuration, access-log permissions, and device notifications.
- Replace seed event content with a freshness/visibility policy so completed events never appear as top/upcoming items.
- Complete visual polish across Home, Discover, NSPG, Live, Profile, organiser, scoring, and ranked-result screens, including safe-area/bottom-navigation handling.
- Confirm privacy policy, Terms, account deletion, consent, document handling, and Play Store/App Store disclosures before publishing.
- Produce and test the final signed release AAB/APK, with crash/log monitoring and an association feedback checklist.

## Handoff rules for Claude

- Do not run a production migration or broad update while NSPG registration/event data is live.
- Do not seed by querying every live district record. Start from the approved workbook and reconcile against live registrations.
- Do not delete unmatched, withdrawn, duplicate, or older registration records. Record them for review.
- Before every district apply, re-export the snapshot, recompute the canonical registration digest, confirm counts, and run a dry run.
- Treat the seeded table in this report as the source of truth for what has actually been written. Shamator and Tuensang are **not** seeded.

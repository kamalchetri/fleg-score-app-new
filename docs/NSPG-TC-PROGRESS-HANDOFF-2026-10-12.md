# NSPG 2026 — FLEG scoring and tournament operations progress handoff

**Prepared for:** NSPG Technical Committee and the next engineering collaborator  
**Prepared on:** 12 October 2026 (IST)  
**Repository:** `fleg-score-app`  
**Production database:** Fleg-web Supabase project `zcubdqfzdbwtfcdsntoa`  
**Overall status:** Scoring foundations and development prototypes are working; NSPG tournament provisioning has **not** been applied to production.

## 1. Executive summary

The FLEG scoring app has been extended to understand all 14 NSPG competition sports without silently falling back to the wrong scoring system. Match scoring is implemented for the sports that fit the current two-entrant match model, and a separate development prototype now covers multi-entrant athletics and archery ranking results.

The app has been tested through automated TypeScript suites, disposable local PostgreSQL harnesses, emulator visual checks, and manual interaction on a physical Android phone. The latest full application run reported **172 passing tests and zero failures**.

The live NSPG registrations were inspected read-only. Registrations are growing quickly and remain open until **15 October 2026 at 11:59 PM IST** (`2026-10-15 18:29:00+00`). At the latest recorded inspection, there were **446 confirmed competition submissions and 791 confirmed competition category links**. None of these registrations has been changed.

A fail-closed provisioning package has been prepared and tested locally. It can classify registrations and, on a synthetic local database, import only an approved subset of valid singles entries without touching blocked entries. It deliberately refuses the production project, has no remote apply command, and is **not approved for production**.

The main remaining work is operational rather than basic scoring: confirm official rules, select the tournament organizer, provide dates and venues, resolve team rosters and doubles partners, resolve multi-weight registrations, finalize ranked-event persistence, freeze a fresh registration snapshot after registration closes, and obtain explicit approval before any production database change.

## 2. Non-negotiable safety position

- Production registrations, payments, workshops, public events, existing tournaments, and existing entrants have not been modified by this work.
- No NSPG tournaments, categories, stages, matches, or entrants have been created in production.
- The guarded scoring RPC has not been deployed.
- The ranked-results database migration proposed as the next task has **not** been created or run.
- The production `tournaments.sport` constraint still allows only `futsal`, `football`, `pickleball`, `basketball`, `badminton`, and `darts`.
- The new NSPG sport constraint and provisioning SQL exist only as unapplied local files.
- Development lab rule values are test fixtures. They are not official NSPG rules or presets.
- The app must never use a service-role key on the client.
- Unknown sports, missing rules, invalid rules, and unsupported formats fail closed. They must never fall through to futsal, a generic point pad, or another sport.

## 3. Live NSPG registration snapshot

The latest recorded read-only inspection was at `2026-10-12T09:46:40Z` (3:16 PM IST). Registration was still open, so these figures are already a snapshot rather than a final import count.

| Item | 11 Oct snapshot | 12 Oct snapshot | Change |
| --- | ---: | ---: | ---: |
| Confirmed competition submissions | 359 | 446 | +87 |
| Confirmed competition category links | 606 | 791 | +185 |
| Withdrawn competition submissions | 6 | 6 | 0 |
| Competition forms | 14 | 14 | 0 |
| Competition categories | 174 | 174 | 0 |
| NSPG tournaments in production | 0 | 0 | 0 |

Officials and staff forms are separate from competition registrations. The latest report excluded **92 officials links**: 89 confirmed and 3 withdrawn.

### Current link classification

Every confirmed competition link was classified exactly once.

| Classification | Current count | Meaning |
| --- | ---: | --- |
| Auto-importable singles | 158 | Can become individual tournament entrants after final approval and provisioning |
| Archery qualification pending | 46 | Olympic-round interest; qualification must happen before bracket entry |
| Ranked-result event | 120 | Athletics or archery ranking/qualification workflow, not a two-person match |
| District/team/squad roster required | 409 | Requires a real team or squad roster |
| Unlinked doubles/mixed doubles | 39 | Requires an explicit partner or pair |
| Artistic ensemble | 1 | Requires an ensemble/entry decision |
| Multi-weight conflict | 18 | Nine submissions selected multiple combat weight classes |
| Other unresolved | 0 | No unknown residual classification |

Important classification rules already enforced:

- Racket singles remain importable even when the same submission also selected doubles or team events.
- Pencak Silat Tanding may be importable while an Artistic Regu selection remains blocked.
- Sepaktakraw “Double” is treated as a squad category, not as an individual doubles pair.
- A combat submission with multiple selected weight classes is blocked until one class is chosen.
- Officials forms are excluded from competition provisioning.
- Only confirmed submissions qualify for an import candidate manifest.

Other live-data observations:

- Nine multi-weight submissions account for 18 blocked links: one boxing submission and eight wushu submissions.
- Six withdrawn competition submissions account for 13 category links. They remain visible for review and are not deleted or imported.
- Volleyball currently has 12 people and 13 links, meaning one submission selected both Men and Women. This requires organizer review.
- There were no duplicate submission/category pairs, cross-form links, unknown categories, or existing `nspg26-` tournament slug collisions at the latest check.

## 4. Supabase contract and current production reality

NSPG registrations live in the existing registration system:

- Forms: `reg_forms`
- Categories: `reg_form_categories`
- Submissions: `reg_submissions`
- Submission/category links: `reg_submission_categories`

Tournament operation uses a separate model:

- `tournaments`
- `tournament_categories`
- `stages`
- `matches`
- `entrants`
- `entrant_contacts`
- `score_events`
- `tournament_staff`

A confirmed registration does not automatically become a tournament entrant. There is no foreign key, trigger, or production function that copies an NSPG submission into `entrants`. Submission status does not have an `approved` value; `approved` belongs to tournament entrants.

There are currently zero NSPG tournaments. The nearby `noa-football-demo-2026` tournament is a separate demo and is not linked to the NSPG football registration form.

The Supabase Realtime publication had no member tables at the time of inspection, so the mobile match screens use polling where cross-device updates are required.

Full schema findings are recorded in `docs/NSPG-SUPABASE-CONTRACT.md`.

## 5. Mobile scoring work completed

### NSPG sport registry

`lib/sports/nspg.ts` is the central NSPG sport registry. It provides canonical slug normalization, category-aware scoring support, engine selection, and fail-closed behavior.

Canonical competition sports:

1. Archery
2. Athletics
3. Badminton
4. Basketball
5. Boxing
6. Football
7. Lawn Tennis
8. Pencak Silat
9. Sepaktakraw
10. Table Tennis
11. Taekwondo
12. Volleyball
13. Wrestling
14. Wushu

Aliases such as `lawn tennis`, `lawn-tennis`, `sepak takraw`, and `sepak-takraw` normalize to their stored slugs. Unknown sports resolve to no engine.

### Scoring support matrix

| Sport or format | Current scoring status | Notes |
| --- | --- | --- |
| Football | Supported | Uses the existing futsal-style engine intentionally |
| Basketball | Supported | Existing engine preserved |
| Badminton | Supported | Existing engine preserved |
| Boxing | Supported | Explicit combat bout result |
| Taekwondo | Supported | Explicit combat bout result |
| Wrestling | Supported | Explicit combat bout result |
| Wushu Sanda | Supported | Category-gated combat engine |
| Pencak Silat Tanding | Supported | Category-gated combat engine |
| Table Tennis Singles | Supported with explicit rules | No fallback when rules are missing |
| Lawn Tennis Singles | Supported with explicit rules | Points, games, sets, tiebreaks, undo |
| Volleyball | Supported with explicit rules | Rally points, sets, deciding set, optional caps |
| Sepaktakraw | Supported with explicit rules | Rally/set engine; Double remains a squad category |
| Archery Olympic/head-to-head | Supported with explicit rules | Set-points or cumulative format, end review, explicit shoot-off |
| Athletics ranked results | Development prototype | Multi-entrant in-memory lab only |
| Archery ranking/qualification | Development prototype | Multi-entrant in-memory lab only; does not create bracket entrants |
| Artistic Pencak Silat | Unsupported | No rules or ensemble workflow approved |
| Non-Sanda Wushu | Unsupported | No scoring engine is guessed |
| Racket doubles/team categories | Unsupported pending pairs/rosters | Singles engines do not accept them |

### Explicit-rule policy

New engines activate only when the sport/category is supported and the match has a complete, valid rules object. Missing or invalid configuration shows **Rules not configured** and renders no scoring controls.

The development fixtures use example values only. Official NSPG rule objects still need to be supplied and approved for real matches.

### Shared match UI

Real match control and `/scoring-lab` use the same `MatchScoringView`. Important layout fixes include:

- Long participant names wrap rather than ending in an ellipsis.
- Equal name columns keep the score centered.
- Scoring views include enough trailing space to move Undo, end-period, review, and confirmation controls above the system navigation area.
- The scoring-lab fixture controls remain above the shared view.
- The development clock ticks once per second.

### Match event behavior

- Score engines are implemented as pure projections over confirmed score events.
- Undo can reopen games, sets, bouts, shoot-offs, and completed matches where supported.
- Events submitted after completion are ignored by the projection.
- Match result confirmation remains a separate action from recording the final scoring event.
- `matches.score` is read for safe public snapshots when a sport does not expose interactive scoring.

## 6. Individual engines added

### Combat bouts

Combat matches record one explicit `bout_result` containing the winner, optional points, result method, and note. The winner is never inferred from tied or missing points. Undo reopens the bout.

### Table Tennis Singles

Supports explicitly configured best-of games, points-to, required winning margin, optional cap, match completion, and undo. Doubles, mixed doubles, and team categories remain unsupported.

### Lawn Tennis Singles

Supports 0/15/30/40, deuce, advantage, games, sets, regular-set tiebreaks, explicitly configured deciding-set behavior, completion, and undo. No service-order behavior was invented.

### Volleyball

Supports explicitly configured best-of sets, regular and deciding-set targets, winning margin, optional caps, completion, and undo.

### Sepaktakraw

Uses a separate sport route over a shared rally/set foundation. It supports explicit regular/deciding-set rules, margins, caps, completion, and undo. It does not infer service, rotation, substitution, or technical-penalty rules.

### Archery head-to-head

Supports explicit `set_points` and `cumulative` formats. Staff enter and review both end totals before recording. Values are bounded by arrows-per-end and maximum arrow score. Regulation ties require an explicit shoot-off winner; equal optional shoot-off scores do not override that selected winner.

Ranking and qualification categories do not enter this engine.

## 7. Ranked-results prototype

The development-only route `/ranked-results-lab` implements a pure, in-memory, multi-entrant board for future athletics and archery ranking workflows.

Supported explicit modes:

- `time`: stored as integer milliseconds; lower ranks first
- `distance`: stored as integer millimetres; higher ranks first
- `points`: stored as integer points; higher ranks first

It supports reviewed result entry, multiple attempts, best/final aggregation, shared ranks, qualifier-count previews, boundary-tie detection, `DNS`, `DNF`, `DSQ`, edit-before-confirm, and undo.

A tie that crosses the qualification cut is shown as **Unresolved tie**. Nobody in that tied group is automatically selected. Qualifier lists are informational and never create an entrant or bracket.

`docs/ranked-results-contract.md` proposes a future append-only persistence shape. It is documentation only. No ranked-results table, RPC, migration, or mobile database integration exists yet.

## 8. Guarded scoring writes

An unapplied RPC package exists under `docs/append-score-event-guarded/`.

The proposed `append_score_event_guarded` function:

- Requires an authenticated tournament staff member.
- Requires the match to be live.
- Takes an advisory transaction lock and rereads the match with `FOR UPDATE`.
- Compares the client’s expected last confirmed event ID.
- Appends exactly one event when current.
- Returns a conflict and inserts nothing when another device wrote first.
- Leaves `created_by` and `tournament_id` to the existing trigger.

The local PostgreSQL concurrency harness proved that two simultaneous writers produce exactly one insert and one conflict.

The mobile integration is behind `EXPO_PUBLIC_GUARDED_SCORING_ENABLED`, which defaults to false and is not enabled in `eas.json`. When enabled in code, an RPC failure never falls back to an unsafe direct insert.

**Current production behavior remains the legacy direct score-event insert because the RPC has not been deployed and the flag remains off.**

New event types used by later engines have been added only to the unapplied migration allow-list.

## 9. Development labs and device verification

### Scoring lab

- Route: `/scoring-lab`
- Development-only; production renders “Not available”
- Uses in-memory fixtures
- Uses the same `MatchScoringView` as real match control
- Makes no Supabase scoring calls

### Ranked-results lab

- Route: `/ranked-results-lab`
- Development-only prototype
- Entirely in memory
- Uses a dedicated multi-entrant view rather than forcing ranked events into a two-person match UI

### Physical Android verification

The scoring app was built and installed as package `in.fleg.score` on:

- Device model: `2311DRN14I` (`gale_in`)
- ADB serial: `GUMFUO69NZBQLBS8`

The separate player app `com.kamalchetri.flegmobile` was not cleared, overwritten, or uninstalled.

Manual physical-phone checks passed for:

- Lawn Tennis
- Volleyball
- Sepaktakraw
- Archery head-to-head, including numeric keyboard and review flow
- Ranked results, including time, distance, points, ties, statuses, long names, and finalized state
- Scrolling and control clearance above the phone’s three-button navigation bar

The local Android prebuild generated an ignored `android/` directory and updated the package scripts to use `expo run:android` and `expo run:ios`. `expo-dev-client` was not added, and Expo Go was not used for the physical-phone pass.

Metro used port 8085 for the scoring app and is now stopped. Port 8084 belonged to the separate player-app session and was left alone. The installed scoring build remains on the phone.

Earlier phone/tablet emulator screenshots and QA notes are under `docs/qa/scoring-lab/`.

## 10. Registration, payment, and event-feed work

Separate web payment routes were prepared for paid registration forms:

- `POST /api/payments/forms/create-order`
- `POST /api/payments/forms/verify`

They load the registration submission, reject expired holds, handle already-paid submissions idempotently, create/verify Razorpay orders, and store confirmed payment data. The mobile app calls these form-specific routes with `submissionId` and avoids reopening checkout when already paid. Free events remain unchanged.

This web behavior becomes live only after the corresponding `Fleg-score` web deployment. Deployment status was not confirmed in this workstream. Razorpay checkout still requires a native development build rather than Expo Go.

Workshops from `public_events` were added to the mobile Events feed beside tournaments and registration forms. Workshop cards link to `https://www.fleg.in/workshops/{slug}` and do not enter the in-app registration flow.

## 11. Provisioning package completed locally

Files under `lib/nspg-provision/`, `scripts/nspg-dry-run.ts`, and `docs/nspg-provisioning/` implement and document a deterministic, fail-closed provisioning dry run.

### Separation of inputs

The package distinguishes:

1. **Full snapshot:** the complete classification record, including withdrawn and blocked links.
2. **Classification report:** non-sensitive counts and public category names.
3. **Candidate manifest:** only approved, confirmed `auto_importable_singles` links.

The candidate manifest uses `(submission_id, reg_category_id)` as the idempotency key. Identifier manifests stay under gitignored `.nspg-dry-run/` and are not printed into reports.

The snapshot digest is a deterministic, lowercase, 64-character SHA-256 over canonical classification fields. It excludes personal fields and changes when relevant status, submission, category, link, or classification data changes.

### Local-only safety gates

- Dry-run is the default.
- Only the exact mode `apply` can enter a write path.
- A local database setting, exact acknowledgement, valid organizer, approved counts, fresh snapshot, matching hash, draft status, and private visibility are required.
- The only accepted project reference is `local-fleg-nspg-provision`.
- The real production project reference is refused before any write.
- A snapshot must be taken after registration closes and must be no more than 15 minutes old.
- A blocked or withdrawn link inside the candidate manifest aborts the transaction.
- Classification, status, category, count, hash, or ownership drift aborts the transaction.
- Reruns reuse only objects recorded as created by the importer.
- All writes are transactional with finite lock and statement timeouts.

### Local harness result

A realistic synthetic mixed snapshot imported only three valid singles entries, creating three local tournaments, three categories, three entrants, and three links. The withdrawn submission and nine blocked links remained untouched. Repeating the same apply inserted nothing.

The disposable PostgreSQL 18 harness covered authorization gates, stale snapshots, registration-open refusal, count drift, invalid organizer, slug ownership, cross-tournament links, lock and statement timeouts, verification failure, rollback, malformed input, repeated apply, and unchanged unrelated data. It printed `HARNESS_OK` and removed its temporary cluster.

### Sport constraint proposal

The unapplied migration preserves the six existing allowed sports and adds the remaining NSPG canonical slugs. It separates constraint validation from the short access-exclusive drop/rename step and uses a three-second lock timeout.

This remains production DDL and still requires a backup, an approved operator, a quiet execution window, and explicit authorization.

## 12. Test status

Latest reported application result:

- TypeScript: `npx tsc --noEmit` passed
- Automated suites: **14**
- Tests: **172 passed, 0 failed**

The suites cover the original scoring engine, formats, darts, guarded scoring, NSPG registry, scoring lab, combat, table tennis, lawn tennis, volleyball, Sepaktakraw, archery, ranked results, and NSPG provisioning.

Separate disposable PostgreSQL harnesses also passed for:

- Guarded match-score concurrency
- NSPG provisioning and rollback safety

No temporary PostgreSQL cluster remains running.

## 13. Decisions and work still outstanding

### Required from the NSPG Technical Committee

1. Select the production organizer profile that will own the NSPG tournaments.
2. Confirm tournament start/end dates.
3. Confirm venues and whether city values should be `kohima`, `dimapur`, or left null where allowed.
4. Approve official scoring rules for every real category. Lab values must not be copied without approval.
5. Resolve the nine multi-weight combat submissions.
6. Review the Volleyball Men/Women overlap.
7. Supply team and squad rosters for 409 category links.
8. Supply partners for 39 doubles/mixed-doubles links.
9. Decide the artistic ensemble workflow.
10. Approve the archery qualification process and Olympic-round seeding procedure.
11. Approve athletics and archery ranked-result workflows, including attempts, statuses, ties, qualification cuts, and finalization authority.
12. Name the database backup operator and the person authorized to execute or reverse a production change.

### Engineering work remaining

1. Do not prepare a final import snapshot until registration closes on 15 October 2026 at 11:59 PM IST.
2. Build and locally test ranked-results persistence and guarded concurrency. The suggested prompt for that task was discussed but has **not been run**.
3. Design the roster/partner intake and validation workflow without inventing missing people from registration answers.
4. Decide whether ranked-event participants use existing entrants or a separate approved participant model.
5. Configure official rules on real tournament categories/matches.
6. Create stages, brackets, schedules, and staff assignments only after tournaments and eligible entrants are approved.
7. Deploy and enable guarded scoring only after the RPC is reviewed on a safe database environment.
8. Repeat physical-device checks against real configured matches, including multi-device conflict behavior.
9. Confirm the web form-payment routes are deployed before relying on paid mobile registration.
10. Review, organize, and commit the large current working tree. Nothing in this workstream was committed.

## 14. Recommended continuation sequence

1. **Collect TC decisions and official rules** while registration remains open.
2. **Design roster and partner intake** for blocked team/pair categories.
3. **Finish ranked-results persistence locally**, with no production deployment.
4. **After registration closes**, export a fresh read-only snapshot and rerun classification.
5. Resolve every count drift, withdrawn candidate, multi-weight conflict, and organizer decision.
6. Take an approved database backup and select a low-traffic execution window.
7. Review the exact sport-constraint DDL and candidate manifest.
8. Apply only the approved private draft tournaments and auto-importable subset through a separately authorized production procedure.
9. Verify production counts immediately and stop on any mismatch.
10. Add rosters, pairs, qualification results, stages, and schedules through separately approved workflows.
11. Run end-to-end rehearsal on physical devices before the live event.

## 15. Instructions for Claude or another incoming collaborator

- Read this document, `docs/NSPG-SUPABASE-CONTRACT.md`, `docs/NSPG-TOURNAMENT-PROVISIONING-PLAN.md`, and `docs/nspg-provisioning/SAFETY-REVIEW.md` before changing anything.
- Treat production Supabase as read-only unless Kamal explicitly approves a specific production operation after registration closes.
- Preserve all existing registration, payment, event, workshop, tournament, entrant, and scoring data.
- Do not interpret confirmed registrations as approved entrants.
- Do not create team members, partners, weight classes, qualifiers, winners, or rules from assumptions.
- Do not enable guarded scoring until its RPC exists in the target database.
- Do not allow an RPC failure to fall back to a direct write.
- Keep new sport engines driven by explicit validated configuration.
- Keep ranked events separate from two-entrant matches.
- Never commit local identifier manifests or personal registration data.
- The repository has a large uncommitted working tree. Inspect and preserve overlapping changes rather than resetting or replacing them.
- Before reporting completion, run TypeScript, all automated suites, and the relevant local PostgreSQL harness.

## 16. Key files

| Area | Files |
| --- | --- |
| Live schema contract | `docs/NSPG-SUPABASE-CONTRACT.md` |
| Provisioning plan | `docs/NSPG-TOURNAMENT-PROVISIONING-PLAN.md` |
| Provisioning safety review | `docs/nspg-provisioning/SAFETY-REVIEW.md` |
| Provisioning SQL and harness | `docs/nspg-provisioning/` |
| Provisioning TypeScript | `lib/nspg-provision/`, `scripts/nspg-dry-run.ts` |
| Sport registry | `lib/sports/nspg.ts` |
| Scoring engines | `lib/scoring/` |
| Shared match scoring UI | `components/scoring/MatchScoringView.tsx` |
| Development scoring lab | `app/scoring-lab.tsx`, `lib/scoring-lab/fixtures.ts` |
| Scoring visual QA | `docs/qa/scoring-lab/` |
| Ranked-results prototype | `lib/ranked-results/`, `components/ranked-results/`, `app/ranked-results-lab.tsx` |
| Ranked-results contract | `docs/ranked-results-contract.md` |
| Guarded scoring package | `docs/append-score-event-guarded/`, `lib/guarded-scoring.ts` |
| Database types | `lib/database.types.ts` |
| Automated tests | `tests/` |

## 17. Final status statement

The scoring and classification work has substantially reduced technical uncertainty for NSPG 2026. The application can represent the supported match formats safely, the physical-phone interaction has been validated for the newest workflows, and the provisioning plan can distinguish valid singles from registrations that need additional information.

However, **the production NSPG tournament environment does not yet exist**. No production provisioning, new sport constraint, guarded scoring RPC, ranked-results schema, roster import, bracket generation, or official-rule configuration has been deployed. Moving from the current preparation state to live tournament operation requires TC decisions, a final post-close snapshot, an approved backup and execution plan, and explicit production authorization.

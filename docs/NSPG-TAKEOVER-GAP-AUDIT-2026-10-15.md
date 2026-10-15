# NSPG 2026 / FLEG Score takeover gap audit

**Date:** 15 October 2026 (IST)  
**Scope:** FLEG Score mobile app, NSPG 2026 operational readiness, and the NOA × FLEG Score proposal.  
**Safety boundary:** This is a read-only audit. No Supabase data, policies, functions, migrations, registrations, payments, workshops, tournaments, or entrants were changed.

## Executive position

The app has a strong scoring and safety foundation, but it is not yet a complete NSPG competition-operations system. The scoring engines and in-memory review labs cover the major sport archetypes; the provisioning package can fail closed and import only an explicitly approved singles subset. The production database still has no NSPG tournaments, stages, matches, rules records, ranked-results persistence, or approved roster/partner linkage.

The immediate safe deliverable is a no-login review APK using sample data only. Production cutover must wait for technical-committee decisions, a fresh post-close registration snapshot, explicit organizer/date/venue decisions, and an approved dev-branch database rehearsal. The proposal's long-term athlete-record and sports-intelligence vision is a roadmap, not a prerequisite for the first NOPG pilot.

## What the NOA proposal asks for

The attached proposal describes a single digital chain: registration → competition setup → fixtures → live scoring → results → archive → athlete history. For NOPG 2026 it expects online registration, competition management, live scores where applicable, results/standings, exportable records, and a foundation for future athlete and state-wide analytics. It also calls for role-based governance, backups, auditability, controlled publishing, and NOA ownership of official sporting records.

The proposal is strategic guidance, not a database migration or an authorization to write production data.

## Current status against that request

| Area | Current state | Readiness |
| --- | --- | --- |
| Registration | NSPG forms and live registrations exist on Fleg web; registration-to-entrant is intentionally not automatic. | Live registration, not competition-ready |
| Sport registry | NSPG sport/category routing is centralized and fail-closed. Unsupported categories do not fall through to futsal. | Ready for review; production schema still unchanged |
| Match scoring | Football, basketball, badminton, futsal, pickleball, darts, table tennis singles, lawn-tennis singles, volleyball, sepaktakraw, combat bouts, and archery H2H have guarded routing/engine coverage as appropriate. | Lab-ready; production rules/data not provisioned |
| Ranked results | Time, distance, and points ranking is implemented as an in-memory lab with DNS/DNF/DSQ and unresolved-cut-tie behavior. | Review lab only; no production persistence |
| Rules | Presets exist for several sports and engines fail closed when rules are absent or invalid. TC review remains pending; lawn-tennis and some combat details require decisions. | Defaults pending approval |
| Review access | Scoring and ranked labs exist, but WO-6 review-build exposure and no-login entry still need to be completed and verified. | Immediate engineering task |
| Provisioning | Dry-run classification, candidate manifest, digest, idempotency, rollback, and fail-closed gates are documented/tested locally. | Safe local package; not approved for production |
| Teams/pairs/rosters | Current registration forms are person submissions without authoritative team, partner, or roster fields. | Blocked until explicit roster/partner intake |
| Competition operations | No NSPG tournaments, categories, stages, matches, staff assignments, schedules, or venues exist in production. | Not started |
| Governance | Governance/readiness and organizer-hub work is present in the checkpoint; production roles and audit schema are not deployed. | App groundwork only |
| Athlete record/history | Proposed by NOA; no approved identity/linkage/history model is live. | Roadmap / schema decision needed |
| Dashboards/analytics | Proposed by NOA; no trustworthy NSPG record foundation exists yet. | Later phase |
| Web fallback | Fleg web remains the fallback for flows not yet supported safely in the app. | Required operational safety net |

## Important facts and discrepancies

1. The proposal says **9 disciplines**, while the inspected live registration contract contains **14 competition sports** (plus separate officials forms). NOA/TC must confirm whether “9” is a grouping or an older presentation number before schedules and rules are approved.
2. The proposal describes player/team registration. The live NSPG forms currently capture individual submissions and do not provide an authoritative team, doubles partner, or roster field. Team, squad, doubles, artistic, qualification, ranked, and multi-weight links must not be invented as singles entrants.
3. The proposal gives NOPG dates of **2–14 November 2026** and venues around Chümoukedima and Dimapur. The database has no NSPG tournament dates or venues yet; `entrants.city` only accepts `kohima`, `dimapur`, or null.
4. The production tournament sport constraint still allows only the original six sports. Replacing it is production DDL and must happen only in an approved dev-branch rehearsal followed by explicit production approval.
5. A confirmed registration is not an approved entrant. Existing registrations and existing tournament data must remain untouched by provisioning.
6. The earlier registration snapshot is stale while registration is/was open. Any future apply must export and classify a fresh snapshot after close, then recheck counts, digest, withdrawals, blocked classes, and organizer identity.

## Completed foundation in the current checkpoint

- Central NSPG sport registry and category-aware engine routing.
- Fail-closed scoring for unsupported, unconfigured, ranked, team, and unresolved categories.
- Sport engines/labs for team score, racket/rally, combat bout, archery H2H, and ranked results.
- Guarded score-write client path with no direct-insert fallback when enabled; deployment remains pending.
- Rules presets and validation with explicit “Rules not configured” behavior.
- Local provisioning classification/import package with dry-run default, candidate manifest, registration digest, idempotency, rollback, and safety tests.
- Governance/readiness documentation and organizer-hub groundwork.
- Public/live rendering for saved snapshots where a full scoring engine is not yet available.

## Blocking work before an NSPG production pilot

### Association and TC decisions

- Approve the sport list and reconcile the proposal's nine-discipline wording with the live fourteen-sport registration set.
- Approve per-sport rules: lawn tennis full third set vs match tiebreak, table-tennis match length/finals, football halves/duration, combat rounds/methods, archery formats, athletics heats/finals, and any local overrides.
- Name the production organizer profile and staff roles.
- Confirm dates, venues, city values, public/private visibility, and publishing authority.
- Supply authoritative team/squad rosters, doubles/mixed partners, volleyball overlap resolution, archery qualification/seeding, and multi-weight choices.
- Decide who may finalize ranked results and who may correct/reopen a result.

### Engineering and data work

- Finish WO-6: review-build flag, no-login review entry, persistent sample-data banner, rules sheet, and all-sport lab coverage.
- Make the test command run every suite consistently; the repository currently has no `npm test` script even though the standalone suites exist.
- On a disposable/dev database only: deploy and test the sport constraint, guarded RPC, ranked-results tables, rules configuration storage, and linkage/audit tables.
- Add explicit roster/partner/weight-resolution intake; never infer teams or identities from free-text registration answers.
- Build tournament/category/stage/match provisioning only from a fresh approved snapshot and candidate manifest.
- Add the operational workflow for fixtures, officials, schedules, check-in, live publishing, result confirmation, corrections, export, and backup verification.
- Define the athlete identity/history linkage separately from registration rows; do not expose personal registration answers in public records.

### Operational verification

- Produce and install a review APK on the physical association device.
- Rehearse each supported scoring flow, keyboard/scroll behavior, undo, confirmation, public live display, and bottom-bar safety.
- Rehearse web fallback for every sport/category not marked app-ready.
- Perform a post-close read-only snapshot and dry run; compare approved counts and digest; obtain written approval before any production DDL or import.

## Recommended order from here

1. Complete WO-6 and issue the no-login review APK. Keep it in-memory and production-independent.
2. Collect the TC/NOA decisions and roster/partner files while preserving all registration rows.
3. Create a disposable/dev database rehearsal for schema, RPC, rules, ranked-results, and provisioning. Do not use the live project as a branch substitute if the plan cannot be safely supported.
4. After registration close, export a fresh snapshot, classify it, resolve every blocked class, and obtain a signed approval package.
5. Only then consider a short, reversible production cutover: schema validation, private draft tournaments, approved entrants, verification, and rollback readiness.
6. Operate the pilot with web fallback, then evaluate athlete records, cross-event history, dashboards, and state-wide sports intelligence as later phases.

## Explicit non-goals for the first pilot

- No automatic conversion of all registrations into entrants.
- No invented teams, partners, rosters, winners, weights, or rules.
- No production migration, RPC deployment, provisioning, or data cleanup from the review build.
- No athlete-history or state-dashboard claims until identity linkage, governance, and correction workflows are approved.

## Source documents

- NOA × FLEG Score strategic proposal (attached PDF).
- `docs/CURSOR-WO6-review-build.md`.
- `docs/NSPG-FINISH-PLAN.md`.
- `docs/NSPG-SUPABASE-CONTRACT.md`.
- `docs/NSPG-TOURNAMENT-PROVISIONING-PLAN.md` and `docs/nspg-provisioning/SAFETY-REVIEW.md`.


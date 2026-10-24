# FLEG Score organiser persistence contract

Status: design contract only. No migration or RPC has been applied.

The organiser screens are seed-backed until the association approves the NSPG
participant snapshot and the production schema/RPC package. Screens must not
write directly to tournament, entrant, match, or score tables.

## Required operations

All operations are authenticated and role-gated for `admin`, `nspg_lead`,
`nspg_staff`, or an assigned `organizer`/`organiser`. Every operation checks
that the caller is assigned to the tournament or has an elevated association
role.

### `create_tournament_draft`

Creates a private draft with sport, dates, venue, city, categories, and rules.
The operation rejects unknown NSPG sports, invalid city values, missing
organizer ownership, and duplicate slugs.

### `upsert_tournament_entrants`

Accepts only the approved import manifest. The idempotency key is
`(submission_id, reg_category_id)`. Registration rows remain immutable and
blocked/withdrawn links are never converted into entrants.

### `generate_tournament_fixtures`

Accepts a tournament, category, format, and ordered entrant ids. Supported
formats are league, knockout, and groups-to-knockout. Generation is a draft
operation and replaces only fixtures created by this organiser workflow.

### `update_fixture_assignment`

Updates seed, entrant sides, round, venue/court, scheduled time, and referee.
The referee must be assigned to the tournament and compatible with the sport.

### `publish_tournament`

Runs a complete validation transaction before changing visibility/status:

- tournament details, dates, venue, and city are valid;
- every category has approved entrants;
- every published fixture has two valid sides or an explicit walkover;
- every playable fixture has a schedule and compatible referee;
- every scoring category has a configured rules object;
- ranked categories have a result-entry configuration;
- no registration, payment, workshop, or unrelated event rows are changed.

The operation fails closed and rolls back if any check fails.

### `append_score_event_guarded` / `append_ranked_action_guarded`

Score and ranked-result writes use the guarded RPCs only. The client sends the
highest confirmed event/action id, never an optimistic id. Conflicts return the
authoritative state; the client removes the optimistic action and does not
retry automatically.

## Audit requirements

Every mutation records caller, tournament, category, match, previous state,
new state, and timestamp in an organiser audit stream. No personal registration
answers, identity documents, phone numbers, or emails are copied into audit
payloads.

## Rollout order

1. Review this contract and the final NSPG import manifest.
2. Apply additive schema/RPC changes in a development environment.
3. Run dry-run, idempotency, permission, conflict, and rollback tests.
4. Connect the app data layer to the RPCs behind a disabled production flag.
5. Enable one approved NSPG discipline for association testing.
6. Expand sport by sport after referee and scoring validation.


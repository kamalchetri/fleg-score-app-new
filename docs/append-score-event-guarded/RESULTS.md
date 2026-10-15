# append_score_event_guarded

Status: tested on a disposable local PostgreSQL 18 cluster. Not applied to Supabase. The mobile app does not call this function.

## PostgreSQL version

Local server: PostgreSQL 18.1 (`server_version_num` 180001), binaries in `C:\Program Files\PostgreSQL\18\bin`.

The cluster lived at `C:\Users\kxtri\AppData\Local\Temp\fleg-append-score-event-guarded-pg18-1f76939d23084a4f870cb0af67b3020a`, listened on `127.0.0.1:55432`, and was removed after the run. That path no longer exists, and nothing is listening on that port.

## Static assertion

`migration.sql` does not reference registration tables, payment tables, workshop tables, or `public_events`. The insert column list is `match_id, event_type, payload`. Authentication is checked before `pg_advisory_xact_lock`, and `FOR UPDATE` comes after that lock.

## Test results

| Step | Outcome | Detail |
| --- | --- | --- |
| anon | rejected | `42501 permission denied for function append_score_event_guarded` |
| authenticated_no_user | rejected | `42501 not_authenticated` |
| non_staff | rejected | `42501 not_tournament_staff` |
| unknown_event | rejected | `22023 unknown_event_type` |
| unknown_event_rows | unchanged | `0 -> 0` |
| whitelist_leg_won | rejected | `22023 unknown_event_type` |
| scheduled | rejected | `P0001 match_not_live` |
| completed | rejected | `P0001 match_not_live` |
| non_live_rows | unchanged | `rows=0` |
| insert_once | inserted | `event_id=2 last=2` |
| trigger_columns | filled_by_trigger | tournament `33333333-3333-4333-8333-333333333333`, created_by `11111111-1111-4111-8111-111111111111` |
| stale_expected_id | conflict | `last=2 rows 1 -> 1` |
| bout_result | inserted | `event_id=3 rows 1 -> 2` |
| preexisting_direct_row | unchanged | `matching_rows=1` |
| concurrency_match_untouched | unchanged | `rows=0` before the two-session test |

The direct preexisting row was a `goal` inserted outside the RPC. Its id, match, tournament, event type, payload, and `created_by` still matched after the RPC tests. `created_by` and `tournament_id` on the RPC insert were filled by `set_score_event_tournament`, not by client arguments.

## Concurrency

Session A appended with expected id `0` and then slept 3 seconds before commit. Session B was started only after Session A's `pg_sleep` was visible, so B had to wait on the transaction advisory lock.

| Session | Result | Wall clock |
| --- | --- | --- |
| A | `ok=true`, `conflict=false`, `event_id=4`, `last_event_id=4` | committed at `2026-10-11T16:37:49.5822019Z` |
| B | `ok=false`, `conflict=true`, `event_id` null, `last_event_id=4` | elapsed `2894` ms, finished at `2026-10-11T16:37:49.5852089Z` |

Session B finished 3 ms after Session A. The concurrency match has exactly one `score_events` row. Event id `4` is the table identity value after the fixture point and the `bout_result` insert; it is the only row for that match.

## Differences from Supabase PostgreSQL 17

The migration statement uses `hashtextextended`, `pg_advisory_xact_lock`, `SELECT ... FOR UPDATE`, and `SECURITY DEFINER` plpgsql. Those are available on PostgreSQL 17 and 18. No PostgreSQL 18-only syntax was required, and this run showed no behavior difference in those statements.

The local fixture is not a Supabase database:

- `auth.uid()` is a local function that reads `request.jwt.claim.sub` and `request.jwt.claims`.
- `anon`, `authenticated`, and `service_role` are local `NOLOGIN` roles. There is no Supabase `authenticator` role.
- The fixture tables have no row-level security. The function runs as its owner, and execute grants were checked directly: `anon` is denied and `authenticated` is allowed.

## Production

This run opened no Supabase connection and did not use a project URL or project ref. The function was not applied to production, and the branch was not merged. The mobile app was not changed to call the RPC.

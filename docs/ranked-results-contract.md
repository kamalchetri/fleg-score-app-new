# Ranked results prototype

Development-only engine for a future athletics results board and an archery qualification/ranking board. This document is a contract proposal. It is not a migration, and nothing here is applied to Supabase.

The lab at `/ranked-results-lab` keeps its board in memory. It does not read or write registrations, tournaments, entrants, brackets, payments, or events. A qualification list does not create Olympic-round entrants.

## Engine

`lib/ranked-results/engine.ts` is a pure function of explicit rules plus an action list.

Rules are rejected unless every field is present and valid:

| Field | Required value |
| --- | --- |
| `mode` | `time`, `distance`, or `points` |
| `unit` | `ms` for time, `mm` for distance, `points` for points |
| `maxAttempts` | Integer ≥ 1. A `final` aggregation must use exactly 1 |
| `aggregation` | `best` or `final` |
| `qualifierCount` | `null`, or an integer ≥ 1. `null` means no qualifier list |
| `tiePolicy` | `shared_rank` only. Any other policy is rejected |
| `allowedStatuses` | A unique list drawn only from `DNS`, `DNF`, and `DSQ` |
| `maxValue` | Integer ≥ 0 in the stored unit. This is a lab cap, not a qualifying mark |

`time` ranks a lower stored value first. `distance` and `points` rank a higher stored value first. Values are safe integers: milliseconds, millimetres, or points. Display formatting converts those integers back exactly (`10.230` s, `6.450` m, `86` pts). A status is stored as a status and is never turned into a number.

Ranking uses shared places: two equal results are both rank 1, and the next result is rank 3. People who share a rank stay in entrant-list order inside that tie. No countback, attempt order, or name order is applied.

If `qualifierCount` is set, whole tie groups are taken only when the group fits in the remaining slots. A group that is larger than the remaining slots is marked **Unresolved tie**. Nobody in that group is added to `qualifierIds`. The ids that are fully inside the cut are informational. The projection sets `createsEntrants` and `createsBracket` to `false`.

Statuses are listed after valid results, in the order given by `allowedStatuses`. People with no entry stay after statuses and are labelled “No result”.

Recording goes through `reviewRankedDraft` and then `confirmRankedAction`. Undo drops only the latest confirmed action.

## Future persistence

Do not add this table until a separate review. The shape below is the proposed contract, not SQL to run.

One row per confirmed action, append-only:

- `id`
- `board_id`
- `entrant_id` referencing the already-created entrant. This prototype does not insert that entrant.
- `action_index` unique per board, used as the undo order
- `kind` of `attempt` or `status`
- `value_integer` nullable. Required for an attempt, null for a status
- `unit` of `ms`, `mm`, or `points`. Null for a status
- `status` of `DNS`, `DNF`, or `DSQ`. Null for an attempt
- `rules_snapshot` jsonb copy of the explicit rules at confirmation time
- `created_at`

A check constraint should require exactly one of `value_integer` or `status`. Reloading a board is replaying `action_index` order through `projectRankedBoard`. Qualification remains a derived list. It is not an entrant insert and not a bracket seed.

Olympic-round entry, if it is ever approved, is a separate explicit action. It is not a side effect of this ranking.

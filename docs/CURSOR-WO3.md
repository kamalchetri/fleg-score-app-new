# Cursor Work Order — WO-3: Ranked-results persistence (athletics + archery ranking)

**Repo:** `fleg-score-app`  ·  **Issued by:** Claude  ·  **Date:** 13 Oct 2026
**Upstream status:** The schema + RPCs in `docs/nspg-ranked-results/migration.sql` are written and **verified on an isolated Postgres** (shape constraints, auth/staff gates, concurrency race → one insert + one conflict, guarded undo). Claude applies the migration to the target DB; you build the app against this contract. Full live test happens after Claude deploys it.

## Guardrails
- Production Supabase is **read-only** for you. Do not run the migration, do not write to prod. No service-role key in the app. Fail-closed stays intact. Do not invent rules. A qualifier list is **derived** — it never creates an entrant and never seeds a bracket.
- Keep the existing pure engine (`lib/ranked-results/engine.ts`) as the single source of projection truth. Persistence only feeds it the ordered action list; it does not re-implement ranking.
- Before done: `npx tsc --noEmit` clean, all `tests/` suites green, no new lint errors.

## Verified DB contract (do not change)

Tables:
- `ranked_boards(id uuid, tournament_id, tournament_category_id, label, rules jsonb, status 'open'|'finalized', created_by, created_at)` — one board per ranked event. `rules.mode` ∈ `time|distance|points` (DB-checked). Public read.
- `ranked_result_actions(id bigint identity, board_id, action_index int≥1 unique per board, entrant_id, kind 'attempt'|'status', value_integer, unit 'ms'|'mm'|'points', status 'DNS'|'DNF'|'DSQ', rules_snapshot jsonb, created_by, created_at)` — append-only; exactly one of (attempt: value+unit) or (status) enforced by CHECK. Public read. **Writes only via the RPCs below.**

RPCs (SECURITY DEFINER, granted to authenticated):
```
append_ranked_action_guarded(
  p_board_id uuid, p_entrant_id uuid, p_kind text,
  p_value_integer bigint, p_unit text, p_status text,
  p_rules_snapshot jsonb, p_expected_last_index integer
) RETURNS TABLE (ok boolean, conflict boolean, action_index integer, last_index integer)

undo_ranked_action_guarded(
  p_board_id uuid, p_expected_last_index integer
) RETURNS TABLE (ok boolean, conflict boolean, last_index integer)
```
- `append`: rejects `not_authenticated` (42501), `not_tournament_staff` (42501), `board_not_found`/`board_not_open` (P0001), `bad_kind` (22023). If `p_expected_last_index` ≠ current max action_index → `conflict=true`, nothing inserted. Else inserts at `max+1`.
- `undo`: same gates; removes only the row at the current max action_index when `p_expected_last_index` matches; stale → `conflict=true`; empty board → `ok=false, conflict=false, last_index=0`.

## Tasks
1. **Data layer** (`lib/ranked-results/store.ts` or similar): 
   - `createBoard(tournamentId, tournamentCategoryId, label, rules)` — insert via a small guarded path/RPC if one is added later; for now board creation is organizer-side (Claude will confirm the create path). Read `listBoards(tournamentId)` and `fetchBoardActions(boardId)` from the tables (public read).
   - `appendRankedAction(input)` → call `append_ranked_action_guarded`; interpret `{ok, conflict, action_index, last_index}` into an `appended | conflict | error` result (mirror `lib/guarded-scoring.ts` style). A missing RPC is an error, never a silent local-only write.
   - `undoRankedAction(boardId, expectedLastIndex)` → call `undo_ranked_action_guarded`.
   - `expectedLastIndex(actions)` helper = max `action_index` of confirmed actions, else 0.
2. **Wire `/ranked-results-lab` (and the real ranked screen) to persistence**: load actions → replay through `projectRankedBoard` → render. On record: `reviewRankedDraft` → on confirm call `appendRankedAction`. On `conflict`: reload actions, re-project, show a "Results changed on another device — reloaded" notice, do not auto-retry. On `undo`: call `undoRankedAction` with the current expected index. Keep DNS/DNF/DSQ, attempts, best/final aggregation, and **Unresolved tie** behavior exactly as the engine already does.
3. **Rules snapshot**: pass the board's explicit `rules` object as `p_rules_snapshot` on every append (the engine already validates rules; send the same object).
4. **Qualification stays derived**: show the qualifier preview from the projection; never write an entrant or bracket. `createsEntrants`/`createsBracket` remain false.
5. Keep the dev lab working in-memory as a fallback demo only if trivial; the real screen uses persistence.

## Acceptance
- Athletics + archery-ranking boards persist actions and re-project correctly across app restarts against a DB that has the migration (Claude will provide the endpoint/branch when applying).
- Conflict and undo paths proven in unit tests (mock the RPC results): append→appended, stale→conflict+reload, undo→removes last, error→surfaced no local write.
- Unresolved-tie group is never added to qualifiers; no entrant/bracket side effects.
- `tsc` clean; all suites green (add ranked-persistence tests).

## When done
Report files changed, test counts before/after, and flag any mismatch between the engine's rules/action shapes and the DB columns (e.g. unit/mode naming) to Claude rather than adapting the DB yourself.

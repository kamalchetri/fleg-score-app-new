# Cursor Work Order — WO-1 (rules presets) + WO-2 (guarded scoring wiring)

**Repo:** `fleg-score-app`  ·  **Issued by:** Claude (DB/backend owner)  ·  **Date:** 13 Oct 2026
**Verified upstream:** The `append_score_event_guarded` RPC and the provisioning importer have both been independently tested on an isolated Postgres and pass. This work order builds the app side against that verified contract.

---

## Guardrails (do not violate)

- **Production Supabase `zcubdqfzdbwtfcdsntoa` is shared and LIVE** (fleg.in, fleg-mobile, live NSPG registrations). Treat it as **read-only**. Do not run migrations, do not write to it, do not create tournaments/entrants. All DB changes are Claude's job on an isolated environment.
- **Never put the service-role key in the app.** Anon key + RPC only.
- **Fail-closed stays intact.** Unknown sport / missing rules / invalid rules → show "Rules not configured", render no scoring controls. Never fall back to futsal or a generic pad.
- **No inventing data** — no rules values beyond the presets below, no rosters, no winners.
- Keep changes scoped to WO-1 and WO-2. Do not start ranked-results persistence (WO-3) — its schema isn't published yet.
- Before reporting done: `npx tsc --noEmit` clean, **all** suites in `tests/` green (`172+` tests), no new lint errors.

---

## WO-2 — Route live scoring through the guarded RPC

### Why
Today the live match screen writes via the legacy direct insert (`insertEvent` in `lib/queries.ts`). Under two scorers on one match that loses writes (the point-loss desync bug). The guarded path fixes it with compare-and-swap.

### Verified RPC contract (already deployed-tested, do not change)
```
append_score_event_guarded(
  p_match_id uuid,
  p_event_type text,
  p_payload jsonb,
  p_expected_last_event_id bigint
) RETURNS TABLE (ok boolean, conflict boolean, event_id bigint, last_event_id bigint)
```
Behavior (proven in harness):
- Rejects when caller is not authenticated (`42501 not_authenticated`), not tournament staff (`42501 not_tournament_staff`), or match not live (`P0001 match_not_live`).
- Rejects unknown event types (`22023 unknown_event_type`). **Allowed event types:** `goal, card, foul, substitution, shot, shot_on_target, possession, period_start, period_end, clock_pause, clock_resume, point, serve_change, game_start, timeout, visit, undo, undo_side_goal, bout_result, end_result, shoot_off`.
- If `p_expected_last_event_id` ≠ the current last confirmed event → returns `conflict=true`, inserts nothing.
- Otherwise inserts exactly one event; `tournament_id` and `created_by` are filled by the DB trigger.

### What already exists (reuse, don't rebuild)
- `lib/guarded-scoring.ts`: `isGuardedScoringEnabled()`, `SCORE_CONFLICT_MESSAGE`, `expectedLastEventId(events)`, `interpretGuardedAppend(...)`, `AppendScoreEventResult` (`appended | conflict | error`).
- `lib/queries.ts`: `appendScoreEventGuarded(input)` (calls the RPC; a missing RPC is an error, never a direct insert), plus `fetchEvents(matchId)`.

### Tasks
1. In the live match control write path, when `isGuardedScoringEnabled()` is true, replace the `insertEvent(...)` call with `appendScoreEventGuarded({ matchId, eventType, payload, expectedLastEventId: expectedLastEventId(currentEvents) })`. When the flag is false, keep the existing legacy `insertEvent` path unchanged.
2. Handle the three results:
   - `appended` → proceed as today (the next `fetchEvents`/projection reflects it).
   - `conflict` → re-fetch events, re-project the score, and surface `SCORE_CONFLICT_MESSAGE` (non-destructive toast/banner). Do **not** retry automatically; let the scorer see the corrected score and re-tap.
   - `error` → surface the message; **never** silently fall back to `insertEvent`.
3. Compute `expectedLastEventId` from the currently loaded confirmed events (helper provided). Optimistic/local rows must be excluded (the helper already does this).
4. Keep optimistic UI responsiveness, but the confirmed state always comes from the guarded result + re-fetch.

### Flag / env
- Leave `EXPO_PUBLIC_GUARDED_SCORING_ENABLED` defaulting **false** in committed config. Do **not** enable it in `eas.json`. (It will be switched on only after Claude deploys the RPC to the target DB — until then, enabling it in prod would break scoring since there's no fallback, by design.)
- You may enable it locally/in dev to test against a database that has the RPC.

### Acceptance
- `guarded-scoring.test.ts` stays green; add/extend tests so the match-control write path: (a) uses guarded append when the flag is on, (b) shows the conflict message and re-projects on `conflict`, (c) surfaces error and does **not** direct-insert on `error`, (d) uses legacy insert when flag off.
- `tsc` clean; all suites green.
- Manual (dev build, flag on, DB with RPC): two devices on one live match → one write wins, the other shows the conflict message and the score stays correct.

---

## WO-1 — Standard global rules presets into match config

### Why
The new engines (table tennis, lawn tennis, volleyball, sepaktakraw, archery H2H) only activate with a complete valid rules object. Kamal approved using **standard global federation rules as defaults now**; the TC reviews and overrides later. Each preset is flagged `tcReview: 'pending'`.

### Tasks
1. Create `lib/sports/rules-presets.ts` exporting a preset rules object per supported sport/category, each matching the **existing rules type** that its engine already defines in `lib/scoring/<sport>.ts` (read those types — do not invent new shapes or new fields). Add a `tcReview: 'pending'` marker alongside each preset (in a wrapper, not inside the engine rules type if it doesn't allow it).
2. Wire preset lookup so a supported match/category with no explicit rules uses its preset; an unsupported sport/category or a missing preset still shows "Rules not configured" and renders no controls (unchanged fail-closed behavior).
3. Surface the `tcReview` state subtly in the scoring UI (e.g. a small "Standard rules — pending TC review" note) so operators know these are defaults.

### Authoritative preset VALUES (use exactly; map to each engine's field names)
- **Badminton:** best of 3 games, 21 points, win-by 2, cap 30.
- **Table Tennis (singles):** best of 5 games, 11 points, win-by 2, no cap.
- **Lawn Tennis (singles):** best of 3 sets; 6 games per set, win-by 2; tiebreak at 6–6 to 7 points, win-by 2; **deciding set = match tiebreak to 10** (mark this choice `tcReview: 'pending'` — TC may want a full third set).
- **Volleyball:** best of 5 sets; sets 1–4 to 25, win-by 2, no cap; deciding set to 15, win-by 2.
- **Sepaktakraw (Regu):** best of 3 sets; set to 21, cap 25; deciding set to 15, cap 17.
- **Basketball:** 4 periods × 10 minutes (score + clock engine).
- **Boxing / Taekwondo / Wushu Sanda / Wrestling / Pencak Silat Tanding:** bout result; 3 rounds (default — `tcReview: 'pending'` per sport); result methods: points, RSC, walkover (WO), disqualification (DSQ). Winner is explicit, never inferred.
- **Archery H2H — Recurve:** set system; 5 sets; 3 arrows/end; set points 2 (win) / 1 (tie) / 0 (loss); first to 6 set points; 1-arrow shoot-off, closest to centre, on 5–5.
- **Archery H2H — Compound:** cumulative; 5 ends × 3 arrows (15 total); highest total wins; 1-arrow shoot-off, closest to centre, on a tie.
- *(Archery Indian Round and all athletics are ranked events — out of scope for WO-1; they come with WO-3.)*

### Acceptance
- Each supported sport renders its real scoring pad with the preset rules in `/scoring-lab` and (dev) on a real match.
- Unsupported/unconfigured still shows "Rules not configured".
- Add tests asserting each preset is a valid rules object for its engine and that unsupported categories stay fail-closed.
- `tsc` clean; all suites green.

---

## Commit
Small, reviewable commits. Do **not** commit `.nspg-dry-run/`, `.env*`, or any personal registration data (already git-ignored). Suggested messages: `WO-2: route live scoring through guarded append`, `WO-1: standard rules presets (TC review pending)`.

## When done
Report: files changed, test counts (before/after), and any field-shape mismatches you hit mapping the preset values to an engine's rules type — flag those to Claude rather than inventing fields.

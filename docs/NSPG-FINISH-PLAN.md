# NSPG 2026 — Finish Plan & Work Division (Claude-owned)

**Owner of this plan:** Claude (DB/backend + orchestration)
**Created:** 12 October 2026 (IST)
**Goal:** NSPG tournament operation live in BOTH the FLEG Score app AND web Fleg-score (web = fallback), to the standard the association asked for, by competition — quality, not rushed.
**Governing decisions (Kamal, 12 Oct):** app + web both (web is the fallback); use **standard global federation rules as defaults now**, TC reviews and we adjust later; three agents divide the work.

---

## 1. Who does what (three agents)

**Claude (me) — the shared database, all SQL, data correctness, orchestration.**
- Owns Supabase `zcubdqfzdbwtfcdsntoa`. All DDL/RPC/migrations, applied on a **Supabase dev branch first**, verified, merged to prod only with Kamal's approval after registration closes (15 Oct 23:59 IST).
- Owns: NSPG sport constraint, `append_score_event_guarded` RPC, ranked-results schema, rules-config storage, the standard-rules preset values (§4), registration→entrant provisioning, classification, snapshot/verification.
- Produces the SQL contract Cursor builds against; reviews Cursor's DB-touching code.

**Cursor / GPT — the FLEG Score app (Expo) implementation.**
- Executes the work orders in §5 against the dev-branch schema I provide.
- Owns: wiring engines to real matches, ranked-results persistence integration, guarded-scoring integration, rules-config loading, roster/partner intake UI, public/fallback views.
- Never touches production DB directly; never uses the service-role key on the client; fail-closed stays intact.

**Kamal — decisions, approvals, device tests.**
- Collects TC inputs for later review (organizer, dates, venues, rule overrides, rosters, pairs). Parallel track — see §6.
- Approves the one production cutover after registration closes; runs physical-device checks; names the backup/execute operator.

**Web Fleg-score (existing) = the live fallback.** Any sport not yet solid in the app runs on web. Never a single point of failure.

---

## 2. Sequence & gates

**Phase 0 — Preserve & set the target (Claude + Cursor, now, zero prod risk)**
- [Cursor] Commit the 114-file working tree (command in §7). Nothing merged to prod; this is just git hygiene.
- [Claude] Create Supabase **dev branch**; apply + test: sport constraint (§3.1), guarded RPC (§3.2), ranked-results schema (§3.3), rules-config storage (§3.4). Publish the SQL contract.
- [Claude] Finalize standard-rules presets (§4) as approved defaults, each flagged `tc_review: pending`.

**Phase 1 — Build against the dev branch (Cursor executes §5, Claude reviews)**
- Ranked-results persistence; guarded-scoring wiring on; rules presets loaded into match config; roster/partner intake; per-sport readiness surfaced in UI.

**Phase 2 — Provision (Claude, AFTER registration closes, Kamal-approved)**
- Fresh read-only snapshot → reclassify → resolve drift/blocked/multi-weight → approved backup → quiet window → apply sport constraint + private-draft tournaments + the clean importable subset to prod → verify counts, stop on any mismatch.

**Phase 3 — Operate**
- Rosters, pairs, qualification, stages, schedules, staff via approved workflows. End-to-end device rehearsal before live.

**Hard gate:** no production DDL or provisioning until registration closes 15 Oct 23:59 IST and Kamal explicitly approves. Everything before that is dev-branch + app code only.

---

## 3. DB schema contract (Claude applies on dev branch)

### 3.1 Sport constraint
Preserve the six existing (`futsal, football, pickleball, basketball, badminton, darts`); add the NSPG canonical slugs (`archery, athletics, boxing, lawn_tennis, pencak_silat, sepaktakraw, table_tennis, taekwondo, volleyball, wrestling, wushu`). Validate-then-swap with a 3s lock timeout. (GPT's unapplied file is the basis; I re-verify before applying.)

### 3.2 Guarded scoring RPC — `append_score_event_guarded`
Deploy GPT's prepared function (auth staff + live match + advisory lock + `FOR UPDATE` reread + expected-last-event check + single append or conflict). **This is the fix for the point-loss desync bug — it must be live before any real app scoring.** Enable the `EXPO_PUBLIC_GUARDED_SCORING_ENABLED` flag only after it exists in the target DB. RPC failure never falls back to a direct insert.

### 3.3 Ranked-results schema (new, additive)
Append-only persistence for athletics + archery ranking/qualification (per GPT's `docs/ranked-results-contract.md`): a results table keyed by `(tournament_category_id, participant_id, attempt_no)` storing mode (`time` ms / `distance` mm / `points`), value, status (`OK/DNS/DNF/DSQ`), reviewed flag, created_by; ranking is a pure projection. Ties across the qualification cut stay **unresolved** — never auto-selected.

### 3.4 Rules-config storage
Where each tournament_category/match carries its validated rules object (the §4 presets at provisioning time). Engines stay fail-closed: missing/invalid rules → "Rules not configured", no controls.

---

## 4. Standard global rules presets (defaults now, TC-overridable)

Each flagged `tc_review: pending`. These are standard federation defaults — apply now, swap on TC sign-off.

| Sport | Standard default |
|---|---|
| **Badminton** | Best of 3 games, 21 points, win-by-2, cap 30. |
| **Table Tennis** | Best of 5 games (7 for finals, TC to confirm), 11 points, win-by-2, no cap. |
| **Lawn Tennis** | Best of 3 sets; 6 games win-by-2; tiebreak at 6–6 to 7 (win-by-2); deciding set = match tiebreak to 10 (TC to confirm full 3rd set vs match-TB). |
| **Volleyball** | Best of 5 sets; sets 1–4 to 25 win-by-2 (no cap); deciding set to 15 win-by-2. |
| **Sepaktakraw (Regu)** | Best of 3 sets; 21 points cap 25; deciding set 15 cap 17 (ISTAF). "Double" treated as squad. |
| **Basketball** | FIBA 4×10 min; score+clock engine; standings by W/L then points diff. |
| **Football** | Existing futsal-style engine; halves per NSPG match format (TC to confirm halves/duration). |
| **Boxing / Taekwondo / Wushu Sanda / Wrestling / Pencak Silat Tanding** | Bout result: winner + method (points/RSC/WO) + rounds (default 3, TC to confirm per sport). Winner never inferred from points. |
| **Archery H2H — Recurve** | Set system: 5 sets, 3 arrows/end, set points 2/1/0, first to 6; 1-arrow shoot-off (closest to centre) on 5–5. |
| **Archery H2H — Compound** | Cumulative: 5 ends × 3 arrows (15), highest total; shoot-off 1 arrow closest. |
| **Archery — Indian Round** | Cumulative scoring; ranking/qualification via ranked-results board, not H2H, unless TC specifies brackets. |
| **Athletics** | Ranked results: track = `time` (ms, lower first); field = `distance` (mm, higher first); heats→finals per event. |

Anything the TC hasn't ruled on stays fail-closed rather than guessed.

---

## 5. Cursor work orders (ordered; each has acceptance criteria)

> Build against the dev-branch schema Claude publishes. Keep fail-closed. Run `tsc --noEmit` + the relevant test suite + (where DB) the local PG harness before marking done. Do not commit `.nspg-dry-run/` or personal data.

**WO-0 Commit the tree.** Preserve current work (see §7). *Accept:* clean `git status`, pushed.

**WO-1 Rules presets into match config.** Load the §4 presets so supported engines activate with valid rules; unsupported/unconfigured still show "Rules not configured". *Accept:* each supported sport renders its real pad with preset rules in `/scoring-lab` and on a real dev-branch match; tests cover preset validity.

**WO-2 Guarded scoring wiring.** Point live scoring at `append_score_event_guarded`; enable the flag for dev; conflict shows a retry, never a silent direct insert. *Accept:* two-device conflict yields one insert + one handled conflict on a real dev match; flag off still works.

**WO-3 Ranked-results persistence.** Replace the in-memory lab with reads/writes to the §3.3 schema; keep DNS/DNF/DSQ, attempts, best/final, unresolved-tie behavior. *Accept:* athletics + archery-ranking results persist and re-project correctly across app restarts on the dev branch; PG harness green.

**WO-4 Roster / partner / multi-weight intake.** UI + validation to attach team/squad rosters (409 links), doubles/mixed pairs (39), and resolve multi-weight (18) — **no inventing people from registration answers**; only approved, explicit entries. *Accept:* a blocked link cannot become an entrant without an explicit approved roster/pair/weight choice.

**WO-5 Per-sport readiness + web-fallback signaling.** Each sport/category shows ready / needs-rules / needs-roster / web-only, so operators know what runs in-app vs on web. *Accept:* status is accurate against dev-branch data.

---

## 6. Parallel unblocker — TC request (Kamal)

Collect now, while registration is open (feeds Phase 2 and rule overrides): production organizer profile; tournament dates; venues + city values (`kohima`/`dimapur`/null); rule overrides vs the §4 defaults; team/squad rosters (409 links); doubles/mixed partners (39); multi-weight resolutions (18); volleyball Men/Women overlap; archery qualification + seeding; athletics/archery ranked workflow + finalization authority; backup + execute/rollback operator. *(Claude can draft the one-pager on request.)*

---

## 7. Immediate next actions

- **Cursor, now:** commit the tree —
  ```powershell
  cd C:\Users\kxtri\fleg-score-app
  git add -A
  git commit -m "NSPG WIP: scoring engines, provisioning package, labs, docs (pre-finish-sprint checkpoint)"
  git push
  ```
  (`.nspg-dry-run/`, `.env*`, `android/`, `ios/` are already git-ignored — verified safe.)
- **Claude, now → next:** create the Supabase dev branch; apply + test §3.1–3.4; publish the SQL contract; lock the §4 presets. Then hand Cursor WO-1→WO-5.
- **Kamal:** start the §6 TC collection; tell me if you want the TC one-pager drafted.

---

## 8. Non-negotiables (unchanged)

Production read-only until post-close + explicit approval. Preserve all existing registration/payment/event/workshop/tournament/entrant/scoring data. Confirmed registration ≠ approved entrant. No invented people/pairs/weights/rules/winners. Guarded RPC must exist in the target DB before enabling; RPC failure never falls back to a direct write. Ranked events stay separate from two-entrant matches. Never ship the service-role key in the app.

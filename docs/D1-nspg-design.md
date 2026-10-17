# D1 — NSPG section design + build spec

Design system: **Electric Dark Score** (`docs/stitch/DESIGN.md`). Canvas `#0D0E12`, surfaces `#16181F` / `#1F222A`, primary chartreuse `#CEF202` (black text on it), live red `#FF334B`, Plus Jakarta Sans, rounded-2xl/3xl, pill badges. Reuse the Task A component kit (HeroCard, MatchCard, Pill, Button, Input). Mobile-first single column, 20px margins.

Public hub reads **only** `lib/nspg-live.ts`. Organiser writes go through the RPCs in §Organiser contract. All screens build against seed now; swap is transparent.

---
## PART 1 — Public hub (Task B · no login)

### 1. NSPG Hub  (`app/(tabs)/nspg/index.tsx`)
- Hero: "Nagaland State & Para Games 2026", dates 2–14 Nov, Chümoukedima & Dimapur. Chartreuse HeroCard.
- "Live now" strip: horizontal MatchCards from `getLiveMatches()` (red live dot + clock). Hidden if none.
- Sports grid: 2-col cards from `listNspgSports()` — icon, name, and a chartreuse pill "`liveCount` LIVE" or "`todayCount` today". Tap → sport screen.
- Secondary button → Medal tally.

### 2. Sport screen  (`app/(tabs)/nspg/[sport].tsx`)
- Header: sport name + category chips (Men/Women/Open…).
- Segmented control: **Fixtures · Standings · Results**.
- Fixtures/Results = `getSportFixtures(sport)` grouped by `roundLabel`; MatchCard shows sides (name + district), score, status pill (scheduled time / live clock / "FT"), venue. Tap → Match centre.
- Standings = `getStandings(sport, category)`: league/groups → table (rank, team, P W D L, Pts) with top-`qualifyCount` rows chartreuse-tinted; pure knockout → bracket from fixtures.

### 3. Live Match Centre  (`app/(tabs)/live/[matchId].tsx`)
- Big score header (Electric "Hero Match Card" when live: chartreuse bg, black text; dark card when final/scheduled): sides, `score-display` numbers, `periodLabel` + `clock`.
- Tabs: **Live / Events / Stats**. Events = `getMatch(id).events` timeline (minute, icon by type, detail).
- Call `subscribeLive(refetch)` on mount; cleanup on unmount. Live red pulse while `status==="live"`.

### 4. Live tab  (`app/(tabs)/live/index.tsx`)
- All live across sports from `getLiveMatches()`, grouped by sport. Empty state: "No live matches right now."

### 5. Medal tally  (`app/(tabs)/nspg/medals.tsx`)
- Table from `getMedalTally()`: district, 🥇🥈🥉 counts (use colored pills, not emoji), total. Rank by gold. Header note "Updates as results are published."

---
## PART 2 — Organiser area + live scoring (Task C · role-gated)

Gate with Task A `useRole()`: `admin` / `nspg_lead` / `nspg_staff` / `organiser`. Hide the whole area from `user`.

### 6. Organiser home  (`app/organiser/index.tsx`)
- List tournaments the user can manage (their sport/district). Status pills (draft/live/complete). Tap → manage.

### 7. Tournament management  (`app/organiser/[tournamentId]/…`)
- **Entrants**: teams/athletes from provisioning (approve/reject/waitlist, tap-to-reveal contact). Mirrors the existing WP2 hub — reuse it.
- **Fixtures**: generate by format (league/groups/knockout) → review → confirm. Reuse formats engine in `lib/`.
- **Schedule**: set court/time/referee per match; walkover.
- **Settings**: lifecycle transitions (draft → live → complete) — reuse WP2 ALLOWED_TRANSITIONS.

### 8. Live scoring pads  (`app/organiser/[tournamentId]/score/[matchId].tsx`)
- One pad per scoring archetype (reuse existing engine + WP1 referee flow): team-goal (football), set-based (volleyball), combat-round (boxing/taekwondo/wushu/pencak silat/wrestling), measured/attempt (athletics/archery), racket (badminton/table tennis/lawn tennis), basketball.
- Every scoring tap → guarded RPC (§ below). Optimistic UI but reconcile from the RPC's returned authoritative state (the "scoring outruns DB" rule). Undo supported.
- **Publish**: on final, mark result public → appears in the hub.

---
## Organiser write contract (RPCs — verified SQL in `docs/append-score-event-guarded/` and `docs/nspg-ranked-results/`; applied to prod at B1)
- `append_score_event_guarded(...)` (exact signature in `docs/append-score-event-guarded/migration.sql`) → returns new authoritative state + `last_event_id`. Compare-and-swap: if the expected last-event id is stale, returns conflict → client refetches, does not double-apply. Undo for live scoring = append a reverse/correction event through this same RPC (the engine computes the corrected state); there is no separate score-undo RPC.
- `append_ranked_action_guarded(...)` / `undo_ranked_action_guarded(...)` for ranked/measured sports (signatures in `docs/nspg-ranked-results/migration.sql`) — these DO have an explicit guarded undo.
- Fixtures/schedule/lifecycle: organiser-role writes to `matches` / `stages` guarded by RLS (organiser owns tournament). Publishing sets `matches.is_public = true`.
- All writes audit-logged (log_audit_event trigger).

## Acceptance (both tasks)
- `npx tsc --noEmit` clean; scoring engine tests pass (Task C).
- Screens match Electric Dark Score + the Stitch references; build against seed with no direct table access.
- Screenshots per screen on a physical device.

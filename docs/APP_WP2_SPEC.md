# App-WP2 — Organizer Management in the Fleg Score App

> Spec written 2026-07-13 by CTO-Claude. Build target: **tester build 2 by Jul 18**.
> Event: Nagaland Open Masters **Jul 24–26**. The web dashboard remains the fallback
> for every flow — this work package makes the phone the primary tool, not the only one.

---

## 0. Ground rules (unchanged from WP1 — non-negotiable)

1. Work ONLY in this repo (`fleg-score-app`). Never touch `fleg-mobile` or the web repo.
2. Same backend: Fleg-web Supabase (`zcubdqfzdbwtfcdsntoa`) via `EXPO_PUBLIC_*` env. Anon key +
   RLS only. **Never the service_role key.** The web dashboard's server actions run on an authed
   client under the same RLS ("staff can update their own tournament") — the app mirrors those
   exact operations client-side.
3. SYNC files are read-only copies from the web repo (`lib/scoring/*`, `lib/sports/presets.ts`,
   `lib/database.types.ts`, and NEW as of 2026-07-13: `lib/formats/*`, `lib/bracket/knockout.ts`,
   `tests/formats-engine.test.ts`). Never edit them here; if they're wrong, fix on web and re-copy.
4. No new tables, no migrations. Everything WP2 needs already exists in the schema.
5. `npm run typecheck` = 0 errors before every commit. Engine tests must stay green:
   `npm run test:engine` (20) and `npx tsx tests/formats-engine.test.ts` (22).
6. Commit per screen/work item with clear messages.

## 1. What exists (don't rebuild)

- Auth + session (`lib/auth-context.tsx`), theme (`lib/theme.ts`), UI primitives (`components/ui.tsx`),
  query helpers (`lib/queries.ts`).
- Screens: `login`, `home` (my matches / my tournaments), `match/[id]` (full match control,
  futsal + pickleball), `live/[id]`, `settings`, and `tournament/[id]` — currently a **read-only
  match list**. WP2 replaces this screen with a full management hub.
- Formats engine (synced, tested): `generateRoundRobin`, `computeStandings` +
  `standingsConfigForSport`, `assignGroupsSnake` / groups fixtures, `knockoutSeedsFromGroups`,
  knockout helpers in `lib/bracket/knockout.ts`, DB mapping helpers in `lib/formats/db-mapping.ts`.

## 2. What to build — `tournament/[id]` becomes a tabbed hub

Tabs: **Entrants · Fixtures · Standings · Schedule · Settings**. Staff-gated: only render
management controls when the signed-in user is staff of this tournament (same check `home` uses).

### 2.1 Entrants tab
- List entrants grouped by category: display name, seed, status chip
  (`pending` amber / `approved` green / `rejected` red / `waitlisted` grey), contact (from
  `entrant_contacts`) behind a tap-to-reveal.
- Actions per entrant: Approve / Reject / Waitlist / Back to pending. Mirror the web's
  `setEntrantStatus`: `update entrants set status=X where id=... and tournament_id=...`
  — optimistic UI + rollback on error (same pattern as match control taps).
- Counts header per category: approved / pending / capacity.
- **Do NOT build**: manual entrant add, staff invites (web-only in WP2 — they use the admin
  client on the server).

### 2.2 Fixtures tab (the big one)
- Per category, three states:
  a) **No stage yet** → "Generate fixtures" flow. Collect config AT GENERATE TIME (exactly like
     web): format comes from the category (`knockout` | `league` | `groups_knockout`); for league:
     double round-robin toggle; for groups_knockout: group count + advance-K per group +
     double-RR toggle. Config is stored in `stages.config` (jsonb) — the categories table has
     NO config column, intentional.
  b) **Stage exists, group/league phase** → render fixtures by round (RR) or by group; show
     per-match status; standings preview link.
  c) **Knockout phase** → bracket rounds list (the app is list-first, not a graphical bracket).
- Generation logic: PORT from the web repo (paths below) — entrant ordering (seed asc, then
  created), phantom BYEs, snake seeding, match-row inserts with round/position, stage row
  creation. It is client-side-safe: plain selects + inserts under RLS.
- **Groups → knockout advancement**: only enabled when ALL group matches are complete
  (web gate in `generateKnockoutFromStandings` — port the same completeness check), uses
  `knockoutSeedsFromGroups` for cross-seeded pairings with same-group-collision avoidance.
- **`advanceWinner` is knockout-stage-only.** The guard from web `match-actions.ts` MUST be
  preserved (advancing a group/league match would corrupt RR fixtures). The app's match control
  already has this guard — reuse, don't fork.
- Reference implementations to port (web repo, read-only — ask Kaki to grant read access to
  `C:\Users\kxtri\Fleg-score` or have the files pasted in):
  - `src/app/(dashboard)/dashboard/t/[id]/match-actions.ts` → `generateBracket`,
    `generateKnockoutFromStandings`, `updateMatchSchedule`, `setWalkover`
  - `src/app/(dashboard)/dashboard/t/[id]/actions.ts` → `setEntrantStatus`,
    `updateTournamentStatus` (+ `ALLOWED_TRANSITIONS` map)
  - `src/app/(dashboard)/dashboard/t/[id]/bracket/page.tsx` → per-format rendering logic
  - Strip the Next-isms (`"use server"`, `revalidatePath`) — keep queries, guards, and the
    `.eq("status", from)` stale-UI protections verbatim.

### 2.3 Standings tab
- League / groups categories only. Load matches for the stage, map DB rows via
  `lib/formats/db-mapping.ts`, compute with `computeStandings(standingsConfigForSport(sport))`.
- Render: rank, name, P W D L, scored/conceded, diff, points. Groups render one table per group.
- Read-only. Never persist standings — they're always derived.

### 2.4 Schedule tab
- Flat match list per category: round label, entrant names, current `scheduled_at` + court,
  assigned referee.
- Actions: set date/time (native picker) + court text; assign referee from the tournament's
  staff list (`tournament_staff` join to profiles — same source the web uses). Mirror web
  `updateMatchSchedule`. Walkover action mirrors `setWalkover` (confirm dialog; sets result,
  advances if knockout).

### 2.5 Settings tab (lifecycle only)
- Show tournament status; transitions per web's map:
  `draft→published→registration_open⇄registration_closed`. Mirror `updateTournamentStatus`
  including the `.eq("status", from)` double-click guard. Archive: web-only, don't build.

## 3. Data contracts / gotchas (hard-won — respect them)

- `matches.score` jsonb = `{ a, b, display }`; `score_events` are the source of truth, the
  snapshot is a cache. Standings read `score.a`/`score.b`.
- `score_events` insert: send ONLY `match_id, event_type, payload` — `tournament_id` and
  `created_by` are set by DB triggers.
- Stage/fixture config lives in `stages.config` jsonb.
- Poll, don't subscribe (Realtime is deferred). 3s poll like `live/[id]` where liveness matters;
  pull-to-refresh elsewhere.
- Keep every screen usable on a 360px-wide Android in sunlight: big touch targets, status
  colors from `lib/theme.ts`, optimistic updates with rollback + error toast.

## 4. QA gate (before calling it done)

1. `npm run typecheck` → 0. Both test suites green.
2. Full mock run against the seeded tournament (`test-app-tester-cup-x7k2q`, organizer
   account `kamal.chetri2201@gmail.com`) — and create a fresh `groups_knockout` tournament
   (2 groups of 3) on the web dashboard, then in the APP: approve entrants → generate group
   fixtures → score all group matches via match control → check standings → generate knockout
   from standings → score final → verify public live pages on fleg.in agree.
3. No SYNC file modified (`git diff --stat` must show none of them).
4. Commit per tab; final commit message `App-WP2: organizer management hub`.

## 5. Out of scope for WP2 (on the record)

Push notifications, offline queue, in-app signup, payments, staff invites, manual entrant add,
tournament creation in app (web wizard only), Realtime subscriptions, monorepo extraction.

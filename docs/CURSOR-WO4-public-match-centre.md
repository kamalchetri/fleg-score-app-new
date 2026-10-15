# Cursor Work Order — WO-4: Public Match Centre & Publishing (NOPG 2026)

**Repo:** `fleg-score-app`  ·  **Issued by:** Claude  ·  **Date:** 13 Oct 2026
**Source of truth:** NOA × FLEG Score proposal (NOPG 2026). This WO implements the public-facing, real-time, shareable surface the deck requires. WO-1/WO-2 (rules presets + guarded scoring) are done; WO-3 (ranked persistence) is in progress; this is the next build.

## Why (from the proposal)
The deck repeatedly requires a public surface for the Games:
- "Live Scoring & Results → **A public scoreboard anyone can follow**" (slide 8)
- "Publish → **Public pages and live results**", "**View Public Page**" (slides 7, 5)
- Match Centre with filters **All Sports · All Districts · All Rounds** (slide 4)
- Governance: **Controlled publishing** — only published competitions are public (slide 13)
NOPG 2026: 2–14 Nov 2026, Chümoukedima & Dimapur, 17 districts, multi-sport (football + boxing, taekwondo, wushu, pencak silat, archery, athletics, badminton, basketball, and the other NSPG disciplines).

## Guardrails
- Production Supabase is **read-only** for you (no migrations/writes; Claude owns DB). No service-role key in the app. 
- **Public = published only.** A public viewer sees only tournaments/matches whose lifecycle state is published, and only confirmed data. Never expose draft tournaments, unpublished results, or any personal registration fields (no phone, email, Aadhaar, DOB) on public surfaces — public shows name, district/team, sport, category, scores, standings, times/distances.
- Read-only for public: public screens never call write RPCs. No auth required to view a public page.
- Fail-closed: a sport/category with no confirmed result shows "No result yet", never a guessed score.

## What already exists (reuse, don't rebuild)
- Organizer hub `app/tournament/[id].tsx` with tabs: `EntrantsTab`, `FixturesTab`, `ScheduleTab`, `StandingsTab`, `SettingsTab` (+ `HubContext`, `Tabs`).
- `app/match/[id].tsx` (scoring control), `app/live/[id].tsx` (live view), `app/event/[id].tsx`.
- `components/scoring/MatchScoringView.tsx`, `components/ranked-results/RankedResultsView.tsx`.
- `lib/bracket/knockout.ts`, `lib/queries.ts` (fetchEvents, standings, etc.), engines in `lib/scoring/`.
Reuse the projection/engine logic and standings/bracket computation — public views are read-only renderings of the same data.

## Tasks

### 1. Public Match Centre  `app/p/index.tsx` (or `app/public/index.tsx`)
A no-login landing listing live + upcoming + recent matches across ALL published NOPG tournaments.
- Filters: **Sport**, **District**, **Round/Stage** (match the deck: All Sports / All Districts / All Rounds). Default = All.
- A clear **LIVE** section at top (matches with status live), then Upcoming (scheduled), then Recent results.
- Each row: sport, category, two sides (team/athlete + district), score or scheduled time, LIVE badge. Tapping opens the public match page.
- Polling refresh (Realtime has no member tables yet) — reasonable interval (e.g. 15–20s) with pull-to-refresh.

### 2. Public Tournament Page  `app/p/tournament/[id].tsx`
Read-only view of one published tournament with tabs mirroring the hub but public-safe: **Fixtures · Standings · Brackets · Results**.
- Standings table (Pos, Team, P, W, D, L, GD, Pts) from existing standings logic.
- Knockout bracket view (reuse `lib/bracket/knockout.ts`) with BYEs + progression.
- Results list (completed matches). 
- A "Share" action producing a public link to this page.

### 3. Public Match Page  `app/p/match/[id].tsx`
Read-only live/finished match view: scoreboard, period/clock where relevant, event timeline (goals, cards, points, bout result, ends), final result. Reuse the projection the scoring view uses, in read-only mode. Combat → winner + method; racket/volleyball/sepak → sets; archery H2H → ends/sets + shoot-off; team → score + timeline.

### 4. Public Ranked Board  `app/p/ranked/[boardId].tsx`
Read-only athletics/archery ranking board (reuse `RankedResultsView` projection in read-only): ranked list with times/distances/points, DNS/DNF/DSQ, shared ranks, and the qualifier preview — **qualification stays informational, never creates entrants/brackets**.

### 5. Publish gating + "View Public Page"
- In `SettingsTab`, surface the publish state and a **View Public Page** action (deep link to the public tournament page) once published. 
- Public routes must resolve only published tournaments; an unpublished/again-drafted id on a public route shows a neutral "Not available" (same fail-closed pattern as `/scoring-lab` in production).

## Data notes for Claude (not your task)
Public read access relies on RLS allowing anon SELECT on published tournaments + their matches/score_events/standings, and on the ranked tables (already public-read). If you find a public read blocked by RLS, **stop and flag it to Claude** — do not widen RLS or use the service key.

## Acceptance
- A published tournament is fully viewable with no login; a draft one is not visible on public routes.
- Match centre filters by sport/district/round and shows live/upcoming/recent correctly against seeded dev data.
- No personal fields (phone/email/Aadhaar/DOB) appear on any public surface — add a test asserting the public serializers omit them.
- Public screens issue zero write calls (assert in tests/mocks).
- `npx tsc --noEmit` clean; all `tests/` suites green; add public-view tests.

## When done
Report files changed, test counts before/after, any RLS/field-exposure blockers (flag to Claude), and confirm the no-personal-data + read-only assertions pass.

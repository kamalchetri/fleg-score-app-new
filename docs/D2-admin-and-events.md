# D2 — Admin/organiser dashboard + Events (Discover) spec

Design system: Electric Dark Score (`docs/stitch/DESIGN.md`), reuse Task A kit. Builds on D1.

---
## TASK F — Admin / organiser control dashboard

Full control surface for `admin` / `nspg_lead` / `nspg_staff` / `organiser` (gate via `useRole()`). Extends the Task C organiser area into a proper dashboard. NSPG admin sees all disciplines; a sport-association organiser sees only theirs.

### F1. Dashboard home  (`app/organiser/index.tsx`)
- Top: role + scope. KPI row (chartreuse-accent cards): # tournaments, matches today, live now, results pending publish.
- **Discipline grid**: one card per tournament/sport showing status chips — Entrants (n), Fixtures (generated? y/n), Matches (live / played / remaining), Published (n). Tap → discipline control.

### F2. Discipline control  (`app/organiser/[tournamentId]/index.tsx`)
Tabbed, mirrors the Stitch organiser look:
- **Entrants** — approve/reject/waitlist, tap-to-reveal contact (reuse WP2 hub).
- **Fixtures & Brackets** — generate by format (league/groups/knockout via formats engine); render bracket (rounds, seeds) and league/group tables; edit a fixture (teams/seed), regenerate, advance winners. Bracket must be viewable + editable.
- **Schedule** — court/time/referee per match; walkover.
- **Scores** — list matches with a "Score"/"Open pad" action per match → F3. Shows live/FT state.
- **Settings** — lifecycle draft→live→complete (WP2 ALLOWED_TRANSITIONS); publish toggle.

### F3. Score update (per discipline)  (`app/organiser/[tournamentId]/score/[matchId].tsx`)
- Opens the right scoring pad for the sport archetype (reuse existing engine + WP1 referee flow + the production `/match/[id]` guarded flow Task C already wired).
- Every tap → `append_score_event_guarded` (ranked sports → `append_ranked_action_guarded`); optimistic UI, reconcile from the RPC's authoritative return; undo supported.
- On final → publish → result flows to the public NSPG hub (`lib/nspg-live.ts`).

### F4. Bracket view component
- Reusable bracket renderer (knockout rounds + seeds + scores), used in F2 and shareable to the public sport screen (D1 §2 knockout fallback). Horizontal scroll on mobile.

**Connects:** management (entrants/fixtures/schedule/lifecycle) + scoring (guarded RPCs) + results/standings (formats engine) — one surface. Build against Task C seed tournaments; swaps to provisioned tournaments at cutover.

---
## TASK G — Events into the app (Discover + Home + register/checkout)

Bring every fleg.in event into the app so Discover looks like the real product. Reads **only** `lib/events-live.ts` (seed-backed now; live `events_v_public` view at cutover). Match Stitch `events_discovery_tournaments_reg_events` + `event_detail_register_checkout`.

### G1. Discover tab  (`app/(tabs)/discover/index.tsx`)
- Search + filter pills by kind (All / Tournaments / Runs / Clinics / Fundraisers).
- Event cards from `listEvents()`: banner, title, kind + sport chip, date, city, status pill (Open / Live / Closed / Past), price ("FREE" or "from ₹X"), organiser attribution. Tap → event detail. NSPG card (`isNspg`) routes into the NSPG hub (D1), not generic detail.

### G2. Home feed  (`app/(tabs)/index.tsx`)
- Hero from `listFeaturedEvents()` (live/open). "Happening now" + "Upcoming" strips of event cards. A prominent NSPG entry point.

### G3. Event detail + register/checkout  (`app/(tabs)/discover/[slug].tsx`)
- From `getEvent(slug)`: banner, title, date/venue, description, rules, important notes, organiser.
- Category picker (EventCategoryOption) → **Register**. Free → confirm; paid → Razorpay checkout (via `startRegistration`, wired by Claude at cutover — build the form + checkout UI now against `EventDetail`). Respect `requiresLogin` (prompt sign-in) and `registrationCloseAt` (show "Registration closed").

**Acceptance (F & G):** `npx tsc --noEmit` clean; scoring-engine tests pass; screens match Stitch + Electric Dark Score; data only via `lib/*-live.ts`; screenshots on device.

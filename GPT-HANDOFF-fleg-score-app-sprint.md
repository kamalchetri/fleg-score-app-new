# FLEG Score App — One-Week Sprint Handoff for GPT

_Prepared 2026-10-11 for Kamal. Read this fully before touching the codebase. It covers the goal, the one-week sprint plan, the current state of `fleg-score-app`, the shared-database situation (and the required solution for it), the division of labour, and what's still open._

---

## 1. The goal (and the clock)

Build the **FLEG Score mobile app** — a tournament management + **live scoring** app — ready to run the **NSPG 2026 Games** (Nagaland State & PWD Games, Chümoukedima & Dimapur). **This is a ONE-WEEK SPRINT.** The Games registration closes 15 Oct 2026; the competition runs after that, so the app must be ready for real scorers in days, not weeks.

The bar Kamal set: **all sports, live, production, for real NSPG use.** See §5 for how that is made realistic without lying about scope.

---

## 2. Where this sits in the FLEG ecosystem

FLEG is **one ecosystem, three products, shared users** (one Google login works everywhere):

| Product | What | Stack | Folder |
|---|---|---|---|
| **fleg.in** | Marketing + live event registration (NSPG 2026 etc.) | Next.js 15 web | `C:\Users\kxtri\Fleg-score` |
| **Fleg-score (web)** | Tournament management + live scoring on the web; already live | Next.js 15 web | `C:\Users\kxtri\Fleg-score` |
| **fleg-score-app** | **THIS sprint** — the mobile app for tournament mgmt + scoring | Expo / React Native | `C:\Users\kxtri\fleg-score-app` |
| **fleg-mobile** | Consumer app (bookings, community, gamification) — separate track | Expo / React Native | `C:\Users\kxtri\fleg-mobile` |

Key point: **the web Fleg-score already does everything the app needs to do** — the tournament schema, scoring engines, brackets, standings, public live pages all exist and are proven. The app is a **mobile client over the same backend and the same logic**, not a new platform.

---

## 3. ⚠️ THE ONE-DATABASE SITUATION (and the required solution)

**All of FLEG runs on a single Supabase project:**

```
Project ref : zcubdqfzdbwtfcdsntoa
URL         : https://zcubdqfzdbwtfcdsntoa.supabase.co
Internal name: "Fleg-web"
```

This one project is shared by fleg.in + Fleg-score web + **live NSPG registration** + fleg-mobile + now **fleg-score-app**. Segregation is by **Postgres schema**, not separate databases:
- `auth.users` + `public.profiles` — shared identity across everything.
- `public.*` — tournaments, matches, teams, scoring, registrations (`reg_forms`, `reg_submissions`, `reg_form_categories`, `reg_submission_categories`), workshops, NPRS, RMLCF, Coffee Run.
- `fleg` schema — fleg-mobile's app domain (venues, bookings, challenges, gamification). **Not exposed over the API.**

### The problem Kamal is flagging
One **live production** database, during an **active Games**, now has multiple apps and multiple AI agents (GPT on the app UI, Claude on the DB) potentially writing and migrating against it. Risks: table/name collisions, an accidental destructive migration, RLS policy conflicts, and — worst case — breaking live NSPG registration or live scoring mid-event.

### The required solution (follow this — it is not optional)
1. **Stay on the one database.** A second Supabase project is NOT the answer: the scoring app needs the NSPG registration + tournament data that already live here, plus the shared login. Splitting would break identity and duplicate data. The fix is **discipline + process**, not a new DB.
2. **Scoring app needs almost no new schema.** The tournament/match/scoring tables already exist (used by web Fleg-score). The app mostly **reads and writes existing tables via existing patterns** — so new DDL is minimal by design.
3. **Additive-only, never destructive.** No `drop`, no `alter ... drop`, no re-running old migrations on the live project. New objects only, and only when truly needed.
4. **All schema changes go through Claude via the Supabase MCP, on a dev branch first.** GPT writes the SQL + a short spec and hands it back; Claude applies it to a **Supabase dev branch** (`create_branch`), verifies, then merges to production (`merge_branch`). Nothing hits production untested.
5. **Freeze DDL during the NSPG live window** except NSPG-critical fixes. Build the app against the schema as it already stands.
6. **App uses the anon key + RPCs / RLS-guarded reads only.** The service-role key never ships in the mobile app. Privileged writes (if any) go through SECURITY DEFINER functions.
7. **Clear table ownership** so GPT (app) and the web app don't collide: the app reuses the existing tournament/match/scoring tables — it does not invent parallel ones.

GPT's practical rule: **if you think you need a schema change, stop and write it as a spec for Claude — do not assume the app can create tables or hit the `fleg` schema directly.**

---

## 4. Current state of `fleg-score-app` (NOT starting from zero)

Already scaffolded — Expo SDK 57, React Native 0.86, React 19, expo-router, TypeScript, `@supabase/supabase-js`, `react-native-razorpay`. App id/scheme already set.

**Screens present (`app/`):** `_layout`, `index`, `home`, `discover`, `events`, `games`, `profile`, `settings`, `login`, `signup`, `onboarding`, `auth-callback`, `tournament/[id]`, `tournament/new`, `match/[id]`, `live/[id]`, `event/[id]`, `organize/new`, `organize/earnings`.

**Library layer present (`lib/`):** `scoring/`, `formats/`, `bracket/`, `sports/`, `queries.ts`, `registration.ts`, `reg-types.ts`, `form-builder.ts`, `format.ts`, `home-feed.ts`, `events-feed.ts`, `auth-context.tsx`, `google-auth.ts`, `supabase.ts`, `database.types.ts`, `theme.ts`, `uploads.ts`, `money.ts`, `earnings.ts`.

So the **scoring engines, format resolution, and bracket logic are already ported** from web, and the screen skeleton exists. The sprint is wiring + hardening, not green-field.

---

## 5. The scope reframe that makes "all sports" real

16 sports are not 16 builds — they are **~5 scoring archetypes**. Build the 5, map them to all 16:

| Archetype | Sports | Engine status |
|---|---|---|
| Team score + clock | Football, Basketball, Volleyball, Sepaktakraw | Exist on web |
| Racket sets/points | Badminton, Table Tennis, Lawn Tennis | Badminton engine built |
| Combat bracket (winner / round points) | Boxing, Taekwondo, Wushu, Wrestling, Pencak Silat | Bracket logic exists; bout UI new |
| Athletics (heats/finals, times & distances) | Athletics | Results-entry, new |
| Archery (ends & arrows) | Archery | Score-sheet, new |

**Delivery model (keeps a live Games safe):**
- **Management for ALL 16 sports from day one** — draws, scheduling, result entry, standings, public view. Low risk (data + existing engines).
- **Live scoring depth rolls out per archetype**, team + racket first (most matches, lowest risk on reliable tablet wifi), then combat, then athletics/archery as structured entry.
- **Web Fleg-score stays live as the fallback.** If a pad misbehaves at a venue, that sport falls back to web for that session. Never a single point of failure.

---

## 6. The 7-day plan

- **Day 1** — Lock shared data layer + auth in app; tournament/match screens on live NSPG data; scorer-role gating. Audit what `lib/scoring|formats|bracket` already covers vs the 5 archetypes → gap list.
- **Day 2–3** — Team + racket live scoring pads. **Online-first, optimistic UI with confirm-on-write** (port the web desync guard — see §8).
- **Day 4** — Combat brackets: draw → bout → tap winner / round points → advance.
- **Day 5** — Athletics + archery result entry; standings/leaderboards; public live view.
- **Day 6** — Venue hardening: two-scorers-same-match guard, reconnection behavior, EAS build on real tablets, seeded dry-run.
- **Day 7** — Buffer, fixes, per-sport go-live checklist, train operators.

---

## 7. Platform & distribution

One Expo/React Native codebase → **Android + iOS**.
- **Android** — EAS builds an APK, side-load directly onto scorer tablets. No store, instant, updatable. **This is the live-Games deployment.**
- **iOS** — needs an Apple Developer account ($99/yr); distribute to own devices via **TestFlight**. Full App Store review will NOT happen inside the sprint and is not needed for NSPG.
- **Open question:** are the scorer tablets **Android or iPad**? If Android, iOS is "test on your own iPhone" and costs no sprint time. If iPad, the Apple Developer account must be sorted Day 1.

---

## 8. Known traps / guardrails (don't relearn these the hard way)

- **Optimistic-UI outruns the DB** — fast scoring taps can lose writes if the UI updates before the DB confirms. Already hit + solved on web; port that pattern (await the write, confirm, reconcile). This is the single biggest live-scoring risk.
- **Two scorers on one match** — guard against conflicting concurrent writes.
- **Reliable wifi assumed** (Kamal's call) → online-first is OK; no heavy offline-sync needed. But handle reconnection gracefully.
- **CRLF / file truncation on Windows** — use the Write tool for new files.
- **Never ship the service-role key in the app.**

---

## 9. Division of labour

- **GPT owns the app UI/code** (Expo/React Native screens + wiring to existing RPCs/tables).
- **Claude owns the database/backend** (Supabase `zcubdqfzdbwtfcdsntoa`) via the Supabase MCP — the sandbox can't reach Supabase directly, and this is the one shared live project. GPT hands back SQL specs; Claude applies on a dev branch, verifies, merges.
- Web deploys (fleg.in / Fleg-score) go via git → Vercel (push to `main`). The app ships via Expo/EAS.

---

## 10. What Kamal still needs to confirm / provide

1. **Green light on the reframe** (§5): management for all 16 + live scoring rolled out by archetype (team-first), web as fallback — vs insisting every sport has a finished live pad on day 7 (not honestly deliverable).
2. **Scorer tablets: Android or iPad?** (decides the iOS path).
3. **Who the scorers are**, and getting the **actual tablets early for a venue dry-run**.
4. **Apple Developer account** — does one exist, if iPads are in play?

---

## One-paragraph summary to paste at the top of a GPT chat

> FLEG Score App is an Expo/React Native tournament-management + live-scoring app being built in a ONE-WEEK sprint to run NSPG 2026. It is the mobile client over the already-proven web Fleg-score backend — tournament schema, scoring engines, brackets, and standings already exist, and `fleg-score-app` is already scaffolded (screens + `lib/scoring|formats|bracket`), so this is wiring + hardening, not green-field. All of FLEG shares ONE live Supabase project (`zcubdqfzdbwtfcdsntoa`), segregated by Postgres schema; the required discipline is: stay on the one DB (NSPG data + shared login live here), additive-only changes, all DDL via Claude on a Supabase dev branch then merged, freeze schema during the NSPG window, app uses anon key + RPCs only, never the service role. "All sports live" is made real by treating 16 sports as ~5 scoring archetypes (team+clock, racket, combat bracket, athletics, archery) plus management-for-all from day one, with web Fleg-score as the live fallback. Deployment is Android APK on scorer tablets (iOS via TestFlight for testing). GPT owns the app UI; Claude owns the shared database and applies vetted SQL.

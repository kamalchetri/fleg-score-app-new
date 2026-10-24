# FLEG Score — Build Plan (NSPG section first)

**Owner split:** Claude = DB/backend, data contracts, provisioning, RLS, design specs, orchestration, verification. Cursor / Gemini (Antigravity) / GPT = app UI + flow implementation against Claude's contracts.
**Date:** 17 Oct 2026 · **Hard dates:** NSPG registration closes **24 Oct**; Games run **2–14 Nov 2026**.

## 1. What we're building
FLEG Score is the product (not an NSPG tool). One ecosystem on one Supabase DB (`zcubdqfzdbwtfcdsntoa`):
- **fleg-score-app** — the mobile app (Expo, iOS + Android). The real product.
- **fleg.in** — stays the website (registration, public pages).
- **fleg-mobile** — existing; same DB.

NSPG is **one section** inside the app, not the whole app. Design = "Electric Dark Score" (charcoal `#0D0E12` + chartreuse `#CEF202`, Plus Jakarta Sans). The 5 Stitch screens are the design language; Claude extends it to the rest.

## 2. NSPG section — scope to hand them for testing

### Public (no login)
- **NSPG hub**: the Games, sports list, dates.
- **Fixtures & schedule** per sport.
- **Live match centre**: scores update live.
- **Results, standings & brackets** per sport.
- **Medal tally / district standings** (light Sports-Intelligence view).

### Organiser login (NSPG lead/staff + sport associations)
- Role-based auth (Supabase; reuse `profiles.role`: admin / nspg_lead / nspg_staff + association organiser).
- **Tournament management** per sport: entrants (from registrations) → generate fixtures/brackets → schedule → assign venue/referee.
- **Live scoring**: sport-specific pads (the 16-sport scoring engine already exists) → guarded writes.
- **Publish** results → flows to the public hub.

## 3. Backend / data contracts (Claude builds first, so UI has stable APIs)
Applied to production only **after 24 Oct**, fresh snapshot, with Kamal's explicit go.
1. **Provisioning**: turn the ~2,900 NSPG registrations (reg_forms/reg_submissions) into tournaments → categories → entrants/teams per sport. (Importer already verified in isolated PG; needs blocked-class resolution + apply.)
2. **Competition schema**: tournaments, stages, matches, results — plus **guarded scoring RPC** (compare-and-swap, verified), **ranked-results persistence**, **audit log** (all verified in isolated PG; apply to prod).
3. **RLS + public read**: anonymous read for live scores/fixtures/results; writes gated to organiser roles.
4. **Payments**: Razorpay paid registration + organiser payouts for non-NSPG events (NSPG free).

## 4. Work packages & agent assignment
Order = dependency order. Each WP gets its own detailed spec from Claude before it starts.

| WP | What | Owner | Depends on |
|----|------|-------|-----------|
| **B1** | Apply verified migrations to prod + provision NSPG tournaments | Claude (DB) | reg close 24 Oct |
| **B2** | Public-read RLS + read APIs/views for hub (fixtures, live, results, standings) | Claude (DB) | B1 |
| **D1** | Design the NSPG screen set in Electric Dark Score (hub, match centre, fixtures, standings, scoring pads, organiser, auth) | Claude (design specs) | — (now) |
| **U1** | App shell + auth + navigation + NSPG hub (public: fixtures/live/results/standings) | agent | D1, B2 |
| **U2** | Organiser login area: tournament mgmt (entrants → fixtures → schedule) | agent | D1, B1 |
| **U3** | Live scoring pads wired to guarded RPC (all 16 sports via ~5 archetypes) | agent | D1, B1 |
| **U4** | Publish flow + public match centre live updates | agent | U1, U3 |
| **P1** | Razorpay paid registration + organiser payouts (non-NSPG) | agent + Claude (DB) | after NSPG milestone |

## 5. Timeline
- **Now → 24 Oct**: D1 (designs) + U1/U2/U3 built against a **staging/seed dataset** (not prod). Claude finalises B1/B2 migrations in isolated PG.
- **24–26 Oct**: registration closed → Claude runs prod cutover (B1) + public read (B2), gated.
- **26 Oct → 1 Nov**: wire app to live data, organiser + association testing, fix on feedback.
- **2–14 Nov**: Games live; monitor + hotfix.
- **Post-Games**: P1 (payments/payouts), consumer polish, fold fleg.in web features in.

## 6. Immediate next steps
1. Claude: write **D1** design specs (screen-by-screen, Electric Dark Score) for the NSPG set.
2. Claude: confirm the provisioning importer handles every NSPG sport's format (teams/pairs/ranked/weight classes) on isolated PG; list any blocked classes needing a committee decision.
3. Agents: start **U1** (app shell + auth + NSPG public hub) against seed data using D1.
4. Hold all prod DB writes until 24 Oct.

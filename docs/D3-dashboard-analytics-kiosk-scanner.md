# D3 — Full NSPG operations: organiser builder, player analytics, kiosk, accreditation scanner

Design: Electric Dark Score. Builds on D1/D2. Everything builds against seed now (no committee wait); Claude pushes real entrants + applies the access/analytics DB at cutover. Reframe: **we push players as entrants; organisers build their own fixtures/brackets/venues.**

---
## TASK F+ — Organiser fixture / bracket / venue builder (real writes)
Expand the Task F organiser control (`app/organiser/[tournamentId]/…`) from stubs into a working builder. Writes go through organiser-role RLS (Claude confirms policies at cutover); build optimistic against seed now.

- **Entrants (pushed):** we pre-load the final athletes/teams per discipline (Claude's provisioning-lite). Organiser only approves/orders/seeds — not data entry.
- **Venue:** organiser can add/edit venues (name, address, optional image/map) and assign a venue to the tournament and per-match. New `venues` data in the organiser data layer.
- **Fixtures & brackets:** pick format (league / groups+knockout / knockout), **generate** fixtures via the formats engine, then **edit** (swap entrants, set seeds, set round), **regenerate**, and **advance winners** into the next round. Render an editable bracket (rounds, seeds, scores) + league/group tables.
- **Schedule:** per-match court/venue + date-time + referee; walkover.
- **Publish:** flips the discipline/matches public → shows in the NSPG hub.
- Reuse the existing formats engine in `lib/` and WP2 hub patterns. Data via `lib/nspg-organiser.ts` (extend it; keep screens off raw tables).

## TASK H — Player profile + detailed analytics ("sports science")
A professional athlete page, reused after NSPG. Data via new `lib/athlete-live.ts` (`getAthleteProfile`, `getAthleteAnalytics`).
- **Header:** photo, name, Reg ID, district, sport(s), age/gender, accreditation role.
- **Competition standing:** current rank in their event/category, W-L record, matches played/remaining, next match (date/venue).
- **Detailed stats (per sport archetype):** e.g. football — goals, assists, cards, minutes; combat — bouts, wins by type, points for/against; racket/net — sets/points won %, service stats; athletics/archery — best marks, heat→final progression, ranking points. Show as stat cards + simple trend bars (Chart via CDN is fine).
- **History:** every match with result; medal(s) won. Built so stats persist as the athlete's permanent FLEG record after the Games.

## TASK I — Kiosk / inquiry mode (Reg-ID lookup)
A simple, locked-down lookup for help-desk volunteers. Data via `lib/athlete-live.ts` (`getAthleteByRegId`).
- Full-screen "Enter Athlete / Official Reg ID" (e.g. `FBL-1234`, `TS-3258`) + numeric-friendly input and a "Scan instead" button (→ Task J scanner).
- On lookup: show the person's **roster/profile card** — name, photo, district, sport, team, role; **their schedule** (upcoming matches: opponent, date, court/venue); accommodation; team staff contacts.
- Kiosk mode = no personal login; a device flag puts the app into kiosk (only lookup + scan, no organiser/admin). "New search" resets. Read-only.

## TASK J — Accreditation scanner + access/movement log
NSPG accreditation: scan a participant's ID at a checkpoint to (a) verify accreditation and (b) record the movement. Data via new `lib/access-live.ts` (`logScan`, `listCheckpoints`, `recentScans`).
- **Scanner screen:** camera QR scan of the participant ID (the Reg ID / NSPG pass QR), or manual Reg-ID entry fallback. Pick/assign the **checkpoint** (e.g. Main Gate, Cafeteria, Athletes' Village, each Arena) and optional direction (In/Out).
- On scan: show a big PASS/なし card — photo, name, role, accreditation valid? — and **log the event** (reg_code, checkpoint, timestamp, direction, scanned_by) via `logScan` → `log_access_scan` RPC (Claude provides at cutover; build against seed now).
- **Access log view** (organiser/admin): recent scans, filter by checkpoint/person/time — so NSPG can see who entered where and when (cafeteria entry times, venue entry, etc.).
- Checkpoints are configurable (organiser/admin adds them).

### Access-log DB (Claude, additive — `docs/B3-access-log.sql`, staged + verified)
- `nspg_checkpoints(id, name, kind, created_by)` ; `nspg_access_scans(id, reg_code, checkpoint_id, direction, scanned_at, scanned_by, note)`.
- `log_access_scan(p_reg_code, p_checkpoint_id, p_direction)` → validates reg_code exists, inserts a scan, returns the person's name/role/photo for the PASS card. Indexed on (reg_code), (checkpoint_id, scanned_at).
- RLS: insert/select by accreditation/organiser/admin roles only. This is event accreditation data for NSPG's own accredited participants at NSPG venues.

## Acceptance (all)
`npx tsc --noEmit` clean; scoring/engine tests pass; screens match Electric Dark Score; data only via `lib/*-live.ts`; device screenshots. All functional on seed with no committee input required.

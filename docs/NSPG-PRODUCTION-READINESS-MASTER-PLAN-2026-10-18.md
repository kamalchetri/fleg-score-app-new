# FLEG Score / NSPG 2026 production-readiness master plan

**Prepared:** 18 October 2026  
**Purpose:** Convert the NOA proposal and the official NSPG schedule into an executable product and acceptance plan.  
**Safety boundary:** This plan does not authorize production database writes. Registration, payments, events, and existing tournament data remain protected.

## The product we are committing to

FLEG Score is the connected competition system described in the proposal:

1. Registration and verified athlete intake.
2. Tournament, discipline, category, entrant, roster, and venue management.
3. Fixtures, brackets, groups, schedules, officials, and court/field assignments.
4. Live scoring for every discipline using the correct scoring model.
5. Public live match centre and results/standings.
6. Athlete record, history, rankings, medals, and later sports-intelligence analytics.
7. Kiosk/inquiry mode and accreditation/access control.
8. Governance, auditability, backups, exports, corrections, and controlled publishing.

The app must be enjoyable for spectators, precise for referees, fast for organisers, and understandable for help-desk staff. It must remain safe when offline or when a device loses connectivity, and it must never silently invent a result.

## Schedule facts to use for planning

The supplied schedule lists the event window as **2–14 November 2026**, with venues in Chümoukedima, Dimapur, Sovima, and Kohima. The schedule matrix currently shows:

| Discipline | Venue | Scheduled dates |
|---|---|---|
| Archery | Cricket Stadium, Sovima | 3–6 Nov |
| Athletics | SAI, Dimapur | 3–6 Nov |
| Badminton | Kire Stadium, NAPTC | 3–6 Nov |
| Basketball | 1st NAP Ground | 3–7 Nov |
| Boxing | 1st NAP Ground | 10–13 Nov |
| Football | DGP Sports Ground | 10–14 Nov |
| Lawn tennis | Kuda, Dimapur | 10–11 Nov |
| Pencak silat | Immanuel Hall, Signal Basti, Dimapur | 3–5 Nov |
| Sepak takraw | Multi Disciplinary Stadium, Sovima | 12–14 Nov |
| Table tennis | Multi Disciplinary Stadium, Sovima | 4–6 Nov |
| Taekwondo | Kire Stadium, NAPTC | 10–11 Nov |
| Volleyball | 1st NAP Ground | 10–13 Nov |
| Wrestling | Multi Disciplinary Complex, near DC Complex, Chümoukedima | 4–5 Nov |
| Wushu | Multi Disciplinary Complex, near DC Complex, Chümoukedima | 12–13 Nov |

These are planning inputs, not yet production tournament rows. The association must confirm venue names, courts/fields, local time, schedule revisions, and discipline/category rules before import.

## Capability acceptance matrix

### Registration and verification

- Import only from a fresh, approved post-close snapshot.
- Preserve registration rows and payment history.
- Maintain a review queue for withdrawals, duplicate submissions, category changes, and unresolved team/partner/weight decisions.
- Require association approval before a registration becomes an official entrant.
- Store only the minimum public athlete data; keep answers, phone numbers, emails, and identity documents private.

### Tournament operations

- Create private draft tournaments for each discipline.
- Add categories and approved rules.
- Resolve entrants, teams, doubles, squads, combat weight classes, and qualification/seeding.
- Manage venues, courts/fields, officials, staff assignments, and schedule conflicts.
- Generate and edit brackets, groups, leagues, heats, finals, and ranked start lists.
- Provide a complete audit trail for every manual correction and publication.

### Scoring coverage

| Discipline family | Required production recorder | Current foundation |
|---|---|---|
| Football | Team score, clock, match events | Engine/lab exists; production rules and RPC pending |
| Basketball | Team score, clock, fouls/timeouts | Engine/lab exists; production rules and RPC pending |
| Volleyball | Rally points, sets, caps | Engine/lab exists; production rules and RPC pending |
| Sepak takraw | Rally points, sets, caps | Engine/lab exists; production rules and RPC pending |
| Badminton | Rally points, games/sets | Engine exists; production rules and RPC pending |
| Table tennis | Games/sets, explicit rules | Singles engine exists; category/rules approval pending |
| Lawn tennis | Points, games, sets, tiebreak | Singles engine exists; category/rules approval pending |
| Combat (boxing, taekwondo, wrestling, Sanda/Tanding) | Bout winner, method, points, review/undo | Structured engine exists; federation rule decisions pending |
| Archery head-to-head | End totals, review, shoot-off | Engine exists; qualification/seeding and rules pending |
| Athletics | Measured marks, status, heats/finals | Ranked-results lab exists; persistence and event rules pending |
| Archery ranking | Points/qualification/ranking | Ranked-results lab exists; persistence and qualification rules pending |
| Artistic Pencak / Wushu Taolu | Judge marks, aggregation, penalties | Structured recorder still required |

Every recorder must support review-before-commit, undo/reopen where authorized, conflict detection, authoritative server reconciliation, and a separate result-confirmation/publish action.

### Public and spectator experience

- Guest access to NSPG hub, discipline pages, live match centre, schedules, results, medals, and rankings.
- Live updates with clear “last updated” and connection state.
- Filters by discipline, venue, date, phase, and live/upcoming/completed.
- Shareable match and athlete pages without exposing private registration fields.
- Medal tally and district/association views only from published official results.
- Accessible dark/light contrast, readable score emphasis, large tap targets, and graceful low-connectivity behavior.

### Athlete history and sports science

- Stable association-approved athlete identity and registration ID.
- Event history, category, opponents, results, medals, rankings, and participation timeline.
- Per-sport analytics only from validated records; never infer medical or performance claims from incomplete data.
- Consent, correction, retention, export, and deletion rules approved before public athlete profiles.
- Later expansion: workload trends, efficiency metrics, longitudinal rankings, and state-level dashboards.

### Kiosk and accreditation

- Reg-ID lookup for help-desk volunteers with schedule, venue, opponent, and accommodation information.
- Read-only kiosk mode with reset/new-search behavior.
- QR/manual accreditation scan at configured checkpoints.
- Big PASS/FAIL card, In/Out state, duplicate/re-entry handling, and access-log review for authorised staff.

## Release gates

### Gate 1 — Association review build

- No-login APK with sample data only.
- All 14 disciplines visible, with the correct recorder or explicit structured/ranked workflow.
- Public live hub, schedule, results, medal tally, kiosk, and rules sheet.
- Organiser dashboard and referee flows demonstrated against fixtures.

### Gate 2 — Dev rehearsal

- Disposable database only.
- Apply and test guarded score writes, ranked-result writes, access scans, rules, linkage/audit tables, and sport constraints.
- Run provisioning, duplicate/retry, rollback, timeout, permission, and concurrent-write tests.
- Simulate every schedule day and venue.

### Gate 3 — Production cutover approval

- Fresh closed-registration snapshot and digest.
- Signed TC approval for categories, rules, rosters, partners, weights, qualifiers, venues, schedules, organizer, staff, privacy, and publishing.
- Private draft tournaments only; verify counts and audit output before publishing anything.
- Rollback plan, backups, on-call contacts, and web fallback tested.

### Gate 4 — Association pilot and feedback

- Staff, referees, kiosk volunteers, athletes, and spectators each complete a scripted test.
- Capture defects by role, discipline, device, and severity.
- No public “official result” label until the association signs off the workflow.

## Non-negotiable safety rules

- No production migration or RPC deployment without explicit approval.
- No automatic conversion of all registrations into entrants.
- No invented teams, partners, weights, qualification outcomes, rules, or winners.
- No deletion or mutation of registrations, payments, events, existing tournaments, entrants, or score history.
- No public exposure of private registration answers or identity documents.
- No athlete analytics claims until identity linkage, consent, governance, and correction workflows are approved.

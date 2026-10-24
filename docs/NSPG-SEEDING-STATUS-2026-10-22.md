# NSPG 2026 — App Seeding Status Report

**Generated:** 22 October 2026
**Database:** production (`zcubdqfzdbwtfcdsntoa`)
**Scope:** NSPG athlete/team data loaded into the FLEG Score app

---

## Summary

| Metric | Count |
|---|---|
| Districts seeded | **13 of 17** |
| Athletes seeded | **1,786** |
| Entrants created | **1,419** |
| Provenance links | 2,136 |
| Orphan / broken links | **0** |
| NSPG tournaments | 14 (all draft/private) |

"Entrants" is lower than "athletes" because team sports fold a whole district squad into a single team entry (e.g. one football team = ~20 athletes = 1 entrant). Individual events (athletics, archery, racket/combat singles) are one entrant per athlete.

Each athlete is seeded in one of three ways:
- **Singles** — combat & racket singles (boxing, taekwondo, wrestling, wushu, pencak tanding, badminton/TT/lawn-tennis singles).
- **Ranked individual** — athletics track/field, archery individual, pencak artistic solo.
- **Team member** — football, volleyball, basketball, sepaktakraw, relays, archery/badminton/TT teams & doubles squads (grouped into one district team entrant).

---

## Seeded districts (13)

| District | Confirmed | Seeded | Entrants | Singles | Ranked indiv | Team members |
|---|---|---|---|---|---|---|
| Dimapur | 225 | 225 | 216 | 101 | 48 | 120 |
| Chümoukedima | 203 | 197 | 171 | 70 | 41 | 134 |
| Phek | 179 | 177 | 135 | 50 | 44 | 110 |
| Wokha | 159 | 159 | 149 | 55 | 36 | 107 |
| Mon | 156 | 156 | 91 | 36 | 20 | 126 |
| Peren | 146 | 146 | 112 | 29 | 39 | 103 |
| Tuensang | 135 | 135 | 104 | 31 | 28 | 103 |
| Niuland | 130 | 130 | 84 | 56 | 7 | 80 |
| Shamator | 111 | 111 | 60 | 22 | 9 | 91 |
| Noklak | 95 | 95 | 95 | 23 | 26 | 67 |
| Tseminyü | 95 | 95 | 82 | 37 | 14 | 67 |
| Longleng | 91 | 91 | 62 | 16 | 25 | 62 |
| Meluri | 69 | 69 | 58 | 15 | 26 | 35 |

Where "Seeded" is a little under "Confirmed" (Chümoukedima 197/203, Phek 177/179), the gap is a handful of confirmed athletes whose only entry is a held-back edge case — a combat athlete registered in two weight classes (needs one weight chosen), or a doubles-only pair pending organiser pairing. These are recorded for review, not lost.

---

## Not yet seeded (4)

| District | Confirmed athletes | Status |
|---|---|---|
| Kohima | 190 | Workbook not yet verified |
| Mokokchung | 182 | Workbook not yet verified |
| Zunheboto | 92 | Workbook not yet verified |
| Kiphire | 59 | **Verified clean** — ready to seed on your go |

**523 athletes** across these 4 remain. Kiphire has already passed verification (100% clean) and can be seeded immediately; Kohima, Mokokchung and Zunheboto are awaiting their verification workbooks from the contingents.

---

## Open review items (small, non-blocking)

- **Doubles pairing** — badminton / table-tennis / lawn-tennis doubles are seeded as district *squads*; the organiser forms the actual pairs in the fixture builder (no partner field exists in registration).
- **Multi-weight combat** — a few athletes registered in two weight classes; each needs one weight confirmed.
- **Dimapur CDM officials** — CDM-1044 and CDM-1083 were left in place pending your word (officials, not seeded as athletes anyway).
- **Organising Committee IDs** — the NOA affiliation option was removed from the officials form as requested; a separate OC registration link is to be created after district verification completes.

---

## Production safety posture

- All 14 NSPG tournaments remain **draft / private**; the public read-views are **not** applied. Nothing is visible publicly yet.
- Every seed ran through the guarded importer: project-ref + acknowledgement + organiser + snapshot-hash gates, advisory lock, idempotent on `(submission_id, reg_category_id)`, and post-insert verification. A failed check rolls the whole import back.
- All seeding is additive and provenance-tracked in `nspg_import_links` / `nspg_import_objects`; registration rows, documents, payments and non-NSPG data are untouched.
- Flipping the app to show this data (apply read-views + publish tournaments) is the single remaining cutover step, to be done after registration fully closes.

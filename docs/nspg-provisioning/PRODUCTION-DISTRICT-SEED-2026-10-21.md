# NSPG verified district seed — 21 October 2026

Production project: `zcubdqfzdbwtfcdsntoa`

The four verified districts were imported into draft/private NSPG tournament
records through the guarded `nspg_seed_verified_districts` transaction:

| District | Confirmed auto-importable singles | Imported entrants |
| --- | ---: | ---: |
| Tseminyü | 37 | 37 |
| Longleng | 16 | 16 |
| Noklak | 23 | 23 |
| Peren | 29 | 29 |
| **Total** | **105** | **105** |

The transaction created 7 sport tournaments, 50 categories, and 105 provenance
links. A repeat apply created 0 tournaments, 0 categories, 0 links, and 0
entrants.

The snapshot hash was
`424f705c8f612d85045d2f1622bfa924f88954411aa8863fbff60fd885dda13a`.

All imported links point to confirmed registrations and matching categories and
entrants. Withdrawn, team/roster, doubles/pairs, ranked, qualification,
artistic, and multi-weight records were not imported.

The migration added the NSPG sport values to the tournament check and created
default-deny provenance tables with RLS enabled. The seed function is revoked
from `PUBLIC`, `anon`, and `authenticated`; it is not an app write path.

The operation did not update or delete registration, answer, Aadhaar, photo,
payment, workshop, public-event, existing tournament, or existing entrant rows.
The competition registration records still contain Aadhaar, photo, and
Aadhaar-image fields for all 2,358 competition submissions.

Existing non-NSPG state after the transaction: 17 tournaments and 263 entrants.

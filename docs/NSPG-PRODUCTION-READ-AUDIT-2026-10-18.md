# NSPG / Fleg Score production read audit

**Audit date:** 18 October 2026 (IST)  
**Scope:** Connected Supabase projects, NSPG registration safety, Fleg Score production readiness, and the next technical-committee (TC) decisions.  
**Safety:** Read-only inspection only. No rows, schema, policies, functions, storage, registrations, payments, tournaments, or events were changed.

## Executive summary

The connector is working and the live Fleg-web project is healthy. NSPG competition registration data is present and intact. The competition forms are now closed; the remaining open NSPG form is for officials/organising support, not athlete competition. Fleg Score has a strong scoring-engine and review-lab foundation, but production NSPG tournament operations are not yet provisioned. The safest path is to keep registration and the public website untouched, finish the no-login review build, collect TC decisions and authoritative rosters, rehearse against a disposable database, and only then consider a separately approved production cutover.

## Connected projects

The connector currently exposes **two** Supabase projects, not three:

| Project | Reference | Status | Role in the ecosystem |
|---|---|---|---|
| Fleg-web | `zcubdqfzdbwtfcdsntoa` | Active/healthy | fleg.in registrations, public events, tournament foundation, NSPG data |
| fleg-mobile | `wjzqymlxfqvydbdpjjxx` | Active/healthy | player/social app data; no NSPG competition data found |

If a third project is expected, it is not currently visible through this connector and should be identified before it is used.

## NSPG registration status

There are **22** forms with `nspg26-` slugs. The 14 competition forms are closed. The officials/support forms are closed or archived except:

- `nspg26-noa` — **open**, closes **23 October 2026 at 18:30 UTC** (24 October in India depending on display/time-zone wording).

The live database currently reports the following confirmed competition submissions (personal fields were not included in this audit):

- Archery 84
- Athletics 375
- Badminton 144
- Basketball 322
- Boxing 78
- Football 258
- Lawn tennis 19
- Pencak silat 161
- Sepaktakraw 125
- Table tennis 107
- Taekwondo 176
- Volleyball 322
- Wrestling 58
- Wushu 106

The competition forms contain withdrawals as well; those rows must remain reviewable and must never be deleted as part of provisioning. Registration records are not entrants: a confirmed person/category link still requires classification, roster/partner decisions, and TC approval.

## Current production competition state

The Fleg-web project currently has:

- 17 tournaments, including 1 live, 6 drafts, and 1 completed.
- 348 matches, including 1 live, 127 scheduled/draft, and 218 completed.
- 263 existing entrants.
- 5,095 score events.
- No NSPG tournaments or NSPG production import-link table were found.

Existing tournaments, matches, entrants, score events, registrations, payments, workshops, and public events are outside the NSPG provisioning scope and must remain untouched.

## Security and access findings

Most operational tables have RLS enabled with role-appropriate policies. One critical exception remains:

- `public.nspg_recon_official` has RLS **disabled** and 215 rows. It may be readable by anonymous/authenticated clients depending on the API exposure. I did not enable RLS because doing so without approved policies could break legitimate access; the association must first decide who may read and write reconciliation data.

`public_events` is also intentionally public and has RLS disabled; its public-event exposure should be reviewed separately, but it is not an NSPG registration table. No automatic remediation was applied.

The live database currently has `reg_form_submit` and `set_score_event_tournament`, but **does not have** the proposed `append_score_event_guarded`, `append_ranked_action_guarded`, or `log_access_scan` functions. Those remain unapplied and must only be rehearsed on a disposable/dev database before any production decision.

## What is ready in the app

The repository already contains a substantial NSPG foundation:

- Central sport registry with fail-closed routing.
- Live engines/labs for team score, racket/rally, combat, volleyball, sepaktakraw, table tennis singles, lawn-tennis singles, archery head-to-head, and ranked-result recording.
- Explicit “Rules not configured” behavior instead of guessing a scoring format.
- Guarded-scoring client path and unapplied SQL package.
- Ranked-results contract and in-memory lab.
- Fail-closed NSPG provisioning package with classification, candidate manifest, digest, idempotency, rollback, and local harness tests.
- Public/live display paths that show saved snapshots for unsupported or structured sports.

This is review-build ready groundwork, not a claim that all NSPG operations are production-ready.

## What is still required for production-grade NSPG

### TC / association decisions

1. Confirm the authoritative sport and category list and reconcile the proposal’s older “nine disciplines” wording with the live 14 competition sports.
2. Approve rules per discipline: match lengths, sets, caps, combat methods, archery format, athletics heats/finals, tie-breaks, and correction/reopen rules.
3. Name the organizer profile and staff roles. Confirm the database spelling (`organizer`) and the permission model.
4. Confirm dates, venues, courts/fields, cities, visibility, publishing authority, and who can certify official results.
5. Supply authoritative team/squad rosters, doubles/mixed partners, volleyball overlap resolution, archery qualification/seeding, and multi-weight choices.
6. Approve the athlete identity and registration-to-entrant linkage policy, including what may be public.

### Engineering / rehearsal

1. Finish and issue the no-login review APK with sample data only; it must never read production registration data in review mode.
2. Add the missing production contracts only on a disposable/dev database: guarded scoring, ranked results, access scans, rules storage, linkage/audit tables, and the NSPG sport constraint.
3. Complete organiser workflows: entrants, roster resolution, venues, fixtures/brackets, scheduling, officials, check-in, scoring, result confirmation, corrections, publishing, exports, and backups.
4. Build ranked-result persistence and approval workflows for athletics, archery ranking, and other measured events.
5. Add athlete history/analytics only after identity linkage and correction governance are approved. Do not infer records from names, phone numbers, or free-text answers.
6. Re-export and classify a fresh post-close snapshot before any import. The snapshot, candidate manifest, digest, approved counts, and organizer must match exactly.

### Operational quality and store readiness

- Guest viewing must be read-only and contain no personal registration details.
- Organiser/admin actions require authenticated, role-gated access and server-side authorization.
- Add privacy policy, terms, support/contact, account deletion, data export/correction, consent, retention, and child-safety wording before store submission.
- Keep payment handling on the web where appropriate; never embed secrets in the mobile app.
- Add crash/error monitoring, offline/retry behavior, backup/restore rehearsal, audit logs, and a support escalation path.
- Test accessibility, text scaling, contrast, gesture/3-button navigation, keyboard behavior, and low-connectivity conditions on physical devices.

## Safe execution order

1. Preserve the live web registration and event systems; make no production schema or data changes during review.
2. Finish the review APK and collect association feedback on every sport and public-live flow.
3. Obtain written TC decisions and authoritative roster/partner files.
4. Rehearse the complete schema, RPC, provisioning, rollback, and verification package on a disposable database.
5. After all approvals and a fresh snapshot, plan a small, private, reversible production cutover with a rollback window.
6. Operate with fleg.in as the fallback until the association signs off on app workflows.

## Explicit non-goals right now

- No production migration or RPC deployment.
- No automatic conversion of all registrations into entrants.
- No invented teams, partners, rosters, winners, weights, rules, or venues.
- No deletion or modification of registration, payment, workshop, event, tournament, entrant, or score data.
- No public athlete analytics until identity, consent, governance, and correction workflows are approved.

# Cursor Work Order — WO-5: Governance (Audit Log viewer + Data Export)

**Repo:** `fleg-score-app`  ·  **Issued by:** Claude  ·  **Date:** 13 Oct 2026
**Source of truth:** NOA × FLEG Score proposal, slide 13 "Governance, Data & Control" — Audit Log, Data exportability, Controlled publishing. Backend (`docs/nspg-audit/migration.sql`) is written and **verified on isolated Postgres** (triggers + RPC + append-only). Claude applies the migration; you build the UI against this contract.

## Guardrails
- Production Supabase is **read-only** for you (no migrations/writes; Claude owns DB). No service-role key. 
- The audit log is **append-only** — the app only reads it and appends via the RPC. Never attempt UPDATE/DELETE.
- Export is organizer/admin-only and must exclude personal fields from any public path (see WO-4). Internal NOA export may include contact fields for staff only — keep it inside the authenticated organizer hub, never on a public route.
- `npx tsc --noEmit` clean, all `tests/` green before reporting.

## Verified DB contract (do not change)
Table `public.audit_log(id, occurred_at, actor_id, tournament_id, action, entity_type, entity_id, details jsonb)` — staff (owner/co_organizer) read via RLS; append-only.
Core events are written automatically by DB triggers: `competition_created`, `event_published`, `tournament_status_changed`, `role_granted`, `role_updated`, `role_revoked`, `result_finalized`, `result_reopened`.
App/ops events go through the RPC:
```
log_audit_event(p_tournament_id uuid, p_action text, p_entity_type text, p_entity_id text, p_details jsonb) RETURNS bigint
```
Gates: `not_authenticated` (42501), `not_tournament_staff` (42501 when tournament-scoped), `bad_action` (22023).

## Tasks

### 1. Audit Log viewer (organizer hub)
Add an **Audit Log** tab/screen inside `app/tournament/[id].tsx` (visible to owner/co_organizer only).
- Read `audit_log` for this `tournament_id`, newest first, paginated.
- Columns per the deck: **Time · User · Action · Details** (e.g. "Today 10:24 · Admin · Result Updated · Athletics 100m Heat 1"). Resolve `actor_id` → a display name via a profiles read (name/email); if unavailable show a short id. Humanize `action` (e.g. `event_published` → "Event Published") and render `details` (from/to, role, format) readably.
- Filter by action type and date range. No write controls.

### 2. Log app-side governance events via the RPC
At these moments call `log_audit_event(...)` (triggers already cover create/publish/role/finalize, so do NOT double-log those):
- **Data exported** → after a successful export (task 3): `action='data_exported'`, `entity_type='results'|'standings'|'entrants'`, `details={format:'csv', rows:N, scope:...}`.
- **Backup completed** → if/when the app triggers a backup action: `action='backup_completed'`.
- Any other app-only action NOA asks to track later. Keep actions to a documented set; don't invent noisy per-tap events.
An RPC failure surfaces an error but must not block the underlying action; never fall back to a direct table insert.

### 3. Data export (CSV)
In the organizer hub, add **Export** for the tournament:
- Export **Results**, **Standings**, and **Entrants** as CSV (one export each, or a combined picker like the deck's "Export Results / Match Data / Player Statistics / Standings" checklist).
- Build CSV from the existing read queries/projections (results, standings, entrants) — no new DB needed. Use a share/save flow appropriate to Expo (e.g. write to a file + share sheet).
- On success, call `log_audit_event('data_exported', ...)` (task 2).
- Entrants export (which contains contact fields) is organizer/admin-only; never expose it on a public route.

## Acceptance
- Owner/co_organizer sees the Audit Log for their tournament with Time/User/Action/Details; non-staff cannot read it (RLS enforced — if a read is blocked unexpectedly, flag to Claude, don't widen RLS).
- Creating a tournament, publishing it, granting a role, and finalizing a match each produce a correct audit row (via triggers) and appear in the viewer.
- Exporting results/standings/entrants produces valid CSVs and writes exactly one `data_exported` audit row each.
- Public routes never expose the audit log or the entrants/contact export.
- `npx tsc --noEmit` clean; all suites green; add viewer + export + audit-logging tests (mock the RPC).

## When done
Report files changed, test counts before/after, and flag any RLS/field-exposure blocker to Claude rather than working around it.

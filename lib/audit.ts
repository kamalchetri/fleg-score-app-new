// Append-only audit helpers. Trigger events are written by the database.
// The app may append only data_exported and backup_completed, and only through the RPC.

export const AUDIT_PAGE_SIZE = 40;

export const AUDIT_TRIGGER_ACTIONS = [
  "competition_created",
  "event_published",
  "tournament_status_changed",
  "role_granted",
  "role_updated",
  "role_revoked",
  "result_finalized",
  "result_reopened",
] as const;

export const AUDIT_APP_ACTIONS = ["data_exported", "backup_completed"] as const;

export const AUDIT_ACTIONS = [...AUDIT_TRIGGER_ACTIONS, ...AUDIT_APP_ACTIONS] as const;

export type AuditAppAction = (typeof AUDIT_APP_ACTIONS)[number];
export type AuditExportEntity = "results" | "standings" | "entrants";

const ACTION_LABELS: Record<string, string> = {
  competition_created: "Competition Created",
  event_published: "Event Published",
  tournament_status_changed: "Tournament Status Changed",
  role_granted: "Role Granted",
  role_updated: "Role Updated",
  role_revoked: "Role Revoked",
  result_finalized: "Result Finalized",
  result_reopened: "Result Reopened",
  data_exported: "Data Exported",
  backup_completed: "Backup Completed",
};

const DETAIL_KEYS = ["label", "from", "to", "status", "role", "format", "rows", "scope"] as const;
const HIDDEN_DETAIL_KEYS = new Set([
  "email",
  "phone",
  "contact_email",
  "contact_phone",
  "contact_name",
  "full_name",
]);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface AuditRpcArgs {
  p_tournament_id: string;
  p_action: string;
  p_entity_type: string;
  p_entity_id: string;
  p_details: Record<string, unknown>;
}

export interface AuditRpc {
  (args: AuditRpcArgs): Promise<{ data: number | null; error: { message: string } | null }>;
}

export function isOrganizerRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "co_organizer";
}

export function humanizeAction(action: string): string {
  const known = ACTION_LABELS[action];
  if (known) return known;
  return action
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatAuditTime(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const clock = `${hours}:${minutes}`;
  if (date.toDateString() === now.toDateString()) return `Today ${clock}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${clock}`;
}

export function actorLabel(actorId: string | null, names: ReadonlyMap<string, string | null>): string {
  if (!actorId) return "System";
  const name = names.get(actorId);
  if (name && name.trim()) return name.trim();
  return actorId.slice(0, 8);
}

export function formatAuditDetails(details: unknown): string {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const row = details as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof row.label === "string" && row.label.trim()) parts.push(row.label.trim());
  if (typeof row.from === "string" && typeof row.to === "string") parts.push(`${row.from} → ${row.to}`);
  else if (typeof row.to === "string") parts.push(`to ${row.to}`);
  if (typeof row.status === "string" && row.status.trim()) parts.push(row.status.trim());
  if (typeof row.role === "string" && row.role.trim()) parts.push(row.role.trim());
  if (typeof row.format === "string" && row.format.trim()) parts.push(row.format.trim());
  if (typeof row.rows === "number" && Number.isFinite(row.rows)) parts.push(`${row.rows} rows`);
  if (typeof row.scope === "string" && row.scope.trim()) parts.push(row.scope.trim());
  for (const [key, value] of Object.entries(row)) {
    if (HIDDEN_DETAIL_KEYS.has(key) || DETAIL_KEYS.includes(key as (typeof DETAIL_KEYS)[number])) continue;
    if (typeof value === "string" && value.trim()) parts.push(`${key} ${value.trim()}`);
  }
  return parts.join(" · ");
}

export interface AuditReadPlan {
  tournamentId: string;
  action: string | null;
  occurredGte: string | null;
  occurredLte: string | null;
  rangeFrom: number;
  rangeTo: number;
}

export function auditReadPlan(input: {
  tournamentId: string;
  action: string | null;
  occurredGte: string | null;
  occurredLte: string | null;
  page: number;
}): AuditReadPlan | null {
  if (!input.tournamentId) return null;
  if (input.action && !AUDIT_ACTIONS.includes(input.action as (typeof AUDIT_ACTIONS)[number])) return null;
  if (!Number.isInteger(input.page) || input.page < 0) return null;
  const rangeFrom = input.page * AUDIT_PAGE_SIZE;
  return {
    tournamentId: input.tournamentId,
    action: input.action,
    occurredGte: input.occurredGte,
    occurredLte: input.occurredLte,
    rangeFrom,
    rangeTo: rangeFrom + AUDIT_PAGE_SIZE - 1,
  };
}

export function localDayRange(now: Date, daysBack: number): { from: string; to: string } {
  const start = new Date(now);
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** RPC append only. A failure is returned. This never inserts into audit_log. */
export async function appendAuditEvent(
  input: {
    tournamentId: string;
    action: AuditAppAction;
    entityType: string;
    entityId: string;
    details: Record<string, unknown>;
  },
  rpc: AuditRpc,
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  if (!AUDIT_APP_ACTIONS.includes(input.action)) return { ok: false, message: "bad_action" };
  const result = await rpc({
    p_tournament_id: input.tournamentId,
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_details: input.details,
  });
  if (result.error) return { ok: false, message: result.error.message };
  if (typeof result.data !== "number") return { ok: false, message: "Audit log returned no id." };
  return { ok: true, id: result.data };
}

export async function auditDataExported(
  input: { tournamentId: string; entityType: AuditExportEntity; rows: number },
  rpc: AuditRpc,
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  return appendAuditEvent(
    {
      tournamentId: input.tournamentId,
      action: "data_exported",
      entityType: input.entityType,
      entityId: input.tournamentId,
      details: { format: "csv", rows: input.rows, scope: "tournament" },
    },
    rpc,
  );
}

export async function auditBackupCompleted(
  input: { tournamentId: string; details?: Record<string, unknown> },
  rpc: AuditRpc,
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  return appendAuditEvent(
    {
      tournamentId: input.tournamentId,
      action: "backup_completed",
      entityType: "tournament",
      entityId: input.tournamentId,
      details: input.details ?? {},
    },
    rpc,
  );
}

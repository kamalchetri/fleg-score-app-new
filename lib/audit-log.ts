// Read audit_log and append through log_audit_event. No insert, update, or delete.

import type { Json } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import {
  appendAuditEvent,
  auditBackupCompleted,
  auditDataExported,
  type AuditAppAction,
  type AuditExportEntity,
  type AuditReadPlan,
  type AuditRpc,
} from "@/lib/audit";

export interface AuditLogRow {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  tournament_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
}

function asDetails(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

const rpc: AuditRpc = async (args) => {
  const { data, error } = await supabase.rpc("log_audit_event", {
    ...args,
    p_details: args.p_details as Json,
  });
  return { data, error };
};

export async function logAuditEvent(input: {
  tournamentId: string;
  action: AuditAppAction;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
}): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  return appendAuditEvent(input, rpc);
}

export async function logDataExported(input: {
  tournamentId: string;
  entityType: AuditExportEntity;
  rows: number;
}): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  return auditDataExported(input, rpc);
}

export async function logBackupCompleted(input: {
  tournamentId: string;
  details?: Record<string, unknown>;
}): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  return auditBackupCompleted(input, rpc);
}

export async function fetchAuditPage(plan: AuditReadPlan): Promise<{ rows: AuditLogRow[]; error: string | null }> {
  let query = supabase
    .from("audit_log")
    .select("id, occurred_at, actor_id, tournament_id, action, entity_type, entity_id, details")
    .eq("tournament_id", plan.tournamentId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .range(plan.rangeFrom, plan.rangeTo);
  if (plan.action) query = query.eq("action", plan.action);
  if (plan.occurredGte) query = query.gte("occurred_at", plan.occurredGte);
  if (plan.occurredLte) query = query.lte("occurred_at", plan.occurredLte);
  const { data, error } = await query;
  if (error) return { rows: [], error: error.message };
  return {
    rows: (data ?? []).map((row) => ({
      id: row.id,
      occurred_at: row.occurred_at,
      actor_id: row.actor_id,
      tournament_id: row.tournament_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      details: asDetails(row.details),
    })),
    error: null,
  };
}

/** Profiles store full_name, not email. A blocked read leaves names empty. */
export async function fetchActorNames(
  ids: string[],
): Promise<{ names: Map<string, string | null>; error: string | null }> {
  const unique = [...new Set(ids.filter((id) => id.length > 0))];
  if (unique.length === 0) return { names: new Map(), error: null };
  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  if (error) return { names: new Map(), error: error.message };
  return {
    names: new Map((data ?? []).map((profile) => [profile.id, profile.full_name])),
    error: null,
  };
}

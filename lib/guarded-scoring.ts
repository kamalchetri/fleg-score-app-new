import type { Json } from "@/lib/database.types";

/**
 * Optimistic match-control rows use ids at or above this floor so they sort
 * after confirmed rows. They are never a compare-and-swap expected id.
 * Confirmed score_events ids are positive identities below this floor.
 */
export const OPTIMISTIC_EVENT_ID_FLOOR = Number.MAX_SAFE_INTEGER - 1_000_000;

export const SCORE_CONFLICT_MESSAGE =
  "Score changed on another device. Review the latest score and try again.";

export type AppendScoreEventInput = {
  matchId: string;
  eventType: string;
  payload: Record<string, unknown>;
  expectedLastEventId: number;
};

export type AppendScoreEventResult =
  | { status: "appended"; eventId: number; lastEventId: number }
  | { status: "conflict"; lastEventId: number }
  | { status: "error"; message: string };

export type GuardedAppendRow = {
  ok: boolean;
  conflict: boolean;
  event_id: number | null;
  last_event_id: number | null;
};

export function isGuardedScoringEnabled(): boolean {
  return process.env.EXPO_PUBLIC_GUARDED_SCORING_ENABLED === "true";
}

export function isConfirmedScoreEventId(id: number): boolean {
  return Number.isInteger(id) && id > 0 && id < OPTIMISTIC_EVENT_ID_FLOOR;
}

/** Latest confirmed positive id, or 0 when the match has no confirmed events. */
export function expectedLastEventId(events: readonly { id: number }[]): number {
  let max = 0;
  for (const event of events) {
    if (!isConfirmedScoreEventId(event.id)) continue;
    if (event.id > max) max = event.id;
  }
  return max;
}

export function interpretGuardedAppend(
  error: { message: string } | null,
  rows: readonly GuardedAppendRow[] | null,
): AppendScoreEventResult {
  if (error) return { status: "error", message: error.message };
  const row = rows?.[0];
  if (!row) {
    return { status: "error", message: "Guarded score append returned no result." };
  }
  if (
    row.ok === true &&
    row.conflict === false &&
    typeof row.event_id === "number" &&
    typeof row.last_event_id === "number"
  ) {
    return { status: "appended", eventId: row.event_id, lastEventId: row.last_event_id };
  }
  if (row.ok === false && row.conflict === true && typeof row.last_event_id === "number") {
    return { status: "conflict", lastEventId: row.last_event_id };
  }
  return { status: "error", message: "Guarded score append returned an unexpected result." };
}

export function guardedAppendArgs(input: AppendScoreEventInput): {
  p_match_id: string;
  p_event_type: string;
  p_payload: Json;
  p_expected_last_event_id: number;
} {
  return {
    p_match_id: input.matchId,
    p_event_type: input.eventType,
    p_payload: input.payload as Json,
    p_expected_last_event_id: input.expectedLastEventId,
  };
}

export type ScoreWriteOutcome =
  | { path: "legacy" }
  | { path: "guarded"; result: AppendScoreEventResult };

/** What match control does after a guarded write. Conflict refetches and does not retry. */
export function presentGuardedAppend(result: AppendScoreEventResult): {
  rollbackToConfirmed: boolean;
  refetch: boolean;
  alertTitle: string | null;
  alertBody: string | null;
} {
  if (result.status === "conflict") {
    return {
      rollbackToConfirmed: true,
      refetch: true,
      alertTitle: SCORE_CONFLICT_MESSAGE,
      alertBody: null,
    };
  }
  if (result.status === "error") {
    return {
      rollbackToConfirmed: true,
      refetch: false,
      alertTitle: "Not recorded",
      alertBody: result.message,
    };
  }
  return { rollbackToConfirmed: false, refetch: true, alertTitle: null, alertBody: null };
}

/**
 * Flag off: one direct insert. Flag on: one guarded RPC.
 * An RPC error or conflict does not call the direct insert.
 */
export async function dispatchScoreWrite(input: {
  guarded: boolean;
  matchId: string;
  eventType: string;
  payload: Record<string, unknown>;
  confirmedEvents: readonly { id: number }[];
  directInsert: (
    matchId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
  guardedAppend: (input: AppendScoreEventInput) => Promise<AppendScoreEventResult>;
}): Promise<ScoreWriteOutcome> {
  if (!input.guarded) {
    await input.directInsert(input.matchId, input.eventType, input.payload);
    return { path: "legacy" };
  }
  const result = await input.guardedAppend({
    matchId: input.matchId,
    eventType: input.eventType,
    payload: input.payload,
    expectedLastEventId: expectedLastEventId(input.confirmedEvents),
  });
  return { path: "guarded", result };
}

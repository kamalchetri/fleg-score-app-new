// SYNC: copied from Fleg-score web 2026-07-04 — keep in sync manually (no edits here)
// Shared types for the pure scoring engine. No I/O in this module tree.

export type Side = "a" | "b";

/** Minimal shape of a score_events row the engine needs. */
export interface ScoringEvent {
  id: number;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface MatchState {
  /** Headline score: futsal goals, pickleball games won. */
  scoreSummary: { a: number; b: number };
  isComplete: boolean;
  winnerSide: Side | null;
  /** Human-readable score, e.g. "2 – 1" or "11-7, 8-11, 11-9". */
  display: string;
  /** Sport-specific detail for the control/scoreboard UIs. */
  detail: FutsalDetail | PickleballDetail;
}

export interface FutsalCard {
  side: Side;
  cardType: "yellow" | "red";
  player: string | null;
}

export interface FutsalDetail {
  sport: "futsal";
  goals: { a: number; b: number };
  /** Shootout goals — only populated when play goes past regulation. */
  shootout: { a: number; b: number } | null;
  cards: FutsalCard[];
  /** 1-based period currently in play, or null if between periods / not started. */
  currentPeriod: number | null;
  /** ISO timestamp of the current period's start (drives the timer), null when no period live. */
  periodStartedAt: string | null;
  periodsCompleted: number;
  /** Regulation periods from sport config. */
  regulationPeriods: number;
  inShootout: boolean;
}

export interface PickleballDetail {
  sport: "pickleball";
  gamesWon: { a: number; b: number };
  /** Completed game scores in order, e.g. [{a:11,b:7},{a:8,b:11}]. */
  completedGames: Array<{ a: number; b: number }>;
  /** Points in the game currently in progress. */
  currentGame: { a: number; b: number };
  gamesNeeded: number;
  pointsTo: number;
  winBy: number;
}

export function sideFromPayload(payload: Record<string, unknown>): Side | null {
  const side = payload["side"];
  return side === "a" || side === "b" ? side : null;
}

/**
 * Applies undo semantics: an `undo` event cancels the latest not-yet-undone
 * event whose type is in `undoableTypes`. Replays in id order and returns the
 * surviving (non-cancelled, non-undo) events, still in id order.
 */
export function resolveUndos(
  events: ScoringEvent[],
  undoableTypes: ReadonlySet<string>,
): ScoringEvent[] {
  const sorted = [...events].sort((x, y) => x.id - y.id);
  const cancelled = new Set<number>();
  const undoableStack: number[] = [];

  for (const ev of sorted) {
    if (ev.event_type === "undo") {
      const target = undoableStack.pop();
      if (target !== undefined) cancelled.add(target);
    } else if (undoableTypes.has(ev.event_type)) {
      undoableStack.push(ev.id);
    }
  }

  return sorted.filter(
    (ev) => ev.event_type !== "undo" && !cancelled.has(ev.id),
  );
}

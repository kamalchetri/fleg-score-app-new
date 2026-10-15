// Combat bout result. One explicit result completes the match. No round clock or point rules.

import {
  BOUT_NOTE_MAX,
  BOUT_RESULT_METHODS,
  resolveUndos,
  type BoutMethod,
  type BoutResult,
  type CombatDetail,
  type MatchState,
  type ScoringEvent,
  type Side,
} from "./types";

const UNDOABLE = new Set(["bout_result"]);
const METHODS = new Set<string>(BOUT_RESULT_METHODS);

const METHOD_LABEL: Record<BoutMethod, string> = {
  decision: "Decision",
  stoppage: "Stoppage",
  walkover: "Walkover",
  disqualification: "Disqualification",
  other: "Other",
};

export function boutMethodLabel(method: BoutMethod): string {
  return METHOD_LABEL[method];
}

function optionalPoints(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "invalid";
  return value;
}

/** Returns null when the payload cannot be a bout result. Callers skip those events. */
export function parseBoutResult(payload: Record<string, unknown>): BoutResult | null {
  const winnerSide = payload["winnerSide"];
  if (winnerSide !== "a" && winnerSide !== "b") return null;
  const method = payload["method"];
  if (typeof method !== "string" || !METHODS.has(method)) return null;
  const pointsA = optionalPoints(payload["pointsA"]);
  const pointsB = optionalPoints(payload["pointsB"]);
  if (pointsA === "invalid" || pointsB === "invalid") return null;
  let note: string | null = null;
  if (payload["note"] !== undefined && payload["note"] !== null) {
    if (typeof payload["note"] !== "string") return null;
    const trimmed = payload["note"].trim();
    if (trimmed.length > BOUT_NOTE_MAX) return null;
    note = trimmed.length > 0 ? trimmed : null;
  }
  return {
    winnerSide,
    pointsA,
    pointsB,
    method: method as BoutMethod,
    note,
  };
}

export function combatHasPoints(result: BoutResult): boolean {
  return result.pointsA !== null && result.pointsB !== null;
}

export function formatCombatDisplay(result: BoutResult | null): string {
  if (!result) return "No result";
  if (combatHasPoints(result) && result.pointsA !== null && result.pointsB !== null) {
    return `${result.pointsA} – ${result.pointsB}`;
  }
  return boutMethodLabel(result.method);
}

function incomplete(): MatchState {
  const detail: CombatDetail = { sport: "combat", result: null };
  return {
    scoreSummary: { a: 0, b: 0 },
    isComplete: false,
    winnerSide: null,
    display: "No result",
    detail,
  };
}

export function computeCombatState(events: ScoringEvent[]): MatchState {
  const effective = resolveUndos(events, UNDOABLE);
  let result: BoutResult | null = null;
  for (const event of effective) {
    if (event.event_type !== "bout_result") continue;
    const parsed = parseBoutResult(event.payload);
    if (!parsed) continue;
    result = parsed;
  }
  if (!result) return incomplete();

  const points =
    combatHasPoints(result) && result.pointsA !== null && result.pointsB !== null
      ? { a: result.pointsA, b: result.pointsB }
      : { a: 0, b: 0 };
  const detail: CombatDetail = { sport: "combat", result };
  return {
    scoreSummary: points,
    isComplete: true,
    winnerSide: result.winnerSide as Side,
    display: formatCombatDisplay(result),
    detail,
  };
}

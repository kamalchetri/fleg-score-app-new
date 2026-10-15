// Shared rally-and-set scoring. Callers supply an already validated config.
// This module does not invent sport presets or NSPG values.
// Event vocabulary:
//   point  payload { side }
//   undo   reverts the latest point

import {
  resolveUndos,
  sideFromPayload,
  type RallySetConfig,
  type RallySetScoreboard,
  type ScoringEvent,
  type Side,
} from "./types";

const UNDOABLE = new Set(["point"]);

function positiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

/** Missing or null means no cap. Any other invalid value rejects the rules object. */
function optionalCap(value: unknown, pointsTo: number): number | null | undefined {
  if (value === undefined || value === null) return null;
  const cap = positiveInteger(value);
  if (cap === null || cap < pointsTo) return undefined;
  return cap;
}

/** Accepts only a complete, consistent rules object. Anything else returns null. */
export function parseRallySetConfig(input: unknown): RallySetConfig | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  const bestOfSets = positiveInteger(row.best_of_sets);
  const regularPoints = positiveInteger(row.regular_set_points_to);
  const decidingPoints = positiveInteger(row.deciding_set_points_to);
  const winBy = positiveInteger(row.win_by);
  if (
    bestOfSets === null ||
    bestOfSets % 2 === 0 ||
    regularPoints === null ||
    decidingPoints === null ||
    winBy === null
  ) {
    return null;
  }
  const regularCap = optionalCap(row.regular_set_cap, regularPoints);
  const decidingCap = optionalCap(row.deciding_set_cap, decidingPoints);
  if (regularCap === undefined || decidingCap === undefined) return null;
  return {
    best_of_sets: bestOfSets,
    regular_set_points_to: regularPoints,
    deciding_set_points_to: decidingPoints,
    win_by: winBy,
    regular_set_cap: regularCap,
    deciding_set_cap: decidingCap,
  };
}

function setWinner(
  score: { a: number; b: number },
  pointsTo: number,
  winBy: number,
  cap: number | null,
): Side | null {
  if (cap !== null) {
    if (score.a >= cap && score.a > score.b) return "a";
    if (score.b >= cap && score.b > score.a) return "b";
  }
  if (score.a >= pointsTo && score.a - score.b >= winBy) return "a";
  if (score.b >= pointsTo && score.b - score.a >= winBy) return "b";
  return null;
}

export interface RallySetComputation {
  scoreSummary: { a: number; b: number };
  isComplete: boolean;
  winnerSide: Side | null;
  display: string;
  detail: RallySetScoreboard;
}

function displayFor(detail: RallySetScoreboard, isComplete: boolean): string {
  const parts = [`${detail.setsWon.a}–${detail.setsWon.b}`];
  if (detail.completedSets.length > 0) {
    parts.push(detail.completedSets.map((set) => `${set.a}-${set.b}`).join(", "));
  }
  if (!isComplete) parts.push(`${detail.currentSet.a}-${detail.currentSet.b}`);
  return parts.join(" · ");
}

export function computeRallySet(config: RallySetConfig, events: ScoringEvent[]): RallySetComputation {
  const setsNeeded = Math.floor(config.best_of_sets / 2) + 1;
  const effective = resolveUndos(events, UNDOABLE);
  const setsWon = { a: 0, b: 0 };
  const completedSets: Array<{ a: number; b: number }> = [];
  let currentSet = { a: 0, b: 0 };
  let matchWinner: Side | null = null;

  for (const event of effective) {
    if (event.event_type !== "point") continue;
    const side = sideFromPayload(event.payload);
    if (!side || matchWinner) continue;
    const deciding = setsWon.a + setsWon.b === config.best_of_sets - 1;
    const pointsTo = deciding ? config.deciding_set_points_to : config.regular_set_points_to;
    const cap = deciding ? config.deciding_set_cap : config.regular_set_cap;
    currentSet = { ...currentSet, [side]: currentSet[side] + 1 };
    const winner = setWinner(currentSet, pointsTo, config.win_by, cap);
    if (!winner) continue;
    setsWon[winner] += 1;
    completedSets.push(currentSet);
    currentSet = { a: 0, b: 0 };
    if (setsWon[winner] >= setsNeeded) matchWinner = winner;
  }

  const isComplete = matchWinner !== null;
  const decidingSet = !isComplete && setsWon.a + setsWon.b === config.best_of_sets - 1;
  const pointsTo = decidingSet ? config.deciding_set_points_to : config.regular_set_points_to;
  const cap = decidingSet ? config.deciding_set_cap : config.regular_set_cap;
  const detail: RallySetScoreboard = {
    setsWon: { ...setsWon },
    completedSets: completedSets.map((set) => ({ ...set })),
    currentSet: { ...currentSet },
    decidingSet,
    setsNeeded,
    pointsTo,
    cap,
  };

  return {
    scoreSummary: { ...setsWon },
    isComplete,
    winnerSide: matchWinner,
    display: displayFor(detail, isComplete),
    detail,
  };
}

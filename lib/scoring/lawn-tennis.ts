// Lawn tennis singles scoring. Rules come only from an explicit config.
// This module does not invent NSPG set lengths, tiebreaks, or defaults.
// Event vocabulary:
//   point  payload { side }
//   undo   reverts the latest point

import {
  resolveUndos,
  sideFromPayload,
  type LawnTennisConfig,
  type LawnTennisDetail,
  type LawnTennisPhase,
  type LawnTennisSetScore,
  type LawnTennisTiebreakConfig,
  type MatchState,
  type ScoringEvent,
  type Side,
} from "./types";

const UNDOABLE = new Set(["point"]);
const POINT_NAMES = ["0", "15", "30", "40"];

function positiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

function parseTiebreak(input: unknown): LawnTennisTiebreakConfig | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  if (typeof row.enabled !== "boolean") return null;
  const trigger = positiveInteger(row.trigger_games);
  const pointsTo = positiveInteger(row.points_to);
  const winBy = positiveInteger(row.win_by);
  if (trigger === null || pointsTo === null || winBy === null) return null;
  return { enabled: row.enabled, trigger_games: trigger, points_to: pointsTo, win_by: winBy };
}

/**
 * A tiebreak at T–T can be reached only when a set is not forced to end on the
 * previous game. Win-by 1 with a trigger at or after the games target makes T–T impossible.
 */
function tiebreakCanBeReached(
  tiebreak: LawnTennisTiebreakConfig,
  gamesToWinSet: number,
  setWinByGames: number,
): boolean {
  if (!tiebreak.enabled) return true;
  if (setWinByGames === 1 && tiebreak.trigger_games >= gamesToWinSet) return false;
  return true;
}

/** Accepts only a complete, consistent rules object. Anything else returns null. */
export function parseLawnTennisConfig(input: unknown): LawnTennisConfig | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  const bestOfSets = positiveInteger(row.best_of_sets);
  const gamesToWinSet = positiveInteger(row.games_to_win_set);
  const setWinByGames = positiveInteger(row.set_win_by_games);
  const regular = parseTiebreak(row.regular_set_tiebreak);
  const deciding = parseTiebreak(row.deciding_set_tiebreak);
  if (
    bestOfSets === null ||
    bestOfSets % 2 === 0 ||
    gamesToWinSet === null ||
    setWinByGames === null ||
    regular === null ||
    deciding === null
  ) {
    return null;
  }
  if (!tiebreakCanBeReached(regular, gamesToWinSet, setWinByGames)) return null;
  if (!tiebreakCanBeReached(deciding, gamesToWinSet, setWinByGames)) return null;
  return {
    best_of_sets: bestOfSets,
    games_to_win_set: gamesToWinSet,
    set_win_by_games: setWinByGames,
    regular_set_tiebreak: regular,
    deciding_set_tiebreak: deciding,
  };
}

function gameWinner(points: { a: number; b: number }): Side | null {
  if (points.a >= 4 && points.a - points.b >= 2) return "a";
  if (points.b >= 4 && points.b - points.a >= 2) return "b";
  return null;
}

function marginWinner(
  score: { a: number; b: number },
  target: number,
  winBy: number,
): Side | null {
  if (score.a >= target && score.a - score.b >= winBy) return "a";
  if (score.b >= target && score.b - score.a >= winBy) return "b";
  return null;
}

function pointLabels(
  points: { a: number; b: number },
  inTiebreak: boolean,
): { a: string; b: string; phase: LawnTennisPhase; advantageSide: Side | null } {
  if (inTiebreak) {
    return { a: String(points.a), b: String(points.b), phase: "tiebreak", advantageSide: null };
  }
  if (points.a >= 3 && points.b >= 3) {
    if (points.a === points.b) {
      return { a: "40", b: "40", phase: "deuce", advantageSide: null };
    }
    const advantageSide: Side = points.a > points.b ? "a" : "b";
    return {
      a: advantageSide === "a" ? "Ad" : "40",
      b: advantageSide === "b" ? "Ad" : "40",
      phase: "advantage",
      advantageSide,
    };
  }
  return {
    a: POINT_NAMES[points.a] ?? "40",
    b: POINT_NAMES[points.b] ?? "40",
    phase: "game",
    advantageSide: null,
  };
}

export function formatLawnTennisSet(set: LawnTennisSetScore): string {
  if (!set.tiebreak) return `${set.a}-${set.b}`;
  return `${set.a}-${set.b} (${set.tiebreak.a}-${set.tiebreak.b})`;
}

/** Large scoreboard line for the points currently being played. */
export function lawnTennisPointLine(detail: Pick<LawnTennisDetail, "phase" | "advantageSide" | "pointLabels">): string {
  if (detail.phase === "deuce") return "Deuce";
  if (detail.phase === "advantage") return detail.advantageSide === "a" ? "Ad – 40" : "40 – Ad";
  return `${detail.pointLabels.a} – ${detail.pointLabels.b}`;
}

function displayFor(detail: LawnTennisDetail, isComplete: boolean): string {
  const sets = `${detail.setsWon.a}–${detail.setsWon.b}`;
  const completed =
    detail.completedSets.length > 0 ? detail.completedSets.map(formatLawnTennisSet).join(", ") : "";
  if (isComplete) return completed ? `${sets} · ${completed}` : sets;
  const parts = [sets];
  if (completed) parts.push(completed);
  parts.push(`${detail.games.a}-${detail.games.b}`);
  parts.push(detail.inTiebreak ? `TB ${lawnTennisPointLine(detail)}` : lawnTennisPointLine(detail));
  return parts.join(" · ");
}

export function computeLawnTennisState(config: LawnTennisConfig, events: ScoringEvent[]): MatchState {
  const setsNeeded = Math.floor(config.best_of_sets / 2) + 1;
  const effective = resolveUndos(events, UNDOABLE);
  const setsWon = { a: 0, b: 0 };
  const completedSets: LawnTennisSetScore[] = [];
  let games = { a: 0, b: 0 };
  let points = { a: 0, b: 0 };
  let inTiebreak = false;
  let matchWinner: Side | null = null;

  const awardSet = (winner: Side, setScore: LawnTennisSetScore) => {
    setsWon[winner] += 1;
    completedSets.push(setScore);
    games = { a: 0, b: 0 };
    points = { a: 0, b: 0 };
    inTiebreak = false;
    if (setsWon[winner] >= setsNeeded) matchWinner = winner;
  };

  for (const event of effective) {
    if (event.event_type !== "point") continue;
    const side = sideFromPayload(event.payload);
    if (!side || matchWinner) continue;
    const deciding = setsWon.a + setsWon.b === config.best_of_sets - 1;
    const tiebreak = deciding ? config.deciding_set_tiebreak : config.regular_set_tiebreak;
    if (!inTiebreak && tiebreak.enabled && games.a === tiebreak.trigger_games && games.b === tiebreak.trigger_games) {
      inTiebreak = true;
    }
    points = { ...points, [side]: points[side] + 1 };
    if (inTiebreak) {
      const winner = marginWinner(points, tiebreak.points_to, tiebreak.win_by);
      if (!winner) continue;
      awardSet(winner, {
        a: winner === "a" ? tiebreak.trigger_games + 1 : tiebreak.trigger_games,
        b: winner === "b" ? tiebreak.trigger_games + 1 : tiebreak.trigger_games,
        tiebreak: { ...points },
      });
      continue;
    }
    const wonGame = gameWinner(points);
    if (!wonGame) continue;
    games = { ...games, [wonGame]: games[wonGame] + 1 };
    points = { a: 0, b: 0 };
    const wonSet = marginWinner(games, config.games_to_win_set, config.set_win_by_games);
    if (!wonSet) continue;
    awardSet(wonSet, { a: games.a, b: games.b, tiebreak: null });
  }

  const isComplete = matchWinner !== null;
  const labels = pointLabels(points, inTiebreak && !isComplete);
  const detail: LawnTennisDetail = {
    sport: "lawn_tennis",
    setsWon: { ...setsWon },
    completedSets: completedSets.map((set) => ({
      a: set.a,
      b: set.b,
      tiebreak: set.tiebreak ? { ...set.tiebreak } : null,
    })),
    games: { ...games },
    points: { ...points },
    pointLabels: { a: labels.a, b: labels.b },
    phase: isComplete ? "game" : labels.phase,
    advantageSide: isComplete ? null : labels.advantageSide,
    inTiebreak: isComplete ? false : inTiebreak,
    decidingSet: !isComplete && setsWon.a + setsWon.b === config.best_of_sets - 1,
    setsNeeded,
  };

  return {
    scoreSummary: { ...setsWon },
    isComplete,
    winnerSide: matchWinner,
    display: displayFor(detail, isComplete),
    detail,
  };
}

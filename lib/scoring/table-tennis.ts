// Table tennis rally scoring. Rules come only from an explicit config.
// Event vocabulary:
//   point  payload { side }
//   undo   reverts the latest point

import {
  resolveUndos,
  sideFromPayload,
  type MatchState,
  type ScoringEvent,
  type Side,
  type TableTennisConfig,
  type TableTennisDetail,
} from "./types";

const UNDOABLE = new Set(["point"]);

function positiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

/** Accepts only an explicit valid rules object. Missing or invalid fields return null. */
export function parseTableTennisConfig(input: unknown): TableTennisConfig | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  const bestOf = positiveInteger(row.best_of);
  const pointsTo = positiveInteger(row.points_to);
  const winBy = positiveInteger(row.win_by);
  if (bestOf === null || bestOf % 2 === 0 || pointsTo === null || winBy === null) return null;
  let cap: number | null = null;
  if (row.cap !== undefined && row.cap !== null) {
    cap = positiveInteger(row.cap);
    if (cap === null || cap < pointsTo) return null;
  }
  return { best_of: bestOf, points_to: pointsTo, win_by: winBy, cap };
}

function gameWinner(
  game: { a: number; b: number },
  pointsTo: number,
  winBy: number,
  cap: number | null,
): Side | null {
  if (cap !== null) {
    if (game.a >= cap && game.a > game.b) return "a";
    if (game.b >= cap && game.b > game.a) return "b";
  }
  if (game.a >= pointsTo && game.a - game.b >= winBy) return "a";
  if (game.b >= pointsTo && game.b - game.a >= winBy) return "b";
  return null;
}

function displayFor(
  gamesWon: { a: number; b: number },
  completedGames: Array<{ a: number; b: number }>,
  currentGame: { a: number; b: number },
  isComplete: boolean,
): string {
  const parts = [`${gamesWon.a}–${gamesWon.b}`];
  if (completedGames.length > 0) {
    parts.push(completedGames.map((game) => `${game.a}-${game.b}`).join(", "));
  }
  if (!isComplete) parts.push(`${currentGame.a}-${currentGame.b}`);
  return parts.join(" · ");
}

export function computeTableTennisState(
  config: TableTennisConfig,
  events: ScoringEvent[],
): MatchState {
  const gamesNeeded = Math.floor(config.best_of / 2) + 1;
  const effective = resolveUndos(events, UNDOABLE);
  const gamesWon = { a: 0, b: 0 };
  const completedGames: Array<{ a: number; b: number }> = [];
  let currentGame = { a: 0, b: 0 };
  let matchWinner: Side | null = null;

  for (const event of effective) {
    if (event.event_type !== "point") continue;
    const side = sideFromPayload(event.payload);
    if (!side || matchWinner) continue;
    currentGame = { ...currentGame, [side]: currentGame[side] + 1 };
    const winner = gameWinner(currentGame, config.points_to, config.win_by, config.cap);
    if (!winner) continue;
    gamesWon[winner] += 1;
    completedGames.push(currentGame);
    currentGame = { a: 0, b: 0 };
    if (gamesWon[winner] >= gamesNeeded) matchWinner = winner;
  }

  const isComplete = matchWinner !== null;
  const detail: TableTennisDetail = {
    sport: "table_tennis",
    gamesWon: { ...gamesWon },
    completedGames: completedGames.map((game) => ({ ...game })),
    currentGame: { ...currentGame },
    gamesNeeded,
    pointsTo: config.points_to,
    winBy: config.win_by,
    cap: config.cap,
  };

  return {
    scoreSummary: { ...gamesWon },
    isComplete,
    winnerSide: matchWinner,
    display: displayFor(gamesWon, completedGames, currentGame, isComplete),
    detail,
  };
}

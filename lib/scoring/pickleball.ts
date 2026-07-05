// SYNC: copied from Fleg-score web 2026-07-04 — keep in sync manually (no edits here)
// Pure pickleball scoring engine — rally scoring to points_to (win by win_by),
// games to best_of. Event vocabulary:
//   point       payload { side }
//   game_start  payload {} (optional bookkeeping; games also open implicitly
//               with the first point after a game completes)
//   undo        cancels the latest not-yet-undone point

import type { PickleballConfig } from "@/lib/sports/presets";
import {
  resolveUndos,
  sideFromPayload,
  type MatchState,
  type PickleballDetail,
  type ScoringEvent,
  type Side,
} from "./types";

const UNDOABLE = new Set(["point"]);

function gameWinner(
  game: { a: number; b: number },
  pointsTo: number,
  winBy: number,
): Side | null {
  if (game.a >= pointsTo && game.a - game.b >= winBy) return "a";
  if (game.b >= pointsTo && game.b - game.a >= winBy) return "b";
  return null;
}

export function computePickleballState(
  config: PickleballConfig,
  events: ScoringEvent[],
): MatchState {
  const pointsTo = config.points_to;
  const winBy = config.win_by;
  const gamesNeeded = Math.floor(config.best_of / 2) + 1;

  const effective = resolveUndos(events, UNDOABLE);

  const gamesWon = { a: 0, b: 0 };
  const completedGames: Array<{ a: number; b: number }> = [];
  let currentGame = { a: 0, b: 0 };
  let matchWinner: Side | null = null;

  for (const ev of effective) {
    if (matchWinner) break; // points after match completion are ignored
    if (ev.event_type !== "point") continue;
    const side = sideFromPayload(ev.payload);
    if (!side) continue;

    currentGame[side] += 1;

    const gw = gameWinner(currentGame, pointsTo, winBy);
    if (gw) {
      gamesWon[gw] += 1;
      completedGames.push(currentGame);
      currentGame = { a: 0, b: 0 };
      if (gamesWon[gw] >= gamesNeeded) matchWinner = gw;
    }
  }

  const isComplete = matchWinner !== null;

  const detail: PickleballDetail = {
    sport: "pickleball",
    gamesWon: { ...gamesWon },
    completedGames,
    currentGame: { ...currentGame },
    gamesNeeded,
    pointsTo,
    winBy,
  };

  const gameStrings = completedGames.map((g) => `${g.a}-${g.b}`);
  if (!isComplete && (currentGame.a > 0 || currentGame.b > 0)) {
    gameStrings.push(`${currentGame.a}-${currentGame.b}`);
  }
  const display =
    gameStrings.length > 0 ? gameStrings.join(", ") : "0-0";

  return {
    scoreSummary: { ...gamesWon },
    isComplete,
    winnerSide: matchWinner,
    display,
    detail,
  };
}

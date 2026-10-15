// Pure badminton scoring engine — rally scoring to points_to (win by win_by),
// cap at 30 (29-29 → next point wins). Best-of games match.
// Event vocabulary:
//   point   payload { side }
//   undo    reverts latest point

import type { BadmintonConfig } from "@/lib/sports/presets";
import {
  resolveUndos,
  sideFromPayload,
  type BadmintonDetail,
  type MatchState,
  type ScoringEvent,
  type Side,
} from "./types";

const UNDOABLE = new Set(["point"]);

function gameWinner(
  game: { a: number; b: number },
  pointsTo: number,
  winBy: number,
  cap: number,
): Side | null {
  if (game.a >= cap && game.a > game.b) return "a";
  if (game.b >= cap && game.b > game.a) return "b";
  if (game.a >= pointsTo && game.a - game.b >= winBy) return "a";
  if (game.b >= pointsTo && game.b - game.a >= winBy) return "b";
  return null;
}

export function computeBadmintonState(
  config: BadmintonConfig,
  events: ScoringEvent[],
): MatchState {
  const pointsTo = config.points_to;
  const winBy = config.win_by;
  const cap = config.cap;
  const gamesNeeded = Math.floor(config.best_of / 2) + 1;

  const effective = resolveUndos(events, UNDOABLE);

  const gamesWon = { a: 0, b: 0 };
  const completedGames: Array<{ a: number; b: number }> = [];
  let currentGame = { a: 0, b: 0 };
  let matchWinner: Side | null = null;
  let lastPointWinner: Side | null = null;

  for (const ev of effective) {
    if (ev.event_type === "point") {
      const side = sideFromPayload(ev.payload);
      if (!side) continue;
      lastPointWinner = side;
      if (matchWinner) continue;
      currentGame[side] += 1;
      const gw = gameWinner(currentGame, pointsTo, winBy, cap);
      if (gw) {
        gamesWon[gw] += 1;
        completedGames.push(currentGame);
        currentGame = { a: 0, b: 0 };
        if (gamesWon[gw] >= gamesNeeded) matchWinner = gw;
      }
    }
  }

  const isComplete = matchWinner !== null;
  const servingSide = lastPointWinner;

  const points: { a: number; b: number } = { a: 0, b: 0 };
  for (const g of completedGames) {
    points.a += g.a;
    points.b += g.b;
  }
  if (!isComplete) {
    points.a += currentGame.a;
    points.b += currentGame.b;
  }

  const detail: BadmintonDetail = {
    sport: "badminton",
    gamesWon: { ...gamesWon },
    completedGames,
    points,
    currentGame: { ...currentGame },
    gamesNeeded,
    pointsTo,
    winBy,
    cap,
    servingSide,
  };

  const gameStrings = completedGames.map((g) => `${g.a}-${g.b}`);
  if (!isComplete && (currentGame.a > 0 || currentGame.b > 0)) {
    gameStrings.push(`${currentGame.a}-${currentGame.b}`);
  }
  const display = gameStrings.length > 0 ? gameStrings.join(", ") : "0-0";

  return {
    scoreSummary: { ...gamesWon },
    isComplete,
    winnerSide: matchWinner,
    display,
    detail,
  };
}

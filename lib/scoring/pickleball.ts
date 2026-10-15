// Pure pickleball scoring engine — rally scoring to points_to (win by win_by),
// games to best_of. Event vocabulary:
//   point         payload { side }                       — awards a point; rally rule
//                                                          (winner serves next)
//   serve_change  payload { side }                       — explicit serve-side change
//                                                          (sideout rule); does NOT
//                                                          change the score, but
//                                                          overrides the rally-rule
//                                                          serving-side for any
//                                                          event that happens AFTER it
//   game_start    payload {} (optional bookkeeping)
//   undo          cancels the latest not-yet-undone point or serve_change
//
// Serving derivation (highest priority first):
//   1. Latest serve_change event wins
//   2. Else latest point's winner (rally rule)
//   3. Null before any serve-determining event
//
// Score cap: none. Official rule is "to N, win by 2, uncapped" — the
// decider can run 15-13. gameWinner() implements that exactly; do not add
// a ceiling without changing the rule.

import type { PickleballConfig } from "@/lib/sports/presets";
import {
  resolveUndos,
  sideFromPayload,
  type MatchState,
  type PickleballDetail,
  type ScoringEvent,
  type Side,
} from "./types";

const UNDOABLE = new Set(["point", "serve_change"]);

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
  // Two independent trackers so serve_change can override point-wins without
  // losing the latest-point-winner history (used by undo recovery / replay).
  let lastPointWinner: Side | null = null;
  let lastServeChange: Side | null = null;

  for (const ev of effective) {
    if (ev.event_type === "point") {
      const side = sideFromPayload(ev.payload);
      if (!side) continue;
      // Track lastPointWinner even after the match is locked so the cast
      // serving indicator stays stable on the final-point display.
      lastPointWinner = side;
      if (matchWinner) continue;
      currentGame[side] += 1;
      const gw = gameWinner(currentGame, pointsTo, winBy);
      if (gw) {
        gamesWon[gw] += 1;
        completedGames.push(currentGame);
        currentGame = { a: 0, b: 0 };
        if (gamesWon[gw] >= gamesNeeded) matchWinner = gw;
      }
    } else if (ev.event_type === "serve_change") {
      const side = sideFromPayload(ev.payload);
      if (!side) continue;
      // Track even after match locked so the indicator stays correct.
      lastServeChange = side;
    }
  }

  const isComplete = matchWinner !== null;

  // Priority: explicit serve_change wins; else last point winner.
  const servingSide = lastServeChange ?? lastPointWinner;

  // Cumulative rally-point total — sum of every completed game's score
  // plus the live game's current tally. Standings diff/PF/PA consume this
  // (rules doc §4-7), not the gamesWon count.
  const points: { a: number; b: number } = { a: 0, b: 0 };
  for (const g of completedGames) {
    points.a += g.a;
    points.b += g.b;
  }
  if (!isComplete) {
    points.a += currentGame.a;
    points.b += currentGame.b;
  }

  const detail: PickleballDetail = {
    sport: "pickleball",
    gamesWon: { ...gamesWon },
    completedGames,
    points,
    currentGame: { ...currentGame },
    gamesNeeded,
    pointsTo,
    winBy,
    servingSide,
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

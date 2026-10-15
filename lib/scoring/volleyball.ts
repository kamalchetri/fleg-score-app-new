// Volleyball rally scoring. Rules come only from an explicit config.
// This module does not invent NSPG set lengths, caps, or defaults.
// Event vocabulary:
//   point  payload { side }
//   undo   reverts the latest point

import { computeRallySet, parseRallySetConfig } from "./rally-set";
import type { MatchState, ScoringEvent, VolleyballConfig, VolleyballDetail } from "./types";

export function parseVolleyballConfig(input: unknown): VolleyballConfig | null {
  return parseRallySetConfig(input);
}

export function computeVolleyballState(config: VolleyballConfig, events: ScoringEvent[]): MatchState {
  const rally = computeRallySet(config, events);
  const detail: VolleyballDetail = { sport: "volleyball", ...rally.detail };
  return {
    scoreSummary: rally.scoreSummary,
    isComplete: rally.isComplete,
    winnerSide: rally.winnerSide,
    display: rally.display,
    detail,
  };
}

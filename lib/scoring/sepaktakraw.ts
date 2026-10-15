// Sepaktakraw rally scoring. Rules come only from an explicit config.
// This module does not invent NSPG set lengths, caps, or defaults, and it does not create squads.
// Event vocabulary:
//   point  payload { side }
//   undo   reverts the latest point

import { computeRallySet, parseRallySetConfig } from "./rally-set";
import type { MatchState, ScoringEvent, SepaktakrawConfig, SepaktakrawDetail } from "./types";

export function parseSepaktakrawConfig(input: unknown): SepaktakrawConfig | null {
  return parseRallySetConfig(input);
}

/** Both sides must already be squad entrants. Category names are not interpreted. */
export function sepaktakrawHasSquads(
  a: { id?: string | null } | null | undefined,
  b: { id?: string | null } | null | undefined,
): boolean {
  return Boolean(a?.id && b?.id);
}

export function computeSepaktakrawState(config: SepaktakrawConfig, events: ScoringEvent[]): MatchState {
  const rally = computeRallySet(config, events);
  const detail: SepaktakrawDetail = { sport: "sepaktakraw", ...rally.detail };
  return {
    scoreSummary: rally.scoreSummary,
    isComplete: rally.isComplete,
    winnerSide: rally.winnerSide,
    display: rally.display,
    detail,
  };
}

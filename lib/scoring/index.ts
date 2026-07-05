// SYNC: copied from Fleg-score web 2026-07-04 — keep in sync manually (no edits here)
// Entry point for the pure scoring engine.
// `matches.score` is only a snapshot — recompute from score_events (the
// source of truth) everywhere instead of trusting the snapshot blindly.

import {
  getSportPreset,
  type FutsalConfig,
  type PickleballConfig,
} from "@/lib/sports/presets";
import { computeFutsalState } from "./futsal";
import { computePickleballState } from "./pickleball";
import type { MatchState, ScoringEvent } from "./types";

export type { MatchState, ScoringEvent, Side } from "./types";
export type { FutsalDetail, PickleballDetail, FutsalCard } from "./types";

/**
 * Computes full match state from the event log.
 * `sportConfig` is the tournament's `sport_config` jsonb; falls back to the
 * sport preset defaults when a field is missing or the config is malformed.
 */
export function computeMatchState(
  sport: string,
  sportConfig: unknown,
  events: ScoringEvent[],
): MatchState {
  const preset = getSportPreset(sport);
  const cfg =
    sportConfig && typeof sportConfig === "object"
      ? (sportConfig as Record<string, unknown>)
      : {};

  if (sport === "pickleball") {
    const base = (preset?.config ?? {
      best_of: 3,
      points_to: 11,
      win_by: 2,
      scoring: "rally",
      timeouts_per_game: 2,
    }) as PickleballConfig;
    return computePickleballState({ ...base, ...cfg }, events);
  }

  // Default to futsal semantics for any team sport.
  const base = (preset?.config ?? {
    periods: 2,
    period_minutes: 20,
    points: { goal: 1 },
    cards: ["yellow", "red"],
    tiebreak: "penalties",
    table_points: { win: 3, draw: 1, loss: 0 },
  }) as FutsalConfig;
  return computeFutsalState({ ...base, ...cfg }, events);
}

/** Alias emphasizing the "never trust the snapshot" rule from the WP spec. */
export const recomputeScore = computeMatchState;

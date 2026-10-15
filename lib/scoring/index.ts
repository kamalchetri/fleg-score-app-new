import {
  getSportPreset,
  type BadmintonConfig,
  type BasketballConfig,
  type DartsConfig,
  type FutsalConfig,
  type PickleballConfig,
} from "@/lib/sports/presets";
import { computeBadmintonState } from "./badminton";
import { computeBasketballState } from "./basketball";
import { computeDartsState } from "./darts";
import { computeFutsalState } from "./futsal";
import { computePickleballState } from "./pickleball";
import { computeLawnTennisState, parseLawnTennisConfig } from "./lawn-tennis";
import { computeTableTennisState, parseTableTennisConfig } from "./table-tennis";
import { computeArcheryState, parseArcheryConfig } from "./archery";
import { computeSepaktakrawState, parseSepaktakrawConfig } from "./sepaktakraw";
import { computeVolleyballState, parseVolleyballConfig } from "./volleyball";
import { canonicalNspgSlug } from "@/lib/sports/nspg";
import type { MatchState, ScoringEvent } from "./types";
import {
  resolveMatchFormat,
  type SportConfigForFormat,
  type StageType,
} from "./format";

export type { MatchState, ScoringEvent, Side } from "./types";
export type {
  FutsalDetail,
  PickleballDetail,
  BasketballDetail,
  BadmintonDetail,
  DartsDetail,
  CombatDetail,
  BoutResult,
  BoutMethod,
  TableTennisDetail,
  TableTennisConfig,
  LawnTennisDetail,
  LawnTennisConfig,
  LawnTennisSetScore,
  LawnTennisTiebreakConfig,
  LawnTennisPhase,
  VolleyballDetail,
  VolleyballConfig,
  SepaktakrawDetail,
  SepaktakrawConfig,
  ArcheryDetail,
  ArcheryConfig,
  ArcherySetPointsConfig,
  ArcheryCumulativeConfig,
  ArcheryShootOffConfig,
  ArcheryShootOffResult,
  RallySetConfig,
  RallySetScoreboard,
  DartsVisit,
  FutsalCard,
} from "./types";
export { resolveMatchFormat, resolveStageContext, DEFAULT_STAGE_TYPE } from "./format";
export { computeCombatState, parseBoutResult, formatCombatDisplay, boutMethodLabel, combatHasPoints } from "./combat";
export { computeTableTennisState, parseTableTennisConfig } from "./table-tennis";
export {
  computeLawnTennisState,
  parseLawnTennisConfig,
  formatLawnTennisSet,
  lawnTennisPointLine,
} from "./lawn-tennis";
export { computeVolleyballState, parseVolleyballConfig } from "./volleyball";
export { computeSepaktakrawState, parseSepaktakrawConfig, sepaktakrawHasSquads } from "./sepaktakraw";
export {
  computeArcheryState,
  parseArcheryConfig,
  parseArcheryScoreInput,
  archeryEndAward,
  archeryEndCap,
  archeryShootOffCap,
} from "./archery";
export { BOUT_RESULT_METHODS, BOUT_NOTE_MAX, ARCHERY_NOTE_MAX } from "./types";

function sportKey(sport: string): string {
  return sport.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function sportSlug(sport: string): string {
  return canonicalNspgSlug(sport) ?? sportKey(sport);
}

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

  if (sport === "badminton") {
    const base = (preset?.config ?? {
      best_of: 3,
      points_to: 21,
      win_by: 2,
      cap: 30,
    }) as BadmintonConfig;
    return computeBadmintonState({ ...base, ...cfg }, events);
  }

  if (sport === "basketball") {
    const base = (preset?.config ?? {
      periods: 4,
      period_minutes: 10,
      points: { field_goal: 2, three_pointer: 3, free_throw: 1 },
      overtime_minutes: 5,
      timeouts_per_team: 5,
    }) as BasketballConfig;
    return computeBasketballState({ ...base, ...cfg }, events);
  }

  if (sport === "darts") {
    const base = (preset?.config ?? {
      start_score: 501,
      double_out: true,
      double_in: false,
      play_format: "legs",
      legs_to_win: 3,
      sets_to_win: 3,
    }) as DartsConfig;
    return computeDartsState({ ...base, ...cfg }, events);
  }

  if (sportKey(sport) === "table_tennis") {
    const parsed = parseTableTennisConfig(sportConfig);
    if (!parsed) throw new Error("Rules not configured");
    return computeTableTennisState(parsed, events);
  }

  if (sportKey(sport) === "lawn_tennis") {
    const parsed = parseLawnTennisConfig(sportConfig);
    if (!parsed) throw new Error("Rules not configured");
    return computeLawnTennisState(parsed, events);
  }

  if (sportSlug(sport) === "volleyball") {
    const parsed = parseVolleyballConfig(sportConfig);
    if (!parsed) throw new Error("Rules not configured");
    return computeVolleyballState(parsed, events);
  }

  if (sportSlug(sport) === "sepaktakraw") {
    const parsed = parseSepaktakrawConfig(sportConfig);
    if (!parsed) throw new Error("Rules not configured");
    return computeSepaktakrawState(parsed, events);
  }

  if (sportSlug(sport) === "archery") {
    const parsed = parseArcheryConfig(sportConfig);
    if (!parsed) throw new Error("Rules not configured");
    return computeArcheryState(parsed, events);
  }

  // Default to futsal semantics for any team sport (football/futsal).
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

/**
 * Stage-aware version of computeMatchState — resolves the per-game format
 * (group / final / semi / quarter / fallback) using the tournament's
 * `round_formats` overrides, then dispatches to the engine with the
 * resolved best_of / points_to / win_by values. All match-control,
 * cast, live, and share-card call sites SHOULD use this instead of the
 * raw computeMatchState, so a tournament that ships per-round
 * formats (per the rules doc) automatically picks the right one.
 */
export function computeMatchStateForStage(
  sport: string,
  sportConfig: unknown,
  events: ScoringEvent[],
  opts: {
    stageType: StageType;
    round?: number;
    maxRound?: number;
    /** Per-match manual format override (wins over round defaults). */
    override?: Partial<{
      best_of: number;
      points_to: number;
      win_by: number;
      legs_to_win: number;
    }> | null;
  },
): MatchState {
  if (
    sportKey(sport) === "table_tennis" ||
    sportKey(sport) === "lawn_tennis" ||
    sportSlug(sport) === "volleyball" ||
    sportSlug(sport) === "sepaktakraw" ||
    sportSlug(sport) === "archery"
  ) {
    return computeMatchState(sport, sportConfig, events);
  }
  const fmt = resolveMatchFormat({
    sportConfig: (sportConfig as SportConfigForFormat) ?? null,
    stageType: opts.stageType,
    round: opts.round ?? 1,
    maxRound: opts.maxRound,
    override: opts.override,
    sport,
  });
  const cfg =
    sportConfig && typeof sportConfig === "object"
      ? { ...(sportConfig as Record<string, unknown>), ...fmt }
      : { ...fmt };
  return computeMatchState(sport, cfg, events);
}

/** Alias emphasizing the "never trust the snapshot" rule from the WP spec. */
export const recomputeScore = computeMatchState;

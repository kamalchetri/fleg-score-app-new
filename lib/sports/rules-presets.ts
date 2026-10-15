// Standard federation defaults for match control. Each preset is pending TC review.
// The rules objects use the engine field names already defined in lib/scoring.
// A preset is applied only when the stored config has none of those fields.
// A partial or invalid rules object is left unchanged so scoring stays fail-closed.

import type { BadmintonConfig, BasketballConfig } from "@/lib/sports/presets";
import type { ArcheryConfig, LawnTennisConfig, RallySetConfig, TableTennisConfig } from "@/lib/scoring/types";
import { isArcheryHeadToHeadCategory, resolveCategoryMatchEngine } from "@/lib/sports/nspg";

export const STANDARD_RULES_NOTE = "Standard rules — pending TC review";

export interface StandardRulesPreset<T> {
  id: string;
  tcReview: "pending";
  keys: readonly string[];
  rules: T;
}

const RALLY_KEYS = [
  "best_of_sets",
  "regular_set_points_to",
  "deciding_set_points_to",
  "win_by",
  "regular_set_cap",
  "deciding_set_cap",
] as const;

const ARCHERY_KEYS = [
  "format",
  "regulation_ends",
  "arrows_per_end",
  "max_arrow_score",
  "shoot_off",
  "end_win_points",
  "end_tie_points",
  "set_points_to_win",
] as const;

export const BADMINTON_PRESET: StandardRulesPreset<BadmintonConfig> = {
  id: "badminton",
  tcReview: "pending",
  keys: ["best_of", "points_to", "win_by", "cap"],
  rules: { best_of: 3, points_to: 21, win_by: 2, cap: 30 },
};

export const BASKETBALL_PRESET: StandardRulesPreset<BasketballConfig> = {
  id: "basketball",
  tcReview: "pending",
  keys: ["periods", "period_minutes", "points", "overtime_minutes", "timeouts_per_team"],
  rules: {
    periods: 4,
    period_minutes: 10,
    points: { field_goal: 2, three_pointer: 3, free_throw: 1 },
    overtime_minutes: 5,
    timeouts_per_team: 5,
  },
};

export const TABLE_TENNIS_SINGLES_PRESET: StandardRulesPreset<TableTennisConfig> = {
  id: "table_tennis_singles",
  tcReview: "pending",
  keys: ["best_of", "points_to", "win_by", "cap"],
  rules: { best_of: 5, points_to: 11, win_by: 2, cap: null },
};

export const VOLLEYBALL_PRESET: StandardRulesPreset<RallySetConfig> = {
  id: "volleyball",
  tcReview: "pending",
  keys: RALLY_KEYS,
  rules: {
    best_of_sets: 5,
    regular_set_points_to: 25,
    deciding_set_points_to: 15,
    win_by: 2,
    regular_set_cap: null,
    deciding_set_cap: null,
  },
};

/**
 * `win_by` is required by RallySetConfig. The work order gives the targets
 * and caps, not the margin. 2 is the margin those caps already use in the engine.
 */
export const SEPAKTAKRAW_REGU_PRESET: StandardRulesPreset<RallySetConfig> = {
  id: "sepaktakraw_regu",
  tcReview: "pending",
  keys: RALLY_KEYS,
  rules: {
    best_of_sets: 3,
    regular_set_points_to: 21,
    deciding_set_points_to: 15,
    win_by: 2,
    regular_set_cap: 25,
    deciding_set_cap: 17,
  },
};

/**
 * `max_arrow_score` is required by ArcheryConfig and is not named in the work order.
 * 10 is the target-face maximum the engine already scores. A lost end scores 0
 * inside the engine; there is no loss-points field. Closest-to-centre is not a
 * stored rule: the shoot-off winner is an explicit side.
 */
export const ARCHERY_RECURVE_PRESET: StandardRulesPreset<ArcheryConfig> = {
  id: "archery_recurve",
  tcReview: "pending",
  keys: ARCHERY_KEYS,
  rules: {
    format: "set_points",
    regulation_ends: 5,
    arrows_per_end: 3,
    max_arrow_score: 10,
    end_win_points: 2,
    end_tie_points: 1,
    set_points_to_win: 6,
    shoot_off: { arrows: 1 },
  },
};

export const ARCHERY_COMPOUND_PRESET: StandardRulesPreset<ArcheryConfig> = {
  id: "archery_compound",
  tcReview: "pending",
  keys: ARCHERY_KEYS,
  rules: {
    format: "cumulative",
    regulation_ends: 5,
    arrows_per_end: 3,
    max_arrow_score: 10,
    shoot_off: { arrows: 1 },
  },
};

/**
 * Combat has no rules object. Bout methods are decision, stoppage, walkover,
 * disqualification, and other. The work order's points / RSC / WO / DSQ labels
 * and a 3-round count are not engine fields, so they are not stored here.
 */
export const COMBAT_BOUT_PRESET = {
  id: "combat",
  tcReview: "pending" as const,
  rules: null,
};

/**
 * LawnTennisConfig starts a tiebreak only when both players reach trigger_games,
 * and trigger_games must be at least 1. A deciding-set match tiebreak to 10,
 * played instead of games, does not fit. A 6–6 set with a 10-point tiebreak
 * would be a full third set, which this preset was not approved to invent.
 */
export const LAWN_TENNIS_SINGLES_PRESET: StandardRulesPreset<LawnTennisConfig> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExplicitRules(sportConfig: unknown, keys: readonly string[]): boolean {
  if (!isRecord(sportConfig)) return false;
  return keys.some((key) => key in sportConfig);
}

function sameRules(sportConfig: unknown, rules: object): boolean {
  if (!isRecord(sportConfig)) return false;
  const expected = rules as Record<string, unknown>;
  const keys = Object.keys(expected);
  if (keys.some((key) => JSON.stringify(sportConfig[key]) !== JSON.stringify(expected[key]))) return false;
  return Object.keys(sportConfig).every((key) => keys.includes(key));
}

function isReguCategory(categoryName?: string | null): boolean {
  return /\bregu\b/i.test(categoryName ?? "");
}

function archeryPreset(categoryName?: string | null): StandardRulesPreset<ArcheryConfig> | null {
  if (!isArcheryHeadToHeadCategory(categoryName)) return null;
  const recurve = /\brecurve\b/i.test(categoryName ?? "");
  const compound = /\bcompound\b/i.test(categoryName ?? "");
  if (recurve === compound) return null;
  return recurve ? ARCHERY_RECURVE_PRESET : ARCHERY_COMPOUND_PRESET;
}

export function standardRulesPreset(
  sport: string,
  categoryName?: string | null,
): StandardRulesPreset<unknown> | null {
  const engine = resolveCategoryMatchEngine(sport, categoryName);
  if (engine === "badminton") return BADMINTON_PRESET;
  if (engine === "basketball") return BASKETBALL_PRESET;
  if (engine === "table_tennis") return TABLE_TENNIS_SINGLES_PRESET;
  if (engine === "volleyball") return VOLLEYBALL_PRESET;
  if (engine === "sepaktakraw" && isReguCategory(categoryName)) return SEPAKTAKRAW_REGU_PRESET;
  if (engine === "archery") return archeryPreset(categoryName);
  if (engine === "lawn_tennis") return LAWN_TENNIS_SINGLES_PRESET;
  return null;
}

/** Stored config when it names rules fields; otherwise the matching preset. */
export function effectiveSportConfig(
  sport: string,
  categoryName: string | null | undefined,
  sportConfig: unknown,
): unknown {
  const preset = standardRulesPreset(sport, categoryName);
  if (!preset) return sportConfig;
  if (hasExplicitRules(sportConfig, preset.keys)) return sportConfig;
  if (!isRecord(preset.rules)) return sportConfig;
  if (!isRecord(sportConfig)) return preset.rules;
  return { ...sportConfig, ...preset.rules };
}

export function standardRulesNote(
  sport: string,
  categoryName: string | null | undefined,
  sportConfig: unknown,
): string | null {
  if (resolveCategoryMatchEngine(sport, categoryName) === "combat") return STANDARD_RULES_NOTE;
  const preset = standardRulesPreset(sport, categoryName);
  if (!preset) return null;
  if (!hasExplicitRules(sportConfig, preset.keys)) return STANDARD_RULES_NOTE;
  return sameRules(sportConfig, preset.rules as object) ? STANDARD_RULES_NOTE : null;
}

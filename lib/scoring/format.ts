// ─────────────────────────────────────────────────────────────────────────────
//  Pure per-match format resolver (SYNC scoring lib).
//
//  Resolves the effective per-game match format for a single match
//  using a 3-step priority:
//
//   1. sport_config.round_formats overrides  (group / final / semi / quarter)
//   2. Stage-aware defaults: league/groups → group, knockout final → final,
//      knockout semi → semi, knockout earlier (R32, R16, QF, …) → quarter
//   3. sport_config fallback: best_of / points_to / win_by at the top level
//      (preserves backward-compat with tournaments that don't yet ship
//       a round_formats map).
//
//  For the committee's Nagaland Masters rules:
//   - RR / group:   best_of=1, points_to=15, win_by=2  (one game to 15)
//   - QF:           best_of=3, points_to=11, win_by=2  (best of 3 to 11)
//   - SF / Final:   best_of=3, points_to=11, win_by=2  (best of 3 to 11)
//
//  Those values live in sport_config.round_formats; the resolver picks
//  them by stage. Without overrides the FALLBACK below is Bo3 to 11.

// NOTE: the DB stores the round-robin stage as `group` (singular) — see the
// stages.stage_type CHECK constraint (migration 007) and every generator/
// consumer in the app. `groups` (plural) is accepted only as a legacy alias.
export type StageType = "league" | "group" | "groups" | "knockout";

export interface FormatConfig {
  best_of: number;
  points_to: number;
  win_by: number;
  /** Optional darts-specific match length (first-to-N legs). */
  legs_to_win?: number;
}

export interface SportConfigForFormat {
  /** Top-level defaults — used when no round_formats override matches. */
  best_of?: number;
  points_to?: number;
  win_by?: number;
  legs_to_win?: number;
  /**
   * Per-round format overrides. For knockout, the resolver picks the
   * entry whose key matches the resolved round class (final / semi /
   * quarter). For league/groups, the `group` entry is used.
   */
  round_formats?: {
    group?: FormatConfig;
    final?: FormatConfig;
    semi?: FormatConfig;
    quarter?: FormatConfig;
  };
}

export interface ResolveMatchFormatInput {
  sportConfig: SportConfigForFormat | null | undefined;
  stageType: StageType;
  /** 1-based round number (for knockout). Ignored for league/groups. */
  round: number;
  /** Last round of the stage. Defaults to round if absent. */
  maxRound?: number;
  /**
   * Per-match manual override (set by an organizer/referee). When present and
   * valid it WINS over the tournament's per-round defaults — this is how a
   * single match gets played to a different best_of / points_to than its
   * round would otherwise dictate. Partial overrides fill missing fields from
   * the resolved round default.
   */
  override?: Partial<FormatConfig> | null;
  /** When set, badminton uses badminton-specific defaults instead of pickleball. */
  sport?: string;
}

const FALLBACK: FormatConfig = { best_of: 3, points_to: 11, win_by: 2 };
const BADMINTON_FALLBACK: FormatConfig = { best_of: 3, points_to: 21, win_by: 2 };

/** True when a per-match override actually specifies at least one field. */
export function hasFormatOverride(
  o: Partial<FormatConfig> | null | undefined,
): o is Partial<FormatConfig> {
  return Boolean(
    o &&
      (typeof o.best_of === "number" ||
        typeof o.points_to === "number" ||
        typeof o.win_by === "number" ||
        typeof o.legs_to_win === "number"),
  );
}

/**
 * Resolve the per-game format for one match. Pure — no I/O.
 */
export function resolveMatchFormat(
  input: ResolveMatchFormatInput,
): FormatConfig {
  const { sportConfig, stageType, round, maxRound, override, sport } = input;
  const fallbackDefault =
    sport === "badminton" ? BADMINTON_FALLBACK : FALLBACK;
  const overrides = sportConfig?.round_formats;

  // A per-match override takes top priority. Any field it omits falls back to
  // the round-resolved default (computed below by re-running without override).
  if (hasFormatOverride(override)) {
    const base = resolveMatchFormat({ sportConfig, stageType, round, maxRound, sport });
    return normalize({
      best_of: override.best_of ?? base.best_of,
      points_to: override.points_to ?? base.points_to,
      win_by: override.win_by ?? base.win_by,
      legs_to_win: override.legs_to_win ?? base.legs_to_win,
    });
  }

  // League / group stage — one game to the target.
  if (stageType === "league" || stageType === "group" || stageType === "groups") {
    if (overrides?.group) return normalize(overrides.group);
    return tournamentFallback(sportConfig, fallbackDefault);
  }

  // Knockout — decide based on round vs maxRound.
  const last = maxRound ?? round;
  if (round === last) {
    if (overrides?.final) return normalize(overrides.final);
    return tournamentFallback(sportConfig, fallbackDefault);
  }
  if (last - round === 1) {
    if (overrides?.semi) return normalize(overrides.semi);
    return tournamentFallback(sportConfig, fallbackDefault);
  }
  if (overrides?.quarter) return normalize(overrides.quarter);
  return tournamentFallback(sportConfig, fallbackDefault);
}

function tournamentFallback(
  cfg: SportConfigForFormat | null | undefined,
  fallback: FormatConfig,
): FormatConfig {
  if (!cfg) return fallback;
  return normalize({
    best_of: cfg.best_of ?? fallback.best_of,
    points_to: cfg.points_to ?? fallback.points_to,
    win_by: cfg.win_by ?? fallback.win_by,
    legs_to_win: cfg.legs_to_win ?? fallback.legs_to_win,
  });
}

function normalize(f: FormatConfig): FormatConfig {
  const out: FormatConfig = {
    best_of: Math.max(1, Math.floor(f.best_of)),
    points_to: Math.max(1, Math.floor(f.points_to)),
    win_by: Math.max(1, Math.floor(f.win_by)),
  };
  if (typeof f.legs_to_win === "number" && Number.isFinite(f.legs_to_win)) {
    out.legs_to_win = Math.max(1, Math.floor(f.legs_to_win));
  }
  return out;
}

/**
 * Shared stage context for every client-side score recompute. The default is
 * deliberately knockout/final, matching the production web scorer.
 */
export const DEFAULT_STAGE_TYPE: StageType = "knockout";

export type StageContext = {
  stageType: StageType;
  round: number;
  maxRound: number;
};

export function resolveStageContext(input: {
  stageType?: string | null;
  stageConfig?: { rounds?: number } | null;
  matchRound?: number | null;
} = {}): StageContext {
  const round = Math.max(1, Math.floor(Number(input.matchRound) || 1));
  const raw = String(input.stageType ?? DEFAULT_STAGE_TYPE).toLowerCase();
  const stageType: StageType =
    raw === "league" || raw === "group" || raw === "groups" || raw === "knockout"
      ? (raw as StageType)
      : DEFAULT_STAGE_TYPE;
  const configuredRounds = input.stageConfig?.rounds;
  const maxRound =
    typeof configuredRounds === "number" &&
    Number.isFinite(configuredRounds) &&
    configuredRounds >= 1
      ? Math.floor(configuredRounds)
      : round;
  return { stageType, round, maxRound };
}

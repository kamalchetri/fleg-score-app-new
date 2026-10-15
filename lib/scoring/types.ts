// Shared types for the pure scoring engine. No I/O in this module tree.

export type Side = "a" | "b";

/** Minimal shape of a score_events row the engine needs. */
export interface ScoringEvent {
  id: number;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface MatchState {
  /** Headline score: futsal goals, pickleball games won. */
  scoreSummary: { a: number; b: number };
  isComplete: boolean;
  winnerSide: Side | null;
  /** Human-readable score, e.g. "2 – 1" or "11-7, 8-11, 11-9". */
  display: string;
  /** Sport-specific detail for the control/scoreboard UIs. */
  detail:
    | FutsalDetail
    | PickleballDetail
    | BasketballDetail
    | BadmintonDetail
    | DartsDetail
    | CombatDetail
    | TableTennisDetail
    | LawnTennisDetail
    | VolleyballDetail
    | SepaktakrawDetail
    | ArcheryDetail;
}

export interface FutsalCard {
  side: Side;
  cardType: "yellow" | "red";
  player: string | null;
  minute: string | null;
  clock: string | null;
  /** True when this player already had a yellow in this match (advisory). */
  secondYellow?: boolean;
}

export interface FutsalGoalEvent {
  side: Side;
  player: string | null;
  assist: string | null;
  minute: string | null;
  clock: string | null;
}

export interface FutsalFoulEvent {
  side: Side;
  player: string | null;
  minute: string | null;
  clock: string | null;
}

export interface FutsalSubstitutionEvent {
  side: Side;
  playerOff: string | null;
  playerOn: string | null;
  minute: string | null;
  clock: string | null;
}

export interface FutsalDetail {
  sport: "futsal";
  goals: { a: number; b: number };
  /**
   * Cumulative rally-point total across the whole match (regulation +
   * shootout if applicable). Standings diff/scoreFor/scoreAgainst consume
   * this number, not the goals count.
   */
  points: { a: number; b: number };
  /** Shootout goals — only populated when play goes past regulation. */
  shootout: { a: number; b: number } | null;
  cards: FutsalCard[];
  /** Ordered goal events (after undo resolution) for timeline UI. */
  goalEvents: FutsalGoalEvent[];
  /** Ordered card events (after undo resolution) for timeline UI. */
  cardEvents: FutsalCard[];
  /** Running foul tally per side (does not affect score). */
  fouls: { a: number; b: number };
  /** Ordered foul events for timeline UI. */
  foulEvents: FutsalFoulEvent[];
  /** Ordered substitution events for timeline UI. */
  substitutionEvents: FutsalSubstitutionEvent[];
  shots: { a: number; b: number };
  shotsOnTarget: { a: number; b: number };
  /** Closed possession time per side (ms), excluding any open segment. */
  possessionMs: { a: number; b: number };
  /** Side currently holding the ball (open segment), or null between switches / stoppages. */
  possessionSide: Side | null;
  /** Start timestamp (ms) of the open possession segment. */
  possessionSinceMs: number | null;
  /** Integer % split from closed possessionMs only; null when no time recorded. */
  possession: { a: number; b: number } | null;
  /** 1-based period currently in play, or null if between periods / not started. */
  currentPeriod: number | null;
  /** ISO timestamp of the current period's start (drives the timer), null when no period live. */
  periodStartedAt: string | null;
  periodsCompleted: number;
  /** Regulation periods from sport config. */
  regulationPeriods: number;
  inShootout: boolean;
}

export interface PickleballDetail {
  sport: "pickleball";
  gamesWon: { a: number; b: number };
  /** Completed game scores in order, e.g. [{a:11,b:7},{a:8,b:11}]. */
  completedGames: Array<{ a: number; b: number }>;
  /**
   * Cumulative rally-point total across all completed games plus the
   * live game's current score. Standings consume this for diff / total
   * points / conceded — NOT the gamesWon count.
   */
  points: { a: number; b: number };
  /** Points in the game currently in progress. */
  currentGame: { a: number; b: number };
  gamesNeeded: number;
  pointsTo: number;
  winBy: number;
  /**
   * Side that serves next. Derived as:
   *   1. Latest `serve_change` event (only meaningful when scoring="sideout")
   *   2. Latest `point` event's winner (rally-scoring rule)
   *   3. null before any serve-determining event
   * For an already-completed match this still reflects the last server of the
   * final point so the cast keeps the indicator stable.
   */
  servingSide: Side | null;
}

export interface BasketballPointEvent {
  side: Side;
  points: 1 | 2 | 3;
  player: string | null;
  period: number | null;
}

export interface BasketballDetail {
  sport: "basketball";
  totals: { a: number; b: number };
  /** Per-period line scores (regulation + OT). */
  lineScores: Array<{ a: number; b: number }>;
  /** In-progress quarter tally (while period is live). */
  currentQuarter: { a: number; b: number };
  fouls: { a: number; b: number };
  timeouts: { a: number; b: number };
  pointEvents: BasketballPointEvent[];
  currentPeriod: number | null;
  periodStartedAt: string | null;
  periodsCompleted: number;
  regulationPeriods: number;
}

export interface BadmintonDetail {
  sport: "badminton";
  gamesWon: { a: number; b: number };
  completedGames: Array<{ a: number; b: number }>;
  points: { a: number; b: number };
  currentGame: { a: number; b: number };
  gamesNeeded: number;
  pointsTo: number;
  winBy: number;
  cap: number;
  servingSide: Side | null;
}

/** Explicit table-tennis rules. `cap` null means the game is uncapped. */
export interface TableTennisConfig {
  best_of: number;
  points_to: number;
  win_by: number;
  cap: number | null;
}

export interface TableTennisDetail {
  sport: "table_tennis";
  gamesWon: { a: number; b: number };
  completedGames: Array<{ a: number; b: number }>;
  currentGame: { a: number; b: number };
  gamesNeeded: number;
  pointsTo: number;
  winBy: number;
  cap: number | null;
}

/** Tiebreak block required on both regular sets and the deciding set. */
export interface LawnTennisTiebreakConfig {
  enabled: boolean;
  trigger_games: number;
  points_to: number;
  win_by: number;
}

/**
 * Explicit lawn-tennis rules. This is not an NSPG preset.
 * Regular and deciding tiebreaks are stored separately and are never copied from each other.
 */
export interface LawnTennisConfig {
  best_of_sets: number;
  games_to_win_set: number;
  set_win_by_games: number;
  regular_set_tiebreak: LawnTennisTiebreakConfig;
  deciding_set_tiebreak: LawnTennisTiebreakConfig;
}

export interface LawnTennisSetScore {
  a: number;
  b: number;
  tiebreak: { a: number; b: number } | null;
}

export type LawnTennisPhase = "game" | "deuce" | "advantage" | "tiebreak";

export interface LawnTennisDetail {
  sport: "lawn_tennis";
  setsWon: { a: number; b: number };
  completedSets: LawnTennisSetScore[];
  games: { a: number; b: number };
  points: { a: number; b: number };
  pointLabels: { a: string; b: string };
  phase: LawnTennisPhase;
  advantageSide: Side | null;
  inTiebreak: boolean;
  decidingSet: boolean;
  setsNeeded: number;
}

/**
 * Shared rally-and-set rules. Caps are optional.
 * A missing cap means the set has no point ceiling. This is not an NSPG preset.
 */
export interface RallySetConfig {
  best_of_sets: number;
  regular_set_points_to: number;
  deciding_set_points_to: number;
  win_by: number;
  regular_set_cap: number | null;
  deciding_set_cap: number | null;
}

export interface RallySetScoreboard {
  setsWon: { a: number; b: number };
  completedSets: Array<{ a: number; b: number }>;
  currentSet: { a: number; b: number };
  decidingSet: boolean;
  setsNeeded: number;
  pointsTo: number;
  cap: number | null;
}

/** Explicit volleyball rules. Same shape as the shared rally-set config. */
export type VolleyballConfig = RallySetConfig;

export interface VolleyballDetail extends RallySetScoreboard {
  sport: "volleyball";
}

/** Explicit sepaktakraw rules. Same shape as the shared rally-set config. */
export type SepaktakrawConfig = RallySetConfig;

export interface SepaktakrawDetail extends RallySetScoreboard {
  sport: "sepaktakraw";
}

export interface DartsVisit {
  side: Side;
  score: number;
  darts: number;
  bust: boolean;
  checkout: boolean;
  remainingAfter: number;
}

export interface DartsDetail {
  sport: "darts";
  startScore: number;
  doubleOut: boolean;
  playFormat: "legs" | "sets";
  legsToWin: number;
  setsToWin: number | null;
  setsWon: { a: number; b: number };
  legsWon: { a: number; b: number };
  completedSets: Array<{ a: number; b: number }>;
  remaining: { a: number; b: number };
  legVisits: DartsVisit[];
  throwerSide: Side;
  stats: {
    oneEighties: { a: number; b: number };
    highCheckout: { a: number; b: number };
    bestLegDarts: { a: number; b: number };
    nineDartLegs: { a: number; b: number };
    threeDartAvg: { a: number; b: number };
  };
}

export function sideFromPayload(payload: Record<string, unknown>): Side | null {
  const side = payload["side"];
  return side === "a" || side === "b" ? side : null;
}

export const BOUT_RESULT_METHODS = [
  "decision",
  "stoppage",
  "walkover",
  "disqualification",
  "other",
] as const;

export type BoutMethod = (typeof BOUT_RESULT_METHODS)[number];

/** Parsed `bout_result` payload. Points are omitted as null, not inferred. */
export interface BoutResult {
  winnerSide: Side;
  pointsA: number | null;
  pointsB: number | null;
  method: BoutMethod;
  note: string | null;
}

export interface CombatDetail {
  sport: "combat";
  result: BoutResult | null;
}

/** Optional bout note. Longer text is rejected by the parser. */
export const BOUT_NOTE_MAX = 160;

/** Optional shoot-off note. Longer text is rejected by the parser. */
export const ARCHERY_NOTE_MAX = 160;

export interface ArcheryShootOffConfig {
  arrows: number;
}

interface ArcheryRulesBase {
  regulation_ends: number;
  arrows_per_end: number;
  max_arrow_score: number;
  shoot_off: ArcheryShootOffConfig;
}

export interface ArcherySetPointsConfig extends ArcheryRulesBase {
  format: "set_points";
  end_win_points: number;
  end_tie_points: number;
  set_points_to_win: number;
}

export interface ArcheryCumulativeConfig extends ArcheryRulesBase {
  format: "cumulative";
}

export type ArcheryConfig = ArcherySetPointsConfig | ArcheryCumulativeConfig;

export interface ArcheryShootOffResult {
  winnerSide: Side;
  scoreA: number | null;
  scoreB: number | null;
  note: string | null;
}

export interface ArcheryDetail {
  sport: "archery";
  format: "set_points" | "cumulative";
  regulationEnds: number;
  /** 1-based end being entered, or the last recorded end once entry has stopped. */
  endNumber: number;
  endsCompleted: number;
  latestEnd: { a: number; b: number } | null;
  completedEnds: Array<{ a: number; b: number }>;
  setPoints: { a: number; b: number } | null;
  totals: { a: number; b: number };
  shootOffRequired: boolean;
  shootOff: ArcheryShootOffResult | null;
  maxEndScore: number;
}

/**
 * Applies undo semantics: an `undo` event cancels the latest not-yet-undone
 * event whose type is in `undoableTypes`. Replays in id order and returns the
 * surviving (non-cancelled, non-undo) events, still in id order.
 */
export function resolveUndos(
  events: ScoringEvent[],
  undoableTypes: ReadonlySet<string>,
): ScoringEvent[] {
  const sorted = [...events].sort((x, y) => x.id - y.id);
  const cancelled = new Set<number>();
  const undoableStack: number[] = [];

  for (const ev of sorted) {
    if (ev.event_type === "undo") {
      const target = undoableStack.pop();
      if (target !== undefined) cancelled.add(target);
    } else if (undoableTypes.has(ev.event_type)) {
      undoableStack.push(ev.id);
    }
  }

  return sorted.filter(
    (ev) => ev.event_type !== "undo" && !cancelled.has(ev.id),
  );
}

const FUTSAL_UNDOABLE = new Set([
  "goal",
  "card",
  "foul",
  "substitution",
  "shot",
  "shot_on_target",
  "possession",
]);

/** Futsal replay: global undo + side-scoped goal removal. */
export function resolveFutsalEvents(events: ScoringEvent[]): ScoringEvent[] {
  const sorted = [...events].sort((x, y) => x.id - y.id);
  const cancelled = new Set<number>();
  const undoableStack: number[] = [];

  for (const ev of sorted) {
    if (ev.event_type === "undo") {
      const target = undoableStack.pop();
      if (target !== undefined) cancelled.add(target);
    } else if (ev.event_type === "undo_side_goal") {
      const side = sideFromPayload(ev.payload);
      if (side) {
        for (let i = sorted.length - 1; i >= 0; i -= 1) {
          const candidate = sorted[i]!;
          if (
            candidate.event_type === "goal" &&
            sideFromPayload(candidate.payload) === side &&
            !cancelled.has(candidate.id)
          ) {
            cancelled.add(candidate.id);
            break;
          }
        }
      }
    } else if (FUTSAL_UNDOABLE.has(ev.event_type)) {
      undoableStack.push(ev.id);
    }
  }

  return sorted.filter(
    (ev) =>
      ev.event_type !== "undo" &&
      ev.event_type !== "undo_side_goal" &&
      !cancelled.has(ev.id),
  );
}

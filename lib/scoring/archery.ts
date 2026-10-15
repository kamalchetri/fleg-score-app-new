// Head-to-head archery ends. Rules are explicit. This module does not supply a format.

import {
  ARCHERY_NOTE_MAX,
  resolveUndos,
  type ArcheryConfig,
  type ArcheryCumulativeConfig,
  type ArcheryDetail,
  type ArcherySetPointsConfig,
  type ArcheryShootOffResult,
  type MatchState,
  type ScoringEvent,
  type Side,
} from "./types";

const UNDOABLE = new Set(["end_result", "shoot_off"]);

function positiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0 || !Number.isSafeInteger(value)) {
    return null;
  }
  return value;
}

function nonNegativeInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || !Number.isSafeInteger(value)) {
    return null;
  }
  return value;
}

function boundedInt(value: unknown, max: number): number | null {
  const parsed = nonNegativeInt(value);
  if (parsed === null || parsed > max) return null;
  return parsed;
}

function optionalBounded(value: unknown, max: number): number | null | "invalid" {
  if (value === undefined || value === null) return null;
  const parsed = boundedInt(value, max);
  return parsed === null ? "invalid" : parsed;
}

/** Blank is empty. A finite non-negative integer within the cap is accepted. */
export function parseArcheryScoreInput(raw: string, max: number): number | "empty" | "invalid" {
  const trimmed = raw.trim();
  if (!trimmed) return "empty";
  if (!/^\d+$/.test(trimmed)) return "invalid";
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value > max) return "invalid";
  return value;
}

export function parseArcheryConfig(input: unknown): ArcheryConfig | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  const regulationEnds = positiveInt(row.regulation_ends);
  const arrowsPerEnd = positiveInt(row.arrows_per_end);
  const maxArrow = positiveInt(row.max_arrow_score);
  if (regulationEnds === null || arrowsPerEnd === null || maxArrow === null) return null;
  const maxEndScore = arrowsPerEnd * maxArrow;
  if (!Number.isSafeInteger(maxEndScore)) return null;
  const shootOff = row.shoot_off;
  if (!shootOff || typeof shootOff !== "object" || Array.isArray(shootOff)) return null;
  const arrows = positiveInt((shootOff as Record<string, unknown>).arrows);
  if (arrows === null) return null;
  const shootOffMax = arrows * maxArrow;
  if (!Number.isSafeInteger(shootOffMax)) return null;
  const base = {
    regulation_ends: regulationEnds,
    arrows_per_end: arrowsPerEnd,
    max_arrow_score: maxArrow,
    shoot_off: { arrows },
  };
  if (row.format === "cumulative") {
    if (row.end_win_points != null || row.end_tie_points != null || row.set_points_to_win != null) return null;
    return { format: "cumulative", ...base };
  }
  if (row.format !== "set_points") return null;
  const endWin = positiveInt(row.end_win_points);
  const endTie = nonNegativeInt(row.end_tie_points);
  const toWin = positiveInt(row.set_points_to_win);
  if (endWin === null || endTie === null || toWin === null) return null;
  return {
    format: "set_points",
    ...base,
    end_win_points: endWin,
    end_tie_points: endTie,
    set_points_to_win: toWin,
  };
}

export function archeryEndCap(config: ArcheryConfig): number {
  return config.arrows_per_end * config.max_arrow_score;
}

export function archeryShootOffCap(config: ArcheryConfig): number {
  return config.shoot_off.arrows * config.max_arrow_score;
}

export function archeryEndAward(
  config: ArcherySetPointsConfig,
  a: number,
  b: number,
): { a: number; b: number } {
  if (a > b) return { a: config.end_win_points, b: 0 };
  if (b > a) return { a: 0, b: config.end_win_points };
  return { a: config.end_tie_points, b: config.end_tie_points };
}

function parseEnd(payload: Record<string, unknown>, max: number): { a: number; b: number } | null {
  const a = boundedInt(payload.a, max);
  const b = boundedInt(payload.b, max);
  if (a === null || b === null) return null;
  return { a, b };
}

function parseShootOff(payload: Record<string, unknown>, max: number): ArcheryShootOffResult | null {
  const winnerSide = payload.winnerSide;
  if (winnerSide !== "a" && winnerSide !== "b") return null;
  const scoreA = optionalBounded(payload.scoreA, max);
  const scoreB = optionalBounded(payload.scoreB, max);
  if (scoreA === "invalid" || scoreB === "invalid") return null;
  let note: string | null = null;
  if (payload.note !== undefined && payload.note !== null) {
    if (typeof payload.note !== "string") return null;
    const trimmed = payload.note.trim();
    if (trimmed.length > ARCHERY_NOTE_MAX) return null;
    note = trimmed.length > 0 ? trimmed : null;
  }
  return { winnerSide, scoreA, scoreB, note };
}

function setPointsFrom(config: ArcherySetPointsConfig, ends: Array<{ a: number; b: number }>): { a: number; b: number } {
  return ends.reduce(
    (total, end) => {
      const award = archeryEndAward(config, end.a, end.b);
      return { a: total.a + award.a, b: total.b + award.b };
    },
    { a: 0, b: 0 },
  );
}

function totalsFrom(ends: Array<{ a: number; b: number }>): { a: number; b: number } {
  return ends.reduce((total, end) => ({ a: total.a + end.a, b: total.b + end.b }), { a: 0, b: 0 });
}

function leadingSide(score: { a: number; b: number }): Side | null {
  if (score.a === score.b) return null;
  return score.a > score.b ? "a" : "b";
}

interface Folded {
  ends: Array<{ a: number; b: number }>;
  shootOff: ArcheryShootOffResult | null;
  winnerSide: Side | null;
  isComplete: boolean;
  shootOffRequired: boolean;
  setPoints: { a: number; b: number } | null;
  totals: { a: number; b: number };
}

function fold(config: ArcheryConfig, events: ScoringEvent[]): Folded {
  const effective = resolveUndos(events, UNDOABLE);
  const maxEnd = archeryEndCap(config);
  const maxShootOff = archeryShootOffCap(config);
  const ends: Array<{ a: number; b: number }> = [];
  let shootOff: ArcheryShootOffResult | null = null;
  let winnerSide: Side | null = null;
  let isComplete = false;

  for (const event of effective) {
    if (isComplete) continue;
    if (event.event_type === "end_result") {
      if (ends.length >= config.regulation_ends) continue;
      const parsed = parseEnd(event.payload, maxEnd);
      if (!parsed) continue;
      ends.push(parsed);
      const totals = totalsFrom(ends);
      const setPoints = config.format === "set_points" ? setPointsFrom(config, ends) : null;
      const score = setPoints ?? totals;
      const leader = leadingSide(score);
      const thresholdReached =
        config.format === "set_points" &&
        leader !== null &&
        score[leader] >= config.set_points_to_win;
      if (thresholdReached && leader) {
        isComplete = true;
        winnerSide = leader;
      } else if (ends.length === config.regulation_ends) {
        if (leader) {
          isComplete = true;
          winnerSide = leader;
        }
      }
      continue;
    }
    if (event.event_type === "shoot_off") {
      if (ends.length !== config.regulation_ends) continue;
      const totals = totalsFrom(ends);
      const setPoints = config.format === "set_points" ? setPointsFrom(config, ends) : null;
      if (leadingSide(setPoints ?? totals) !== null) continue;
      const parsed = parseShootOff(event.payload, maxShootOff);
      if (!parsed) continue;
      shootOff = parsed;
      isComplete = true;
      winnerSide = parsed.winnerSide;
    }
  }

  const totals = totalsFrom(ends);
  const setPoints = config.format === "set_points" ? setPointsFrom(config, ends) : null;
  const shootOffRequired = !isComplete && ends.length === config.regulation_ends && leadingSide(setPoints ?? totals) === null;
  return { ends, shootOff, winnerSide, isComplete, shootOffRequired, setPoints, totals };
}

function scoreLine(config: ArcheryConfig, folded: Folded): string {
  const score =
    config.format === "set_points" && folded.setPoints
      ? `${folded.setPoints.a}–${folded.setPoints.b}`
      : `${folded.totals.a}–${folded.totals.b}`;
  const ends = folded.ends.map((end) => `${end.a}-${end.b}`).join(", ");
  const shoot = folded.shootOff || folded.shootOffRequired ? "shoot-off" : null;
  return [score, ends || null, shoot].filter(Boolean).join(" · ");
}

export function computeArcheryState(config: ArcheryConfig, events: ScoringEvent[]): MatchState {
  const folded = fold(config, events);
  const acceptingEnds = !folded.isComplete && !folded.shootOffRequired;
  const endNumber = acceptingEnds ? folded.ends.length + 1 : Math.max(folded.ends.length, 1);
  const detail: ArcheryDetail = {
    sport: "archery",
    format: config.format,
    regulationEnds: config.regulation_ends,
    endNumber,
    endsCompleted: folded.ends.length,
    latestEnd: folded.ends.length > 0 ? folded.ends[folded.ends.length - 1]! : null,
    completedEnds: folded.ends,
    setPoints: folded.setPoints,
    totals: folded.totals,
    shootOffRequired: folded.shootOffRequired,
    shootOff: folded.shootOff,
    maxEndScore: archeryEndCap(config),
  };
  const summary = config.format === "set_points" && folded.setPoints ? folded.setPoints : folded.totals;
  return {
    scoreSummary: summary,
    isComplete: folded.isComplete,
    winnerSide: folded.winnerSide,
    display: scoreLine(config, folded),
    detail,
  };
}

export function isArcherySetPoints(config: ArcheryConfig): config is ArcherySetPointsConfig {
  return config.format === "set_points";
}

export function isArcheryCumulative(config: ArcheryConfig): config is ArcheryCumulativeConfig {
  return config.format === "cumulative";
}

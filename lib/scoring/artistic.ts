import type { ArtisticConfig, ArtisticDetail, ArtisticResult, MatchState, ScoringEvent } from "./types";
import { resolveUndos } from "./types";

export function parseArtisticConfig(value: unknown): ArtisticConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const judges = raw.judges;
  const scoreMin = raw.score_min;
  const scoreMax = raw.score_max;
  const penaltyMax = raw.penalty_max;
  if (!Number.isInteger(judges) || (judges as number) < 1 || (judges as number) > 9) return null;
  if (![scoreMin, scoreMax, penaltyMax].every((item) => typeof item === "number" && Number.isFinite(item))) return null;
  if ((scoreMin as number) < 0 || (scoreMax as number) <= (scoreMin as number) || (penaltyMax as number) < 0) return null;
  return { judges: judges as number, score_min: scoreMin as number, score_max: scoreMax as number, penalty_max: penaltyMax as number };
}

export function parseArtisticResult(config: ArtisticConfig, payload: Record<string, unknown>): ArtisticResult | null {
  const scoresA = parseScores(payload.scoresA, config);
  const scoresB = parseScores(payload.scoresB, config);
  const winnerSide = payload.winnerSide === "a" || payload.winnerSide === "b" ? payload.winnerSide : null;
  const deductionA = parseDeduction(payload.deductionA, config.penalty_max);
  const deductionB = parseDeduction(payload.deductionB, config.penalty_max);
  if (!scoresA || !scoresB || winnerSide === null || deductionA === null || deductionB === null) return null;
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  if (note.length > 160) return null;
  return { scoresA, scoresB, deductionA, deductionB, winnerSide, note: note || null };
}

function parseScores(value: unknown, config: ArtisticConfig): number[] | null {
  if (!Array.isArray(value) || value.length !== config.judges) return null;
  if (value.some((item) => typeof item !== "number" || !Number.isFinite(item) || item < config.score_min || item > config.score_max)) return null;
  return value as number[];
}

function parseDeduction(value: unknown, cap: number): number | null {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > cap) return null;
  return value;
}

export function artisticTotal(scores: number[], deduction: number): number {
  return Math.max(0, scores.reduce((sum, score) => sum + score, 0) - deduction);
}

export function formatArtisticDisplay(result: ArtisticResult | null): string {
  if (!result) return "Awaiting judges";
  return `${formatNumber(artisticTotal(result.scoresA, result.deductionA))} – ${formatNumber(artisticTotal(result.scoresB, result.deductionB))}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function computeArtisticState(config: ArtisticConfig, events: ScoringEvent[]): MatchState {
  const surviving = resolveUndos(events, new Set(["artistic_result"]));
  let result: ArtisticResult | null = null;
  for (const event of surviving) {
    if (event.event_type !== "artistic_result") continue;
    const parsed = parseArtisticResult(config, event.payload);
    if (parsed) result = parsed;
  }
  const detail: ArtisticDetail = { sport: "artistic", result, judges: config.judges, scoreMin: config.score_min, scoreMax: config.score_max };
  const totalA = result ? artisticTotal(result.scoresA, result.deductionA) : 0;
  const totalB = result ? artisticTotal(result.scoresB, result.deductionB) : 0;
  return { scoreSummary: { a: totalA, b: totalB }, isComplete: result !== null, winnerSide: result?.winnerSide ?? null, display: formatArtisticDisplay(result), detail };
}

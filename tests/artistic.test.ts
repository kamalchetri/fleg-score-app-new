import { computeArtisticState, formatArtisticDisplay, parseArtisticConfig, parseArtisticResult } from "../lib/scoring/artistic";
import type { ScoringEvent } from "../lib/scoring/types";

const config = { judges: 3, score_min: 0, score_max: 10, penalty_max: 5 };
const event = (id: number, event_type: string, payload: Record<string, unknown>): ScoringEvent => ({ id, event_type, payload, created_at: "2026-01-01T00:00:00.000Z" });
const cases: Array<[string, () => void]> = [
  ["valid judged result completes with explicit winner", () => {
    const state = computeArtisticState(config, [event(1, "artistic_result", { scoresA: [8, 8.5, 9], scoresB: [7, 7.5, 8], winnerSide: "a", deductionA: 0, deductionB: 1 })]);
    if (!state.isComplete || state.winnerSide !== "a" || state.display !== "25.5 – 21.5") throw new Error(`unexpected ${state.display}`);
  }],
  ["invalid judge count and score values fail closed", () => {
    if (parseArtisticConfig({ judges: 0, score_min: 0, score_max: 10, penalty_max: 5 })) throw new Error("invalid config accepted");
    if (parseArtisticResult(config, { scoresA: [8], scoresB: [8, 8, 8], winnerSide: "a" })) throw new Error("short scores accepted");
  }],
  ["undo reopens the judged result", () => {
    const state = computeArtisticState(config, [event(1, "artistic_result", { scoresA: [8, 8, 8], scoresB: [7, 7, 7], winnerSide: "a" }), event(2, "undo", {})]);
    if (state.isComplete || state.winnerSide !== null || formatArtisticDisplay((state.detail as { sport: "artistic"; result: null }).result) !== "Awaiting judges") throw new Error("undo did not reopen result");
  }],
];
let failed = 0;
for (const [name, run] of cases) { try { run(); console.log(`  ✓  ${name}`); } catch (error) { failed++; console.error(`  ✗  ${name}: ${error instanceof Error ? error.message : String(error)}`); } }
console.log(`\n${cases.length} passed, ${failed} failed`);
if (failed) process.exit(1);

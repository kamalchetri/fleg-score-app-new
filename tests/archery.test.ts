/**
 * Archery head-to-head engine, configuration, and routing.
 * Run with: npx tsx tests/archery.test.ts
 */

import {
  computeArcheryState,
  computeMatchState,
  computeMatchStateForStage,
  parseArcheryConfig,
  parseArcheryScoreInput,
} from "../lib/scoring";
import type { ArcheryConfig, ArcheryDetail, ScoringEvent } from "../lib/scoring";
import {
  isArcheryHeadToHeadCategory,
  resolveCategoryMatchEngine,
  resolveCategorySupport,
  resolveMatchEngine,
  resolveNspgEngine,
} from "../lib/sports/nspg";

let passed = 0;
let failed = 0;
let seq = 1;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e: unknown) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }
}

function expectEq<T>(actual: T, expected: T, label = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label ? label + ": " : ""}expected ${e}, got ${a}`);
}

function end(a: number, b: number): ScoringEvent {
  return { id: seq++, event_type: "end_result", payload: { a, b }, created_at: "2026-01-01T00:00:00Z" };
}

function shoot(winnerSide: "a" | "b", extra: Record<string, unknown> = {}): ScoringEvent {
  return { id: seq++, event_type: "shoot_off", payload: { winnerSide, ...extra }, created_at: "2026-01-01T00:00:00Z" };
}

function undo(): ScoringEvent {
  return { id: seq++, event_type: "undo", payload: {}, created_at: "2026-01-01T00:00:00Z" };
}

const SETS: ArcheryConfig = {
  format: "set_points",
  regulation_ends: 4,
  arrows_per_end: 3,
  max_arrow_score: 10,
  end_win_points: 2,
  end_tie_points: 1,
  set_points_to_win: 6,
  shoot_off: { arrows: 1 },
};

const EARLY: ArcheryConfig = { ...SETS, set_points_to_win: 4 };

const TOTAL: ArcheryConfig = {
  format: "cumulative",
  regulation_ends: 3,
  arrows_per_end: 6,
  max_arrow_score: 10,
  shoot_off: { arrows: 1 },
};

function detail(config: ArcheryConfig, events: ScoringEvent[]): ArcheryDetail {
  const state = computeArcheryState(config, events);
  if (state.detail.sport !== "archery") throw new Error("expected archery detail");
  return state.detail;
}

test("rule validation fails closed", () => {
  expectEq(parseArcheryConfig(undefined), null);
  expectEq(parseArcheryConfig(null), null);
  expectEq(parseArcheryConfig({}), null);
  expectEq(parseArcheryConfig([]), null);
  expectEq(parseArcheryConfig({ ...SETS, format: "sets" }), null);
  expectEq(parseArcheryConfig({ ...SETS, regulation_ends: 0 }), null);
  expectEq(parseArcheryConfig({ ...SETS, arrows_per_end: 1.5 }), null);
  expectEq(parseArcheryConfig({ ...SETS, max_arrow_score: Number.NaN }), null);
  expectEq(parseArcheryConfig({ ...SETS, max_arrow_score: Infinity }), null);
  expectEq(parseArcheryConfig({ ...SETS, end_win_points: 0 }), null);
  expectEq(parseArcheryConfig({ ...SETS, end_tie_points: -1 }), null);
  expectEq(parseArcheryConfig({ ...SETS, set_points_to_win: 2.5 }), null);
  expectEq(parseArcheryConfig({ ...SETS, shoot_off: {} }), null);
  expectEq(parseArcheryConfig({ ...SETS, shoot_off: { arrows: 0 } }), null);
  expectEq(parseArcheryConfig({ ...TOTAL, end_win_points: 2 }), null);
  const missingTie = { ...SETS } as Record<string, unknown>;
  delete missingTie.end_tie_points;
  expectEq(parseArcheryConfig(missingTie), null);
  expectEq(parseArcheryConfig(SETS)?.format, "set_points");
  expectEq(parseArcheryConfig(TOTAL)?.format, "cumulative");
  expectEq(parseArcheryScoreInput("", 30), "empty");
  expectEq(parseArcheryScoreInput("30", 30), 30);
  expectEq(parseArcheryScoreInput("31", 30), "invalid");
  expectEq(parseArcheryScoreInput("1.5", 30), "invalid");
  expectEq(parseArcheryScoreInput("-1", 30), "invalid");

  let threw = false;
  try {
    computeMatchState("archery", {}, []);
  } catch (e: unknown) {
    threw = e instanceof Error && e.message === "Rules not configured";
  }
  if (!threw) throw new Error("missing archery rules did not fail closed");
  threw = false;
  try {
    computeMatchStateForStage("archery", { best_of: 5, points_to: 21 }, [], { stageType: "group" });
  } catch (e: unknown) {
    threw = e instanceof Error && e.message === "Rules not configured";
  }
  if (!threw) throw new Error("stage format filled in archery rules");
});

test("end totals outside the arrow cap are rejected", () => {
  const over = detail(SETS, [end(31, 20), end(27, 24)]);
  expectEq(over.completedEnds, [{ a: 27, b: 24 }]);
  expectEq(over.setPoints, { a: 2, b: 0 });
  const bad = detail(SETS, [{ ...end(27, 24), payload: { a: "27", b: 24 } }]);
  expectEq(bad.completedEnds, []);
});

test("set-point awards and early completion", () => {
  const live = detail(SETS, [end(27, 24), end(20, 20)]);
  expectEq(live.setPoints, { a: 3, b: 1 });
  expectEq(live.endNumber, 3);
  expectEq(live.latestEnd, { a: 20, b: 20 });
  const state = computeArcheryState(EARLY, [end(28, 20), end(27, 18), end(10, 10)]);
  expectEq(state.isComplete, true);
  expectEq(state.winnerSide, "a");
  expectEq((state.detail as ArcheryDetail).setPoints, { a: 4, b: 0 });
  expectEq((state.detail as ArcheryDetail).completedEnds.length, 2);
  expectEq((state.detail as ArcheryDetail).shootOffRequired, false);
});

test("cumulative totals wait for every regulation end", () => {
  const partial = computeArcheryState(TOTAL, [end(40, 10), end(40, 10)]);
  expectEq(partial.isComplete, false);
  expectEq(partial.winnerSide, null);
  expectEq((partial.detail as ArcheryDetail).totals, { a: 80, b: 20 });
  expectEq((partial.detail as ArcheryDetail).endNumber, 3);
  const done = computeArcheryState(TOTAL, [end(40, 10), end(40, 10), end(20, 30)]);
  expectEq(done.isComplete, true);
  expectEq(done.winnerSide, "a");
  expectEq(done.scoreSummary, { a: 100, b: 50 });
});

test("regulation ties require an explicit shoot-off winner", () => {
  const tiedEnds = [end(28, 20), end(18, 27), end(26, 24), end(22, 29)];
  const tied = computeArcheryState(SETS, tiedEnds);
  expectEq(tied.isComplete, false);
  expectEq((tied.detail as ArcheryDetail).setPoints, { a: 4, b: 4 });
  expectEq((tied.detail as ArcheryDetail).shootOffRequired, true);
  const cumulativeTie = computeArcheryState(TOTAL, [end(20, 20), end(20, 20), end(20, 20)]);
  expectEq((cumulativeTie.detail as ArcheryDetail).shootOffRequired, true);
  const equal = computeArcheryState(SETS, [
    ...tiedEnds,
    shoot("b", { scoreA: 10, scoreB: 0, note: "Closest to centre" }),
  ]);
  expectEq(equal.winnerSide, "b");
  expectEq(equal.scoreSummary, { a: 4, b: 4 });
  expectEq((equal.detail as ArcheryDetail).shootOff, {
    winnerSide: "b",
    scoreA: 10,
    scoreB: 0,
    note: "Closest to centre",
  });
  const blank = computeArcheryState(TOTAL, [end(20, 20), end(20, 20), end(20, 20), shoot("a")]);
  expectEq(blank.winnerSide, "a");
  expectEq((blank.detail as ArcheryDetail).shootOff?.scoreA, null);
  const tooHigh = computeArcheryState(SETS, [...tiedEnds, shoot("a", { scoreA: 11, scoreB: 9 })]);
  expectEq(tooHigh.isComplete, false);
  expectEq((tooHigh.detail as ArcheryDetail).shootOff, null);
});

test("undo crosses end, shoot-off, and completed-match boundaries", () => {
  const ends = [end(27, 24), end(20, 22)];
  expectEq(detail(SETS, [...ends, undo()]).completedEnds, [{ a: 27, b: 24 }]);

  const match = [end(28, 20), end(27, 18)];
  const reopened = computeArcheryState(EARLY, [...match, undo()]);
  expectEq(reopened.isComplete, false);
  expectEq((reopened.detail as ArcheryDetail).setPoints, { a: 2, b: 0 });

  const tied = [end(28, 20), end(18, 27), end(26, 24), end(22, 29), shoot("a", { scoreA: 9, scoreB: 9 })];
  const back = computeArcheryState(SETS, [...tied, undo()]);
  expectEq(back.isComplete, false);
  expectEq((back.detail as ArcheryDetail).shootOffRequired, true);
  expectEq((back.detail as ArcheryDetail).shootOff, null);
});

test("later events after completion are ignored", () => {
  const match = [end(28, 20), end(27, 18)];
  const done = computeArcheryState(EARLY, match);
  const extra = computeArcheryState(EARLY, [...match, end(10, 30), shoot("b", { scoreA: 1, scoreB: 1 })]);
  expectEq(extra.winnerSide, done.winnerSide);
  expectEq((extra.detail as ArcheryDetail).completedEnds, (done.detail as ArcheryDetail).completedEnds);
  expectEq((extra.detail as ArcheryDetail).shootOff, null);
});

test("olympic-round routing and fail-closed categories", () => {
  expectEq(isArcheryHeadToHeadCategory("Olympic Round"), true);
  expectEq(isArcheryHeadToHeadCategory("  olympic   round "), true);
  expectEq(isArcheryHeadToHeadCategory("olympic-round"), true);
  expectEq(isArcheryHeadToHeadCategory("OLYMPIC_ROUND"), true);
  expectEq(isArcheryHeadToHeadCategory("Recurve Olympic Round"), true);
  expectEq(isArcheryHeadToHeadCategory("Head-to-Head"), true);
  expectEq(isArcheryHeadToHeadCategory("head to head"), true);
  expectEq(isArcheryHeadToHeadCategory("Men's Head to Head"), true);
  expectEq(isArcheryHeadToHeadCategory("Ranking Round"), false);
  expectEq(isArcheryHeadToHeadCategory("Qualification"), false);
  expectEq(isArcheryHeadToHeadCategory("Qualifying Round"), false);
  expectEq(isArcheryHeadToHeadCategory("Team Olympic Round"), false);
  expectEq(isArcheryHeadToHeadCategory("Olympic Round Team"), false);
  expectEq(isArcheryHeadToHeadCategory("Head-to-Head Ranking"), false);
  expectEq(isArcheryHeadToHeadCategory("Compound"), false);
  expectEq(isArcheryHeadToHeadCategory(""), false);
  expectEq(isArcheryHeadToHeadCategory(null), false);

  expectEq(resolveCategoryMatchEngine("archery", "Olympic Round"), "archery");
  expectEq(resolveCategoryMatchEngine("Archery", "olympic-round"), "archery");
  expectEq(resolveCategoryMatchEngine("archery", "Head-to-Head"), "archery");
  expectEq(resolveCategoryMatchEngine("archery", "Ranking Round"), null);
  expectEq(resolveCategoryMatchEngine("archery", "Qualification"), null);
  expectEq(resolveCategoryMatchEngine("archery", "Team"), null);
  expectEq(resolveCategoryMatchEngine("archery", ""), null);
  expectEq(resolveCategoryMatchEngine("bow", "Olympic Round"), null);
  expectEq(resolveMatchEngine("archery"), null);
  expectEq(resolveNspgEngine("archery"), null);
  expectEq(resolveCategorySupport("archery", "Olympic Round", SETS), "supported");
  expectEq(resolveCategorySupport("archery", "Head-to-Head", {}), "structured");
  expectEq(resolveCategorySupport("archery", "Ranking Round", SETS), "unsupported");
  expectEq(resolveCategorySupport("archery", "Team Olympic Round", SETS), "unsupported");
  expectEq(resolveCategoryMatchEngine("volleyball", "Olympic Round"), "volleyball");
  expectEq(resolveCategoryMatchEngine("football", "Olympic Round"), "futsal");
  const football = computeMatchState("football", {}, []);
  expectEq(football.detail.sport, "futsal");
  const unknown = computeMatchState("bow", {}, []);
  expectEq(unknown.detail.sport, "futsal");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

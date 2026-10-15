/**
 * Volleyball engine, configuration, and sport routing.
 * Run with: npx tsx tests/volleyball.test.ts
 */

import {
  computeMatchState,
  computeMatchStateForStage,
  computeVolleyballState,
  parseVolleyballConfig,
} from "../lib/scoring";
import type { ScoringEvent, VolleyballConfig, VolleyballDetail } from "../lib/scoring";
import {
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

function point(side: "a" | "b"): ScoringEvent {
  return { id: seq++, event_type: "point", payload: { side }, created_at: "2026-01-01T00:00:00Z" };
}

function undo(): ScoringEvent {
  return { id: seq++, event_type: "undo", payload: {}, created_at: "2026-01-01T00:00:00Z" };
}

function rally(side: "a" | "b", count: number): ScoringEvent[] {
  return Array.from({ length: count }, () => point(side));
}

/** Stay within one point so a win-by-two set does not end early. */
function closeScore(aCount: number, bCount: number): ScoringEvent[] {
  const events: ScoringEvent[] = [];
  let a = 0;
  let b = 0;
  while (a < aCount || b < bCount) {
    if (a < aCount) {
      events.push(point("a"));
      a += 1;
    }
    if (b < bCount) {
      events.push(point("b"));
      b += 1;
    }
  }
  return events;
}

const RULES: VolleyballConfig = {
  best_of_sets: 3,
  regular_set_points_to: 25,
  deciding_set_points_to: 15,
  win_by: 2,
  regular_set_cap: null,
  deciding_set_cap: null,
};

function detail(config: VolleyballConfig, events: ScoringEvent[]): VolleyballDetail {
  const state = computeVolleyballState(config, events);
  if (state.detail.sport !== "volleyball") throw new Error("expected volleyball detail");
  return state.detail;
}

test("normal rally scoring", () => {
  const d = detail(RULES, [...rally("a", 3), ...rally("b", 1)]);
  expectEq(d.currentSet, { a: 3, b: 1 });
  expectEq(d.setsWon, { a: 0, b: 0 });
  expectEq(d.decidingSet, false);
  expectEq(d.completedSets, []);
});

test("required winning margin", () => {
  const level = detail(RULES, closeScore(25, 24));
  expectEq(level.currentSet, { a: 25, b: 24 });
  expectEq(level.setsWon, { a: 0, b: 0 });
  const won = detail(RULES, [...closeScore(25, 24), point("a")]);
  expectEq(won.setsWon, { a: 1, b: 0 });
  expectEq(won.completedSets, [{ a: 26, b: 24 }]);
  expectEq(won.currentSet, { a: 0, b: 0 });
});

test("regular-set completion", () => {
  const d = detail(RULES, rally("a", 25));
  expectEq(d.setsWon, { a: 1, b: 0 });
  expectEq(d.completedSets, [{ a: 25, b: 0 }]);
  expectEq(d.decidingSet, false);
});

test("shorter deciding set", () => {
  const split = [...rally("a", 25), ...rally("b", 25)];
  const early = detail(RULES, [...split, ...rally("a", 14)]);
  expectEq(early.decidingSet, true);
  expectEq(early.pointsTo, 15);
  expectEq(early.setsWon, { a: 1, b: 1 });
  expectEq(early.currentSet, { a: 14, b: 0 });
  const tight = detail(RULES, [...split, ...closeScore(15, 14)]);
  expectEq(tight.decidingSet, true);
  expectEq(tight.currentSet, { a: 15, b: 14 });
  const won = computeVolleyballState(RULES, [...split, ...rally("a", 15)]);
  expectEq(won.isComplete, true);
  expectEq(won.winnerSide, "a");
  expectEq((won.detail as VolleyballDetail).completedSets[2], { a: 15, b: 0 });
  expectEq((won.detail as VolleyballDetail).decidingSet, false);
});

test("cap behavior", () => {
  const capped: VolleyballConfig = { ...RULES, regular_set_cap: 27, deciding_set_cap: 17 };
  const before = detail(capped, closeScore(26, 26));
  expectEq(before.currentSet, { a: 26, b: 26 });
  expectEq(before.setsWon, { a: 0, b: 0 });
  const ended = detail(capped, [...closeScore(26, 26), point("a")]);
  expectEq(ended.setsWon, { a: 1, b: 0 });
  expectEq(ended.completedSets, [{ a: 27, b: 26 }]);
  const uncapped = detail(RULES, [...closeScore(26, 26), point("a")]);
  expectEq(uncapped.setsWon, { a: 0, b: 0 });
  expectEq(uncapped.currentSet, { a: 27, b: 26 });
  const split = [...rally("a", 25), ...rally("b", 25)];
  const deciding = detail(capped, [...split, ...closeScore(16, 16), point("b")]);
  expectEq(deciding.setsWon, { a: 1, b: 2 });
  expectEq(deciding.completedSets[2], { a: 16, b: 17 });
});

test("match completion", () => {
  const state = computeVolleyballState(RULES, [...rally("a", 25), ...rally("a", 25)]);
  expectEq(state.isComplete, true);
  expectEq(state.winnerSide, "a");
  expectEq(state.scoreSummary, { a: 2, b: 0 });
  const d = state.detail as VolleyballDetail;
  expectEq(d.completedSets.length, 2);
  expectEq(d.currentSet, { a: 0, b: 0 });
});

test("undo across point, set, and match boundaries", () => {
  const live = [point("a"), point("a"), point("b")];
  expectEq(detail(RULES, live).currentSet, { a: 2, b: 1 });
  expectEq(detail(RULES, [...live, undo()]).currentSet, { a: 2, b: 0 });

  const set = rally("a", 25);
  expectEq(detail(RULES, set).setsWon, { a: 1, b: 0 });
  const reopenedSet = detail(RULES, [...set, undo()]);
  expectEq(reopenedSet.setsWon, { a: 0, b: 0 });
  expectEq(reopenedSet.currentSet, { a: 24, b: 0 });
  expectEq(reopenedSet.completedSets, []);

  const match = [...rally("a", 25), ...rally("a", 25)];
  const reopened = computeVolleyballState(RULES, [...match, undo()]);
  expectEq(reopened.isComplete, false);
  expectEq(reopened.winnerSide, null);
  const d = reopened.detail as VolleyballDetail;
  expectEq(d.setsWon, { a: 1, b: 0 });
  expectEq(d.currentSet, { a: 24, b: 0 });
});

test("points after match completion are ignored", () => {
  const match = [...rally("a", 25), ...rally("a", 25)];
  const done = computeVolleyballState(RULES, match);
  const extra = computeVolleyballState(RULES, [...match, ...rally("b", 10)]);
  expectEq(extra.scoreSummary, done.scoreSummary);
  expectEq(extra.isComplete, true);
  expectEq((extra.detail as VolleyballDetail).currentSet, { a: 0, b: 0 });
  expectEq((extra.detail as VolleyballDetail).completedSets, (done.detail as VolleyballDetail).completedSets);
});

test("missing and malformed rules fail closed", () => {
  expectEq(parseVolleyballConfig(undefined), null);
  expectEq(parseVolleyballConfig(null), null);
  expectEq(parseVolleyballConfig({}), null);
  expectEq(parseVolleyballConfig([]), null);
  expectEq(parseVolleyballConfig({ ...RULES, deciding_set_points_to: undefined }), null);
  expectEq(parseVolleyballConfig({ ...RULES, best_of_sets: 2 }), null);
  expectEq(parseVolleyballConfig({ ...RULES, best_of_sets: 0 }), null);
  expectEq(parseVolleyballConfig({ ...RULES, best_of_sets: 3.5 }), null);
  expectEq(parseVolleyballConfig({ ...RULES, best_of_sets: Infinity }), null);
  expectEq(parseVolleyballConfig({ ...RULES, best_of_sets: Number.NaN }), null);
  expectEq(parseVolleyballConfig({ ...RULES, regular_set_points_to: 0 }), null);
  expectEq(parseVolleyballConfig({ ...RULES, regular_set_points_to: -25 }), null);
  expectEq(parseVolleyballConfig({ ...RULES, win_by: 0 }), null);
  expectEq(parseVolleyballConfig({ ...RULES, win_by: 1.5 }), null);
  expectEq(parseVolleyballConfig({ ...RULES, regular_set_cap: 24 }), null);
  expectEq(parseVolleyballConfig({ ...RULES, regular_set_cap: 25.5 }), null);
  expectEq(parseVolleyballConfig({ ...RULES, regular_set_cap: "27" }), null);
  expectEq(parseVolleyballConfig({ ...RULES, deciding_set_cap: 14 }), null);
  expectEq(parseVolleyballConfig({ ...RULES, deciding_set_cap: 0 }), null);
  expectEq(parseVolleyballConfig({ ...RULES, regular_set_cap: Infinity }), null);
  const parsed = parseVolleyballConfig(RULES);
  expectEq(parsed?.regular_set_cap, null);
  expectEq(parsed?.deciding_set_cap, null);
  const withCap = parseVolleyballConfig({ ...RULES, regular_set_cap: 27 });
  expectEq(withCap?.regular_set_cap, 27);
  expectEq(withCap?.deciding_set_cap, null);

  let threw = false;
  try {
    computeMatchState("volleyball", {}, []);
  } catch (e: unknown) {
    threw = e instanceof Error && e.message === "Rules not configured";
  }
  if (!threw) throw new Error("missing volleyball rules did not fail closed");
  threw = false;
  try {
    computeMatchStateForStage("volleyball", { best_of: 5, points_to: 11 }, [], { stageType: "group" });
  } catch (e: unknown) {
    threw = e instanceof Error && e.message === "Rules not configured";
  }
  if (!threw) throw new Error("stage format filled in volleyball rules");
  const valid = computeMatchState("Volleyball", RULES, []);
  expectEq(valid.detail.sport, "volleyball");
  const football = computeMatchState("football", {}, []);
  expectEq(football.detail.sport, "futsal");
  const other = computeMatchState("athletics", {}, []);
  expectEq(other.detail.sport, "futsal");
});

test("registry routing stays on canonical volleyball", () => {
  expectEq(resolveCategoryMatchEngine("volleyball", "Men"), "volleyball");
  expectEq(resolveCategoryMatchEngine("Volleyball", null), "volleyball");
  expectEq(resolveCategoryMatchEngine("volleyball", ""), "volleyball");
  expectEq(resolveCategoryMatchEngine("beach volleyball", "Men"), null);
  expectEq(resolveCategoryMatchEngine("volley ball", "Men"), null);
  expectEq(resolveCategoryMatchEngine("archery", "Ranking Round"), null);
  expectEq(resolveMatchEngine("volleyball"), null);
  expectEq(resolveNspgEngine("volleyball"), null);
  expectEq(resolveCategoryMatchEngine("football", "Men"), "futsal");
  expectEq(resolveCategoryMatchEngine("badminton", "Men's Singles"), "badminton");
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Men's Singles"), "lawn_tennis");
  expectEq(resolveCategorySupport("volleyball", "Men", RULES), "supported");
  expectEq(resolveCategorySupport("volleyball", "Women", {}), "structured");
  expectEq(resolveCategorySupport("archery", "Ranking Round", RULES), "unsupported");
  expectEq(resolveCategorySupport("athletics", "100m"), "unsupported");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

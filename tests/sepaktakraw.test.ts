/**
 * Sepaktakraw engine, configuration, alias normalization, and routing.
 * Run with: npx tsx tests/sepaktakraw.test.ts
 */

import {
  computeMatchState,
  computeMatchStateForStage,
  computeSepaktakrawState,
  computeVolleyballState,
  parseSepaktakrawConfig,
  sepaktakrawHasSquads,
} from "../lib/scoring";
import type { ScoringEvent, SepaktakrawConfig, SepaktakrawDetail } from "../lib/scoring";
import {
  canonicalNspgSlug,
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

const RULES: SepaktakrawConfig = {
  best_of_sets: 3,
  regular_set_points_to: 21,
  deciding_set_points_to: 15,
  win_by: 2,
  regular_set_cap: null,
  deciding_set_cap: null,
};

function detail(config: SepaktakrawConfig, events: ScoringEvent[]): SepaktakrawDetail {
  const state = computeSepaktakrawState(config, events);
  if (state.detail.sport !== "sepaktakraw") throw new Error("expected sepaktakraw detail");
  return state.detail;
}

test("normal rally scoring", () => {
  const d = detail(RULES, [...rally("a", 4), ...rally("b", 2)]);
  expectEq(d.currentSet, { a: 4, b: 2 });
  expectEq(d.setsWon, { a: 0, b: 0 });
  expectEq(d.decidingSet, false);
});

test("required winning margin", () => {
  const level = detail(RULES, closeScore(21, 20));
  expectEq(level.currentSet, { a: 21, b: 20 });
  expectEq(level.setsWon, { a: 0, b: 0 });
  const won = detail(RULES, [...closeScore(21, 20), point("a")]);
  expectEq(won.setsWon, { a: 1, b: 0 });
  expectEq(won.completedSets, [{ a: 22, b: 20 }]);
});

test("regular-set completion", () => {
  const d = detail(RULES, rally("a", 21));
  expectEq(d.setsWon, { a: 1, b: 0 });
  expectEq(d.completedSets, [{ a: 21, b: 0 }]);
  expectEq(d.decidingSet, false);
});

test("shorter deciding set", () => {
  const split = [...rally("a", 21), ...rally("b", 21)];
  const early = detail(RULES, [...split, ...rally("a", 14)]);
  expectEq(early.decidingSet, true);
  expectEq(early.pointsTo, 15);
  expectEq(early.currentSet, { a: 14, b: 0 });
  const tight = detail(RULES, [...split, ...closeScore(15, 14)]);
  expectEq(tight.decidingSet, true);
  expectEq(tight.currentSet, { a: 15, b: 14 });
  const won = computeSepaktakrawState(RULES, [...split, ...rally("a", 15)]);
  expectEq(won.isComplete, true);
  expectEq(won.winnerSide, "a");
  expectEq((won.detail as SepaktakrawDetail).completedSets[2], { a: 15, b: 0 });
});

test("cap behavior", () => {
  const capped: SepaktakrawConfig = { ...RULES, regular_set_cap: 25, deciding_set_cap: 17 };
  const before = detail(capped, closeScore(24, 24));
  expectEq(before.setsWon, { a: 0, b: 0 });
  expectEq(before.currentSet, { a: 24, b: 24 });
  const ended = detail(capped, [...closeScore(24, 24), point("a")]);
  expectEq(ended.completedSets, [{ a: 25, b: 24 }]);
  const uncapped = detail(RULES, [...closeScore(24, 24), point("a")]);
  expectEq(uncapped.setsWon, { a: 0, b: 0 });
  expectEq(uncapped.currentSet, { a: 25, b: 24 });
  const split = [...rally("a", 21), ...rally("b", 21)];
  const deciding = detail(capped, [...split, ...closeScore(16, 16), point("b")]);
  expectEq(deciding.completedSets[2], { a: 16, b: 17 });
});

test("match completion", () => {
  const state = computeSepaktakrawState(RULES, [...rally("a", 21), ...rally("a", 21)]);
  expectEq(state.isComplete, true);
  expectEq(state.winnerSide, "a");
  expectEq(state.scoreSummary, { a: 2, b: 0 });
  expectEq((state.detail as SepaktakrawDetail).currentSet, { a: 0, b: 0 });
});

test("undo across point, set, and match boundaries", () => {
  const live = [point("a"), point("b"), point("a")];
  expectEq(detail(RULES, [...live, undo()]).currentSet, { a: 1, b: 1 });

  const set = rally("a", 21);
  const reopenedSet = detail(RULES, [...set, undo()]);
  expectEq(reopenedSet.setsWon, { a: 0, b: 0 });
  expectEq(reopenedSet.currentSet, { a: 20, b: 0 });

  const match = [...rally("a", 21), ...rally("a", 21)];
  const reopened = computeSepaktakrawState(RULES, [...match, undo()]);
  expectEq(reopened.isComplete, false);
  expectEq((reopened.detail as SepaktakrawDetail).setsWon, { a: 1, b: 0 });
  expectEq((reopened.detail as SepaktakrawDetail).currentSet, { a: 20, b: 0 });
});

test("points after match completion are ignored", () => {
  const match = [...rally("a", 21), ...rally("a", 21)];
  const done = computeSepaktakrawState(RULES, match);
  const extra = computeSepaktakrawState(RULES, [...match, ...rally("b", 8)]);
  expectEq(extra.scoreSummary, done.scoreSummary);
  expectEq((extra.detail as SepaktakrawDetail).currentSet, { a: 0, b: 0 });
  expectEq(
    (extra.detail as SepaktakrawDetail).completedSets,
    (done.detail as SepaktakrawDetail).completedSets,
  );
});

test("missing and malformed rules fail closed", () => {
  expectEq(parseSepaktakrawConfig(undefined), null);
  expectEq(parseSepaktakrawConfig(null), null);
  expectEq(parseSepaktakrawConfig({}), null);
  expectEq(parseSepaktakrawConfig([]), null);
  expectEq(parseSepaktakrawConfig({ ...RULES, best_of_sets: 2 }), null);
  expectEq(parseSepaktakrawConfig({ ...RULES, best_of_sets: 0 }), null);
  expectEq(parseSepaktakrawConfig({ ...RULES, best_of_sets: 3.5 }), null);
  expectEq(parseSepaktakrawConfig({ ...RULES, best_of_sets: Infinity }), null);
  expectEq(parseSepaktakrawConfig({ ...RULES, best_of_sets: Number.NaN }), null);
  expectEq(parseSepaktakrawConfig({ ...RULES, regular_set_points_to: 0 }), null);
  expectEq(parseSepaktakrawConfig({ ...RULES, win_by: 0 }), null);
  expectEq(parseSepaktakrawConfig({ ...RULES, regular_set_cap: 20 }), null);
  expectEq(parseSepaktakrawConfig({ ...RULES, deciding_set_cap: 14 }), null);
  expectEq(parseSepaktakrawConfig({ ...RULES, regular_set_cap: "25" }), null);
  expectEq(parseSepaktakrawConfig(RULES)?.regular_set_cap, null);

  let threw = false;
  try {
    computeMatchState("sepaktakraw", {}, []);
  } catch (e: unknown) {
    threw = e instanceof Error && e.message === "Rules not configured";
  }
  if (!threw) throw new Error("missing sepaktakraw rules did not fail closed");
  threw = false;
  try {
    computeMatchStateForStage("sepak takraw", { best_of: 3, points_to: 21 }, [], { stageType: "group" });
  } catch (e: unknown) {
    threw = e instanceof Error && e.message === "Rules not configured";
  }
  if (!threw) throw new Error("alias or stage format filled in sepaktakraw rules");
  const valid = computeMatchState("sepak-takraw", RULES, []);
  expectEq(valid.detail.sport, "sepaktakraw");
  const football = computeMatchState("football", {}, []);
  expectEq(football.detail.sport, "futsal");
  const unknown = computeMatchState("takraw", {}, []);
  expectEq(unknown.detail.sport, "futsal");
});

test("alias normalization and fail-closed routing", () => {
  expectEq(canonicalNspgSlug("sepak takraw"), "sepaktakraw");
  expectEq(canonicalNspgSlug("sepak-takraw"), "sepaktakraw");
  expectEq(canonicalNspgSlug("sepaktakraw"), "sepaktakraw");
  expectEq(resolveCategoryMatchEngine("sepaktakraw", "Regu"), "sepaktakraw");
  expectEq(resolveCategoryMatchEngine("sepak takraw", "Double"), "sepaktakraw");
  expectEq(resolveCategoryMatchEngine("sepak-takraw", "Quad"), "sepaktakraw");
  expectEq(resolveCategoryMatchEngine("sepaktakraw", ""), "sepaktakraw");
  expectEq(resolveCategoryMatchEngine("takraw", "Regu"), null);
  expectEq(resolveCategoryMatchEngine("volleyball", "Regu"), "volleyball");
  expectEq(resolveMatchEngine("sepaktakraw"), null);
  expectEq(resolveNspgEngine("sepaktakraw"), null);
  expectEq(resolveCategorySupport("sepaktakraw", "Double", RULES), "supported");
  expectEq(resolveCategorySupport("sepak takraw", "Regu", {}), "structured");
  expectEq(resolveCategorySupport("archery", "Ranking Round"), "unsupported");
  expectEq(sepaktakrawHasSquads({ id: "squad-a" }, { id: "squad-b" }), true);
  expectEq(sepaktakrawHasSquads(null, { id: "squad-b" }), false);
  expectEq(sepaktakrawHasSquads({ id: "" }, { id: "squad-b" }), false);
  const volleyball = computeVolleyballState(
    {
      best_of_sets: 3,
      regular_set_points_to: 25,
      deciding_set_points_to: 15,
      win_by: 2,
      regular_set_cap: null,
      deciding_set_cap: null,
    },
    rally("a", 25),
  );
  expectEq(volleyball.detail.sport, "volleyball");
  expectEq((volleyball.detail as { completedSets: Array<{ a: number }> }).completedSets[0]?.a, 25);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

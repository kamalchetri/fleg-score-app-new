/**
 * Darts scoring engine unit tests.
 * Run with: npx tsx src/lib/scoring/darts.test.ts
 */

import { computeMatchState } from "../lib/scoring";
import type { DartsDetail, ScoringEvent } from "../lib/scoring";

let passed = 0;
let failed = 0;

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

let nextId = 1;
function ev(event_type: string, payload: Record<string, unknown> = {}): ScoringEvent {
  const id = nextId++;
  return {
    id,
    event_type,
    payload,
    created_at: new Date(1720000000000 + id * 30_000).toISOString(),
  };
}
function resetIds() {
  nextId = 1;
}

function darts(events: ScoringEvent[], config?: Record<string, unknown>) {
  return computeMatchState("darts", config ?? null, events);
}

function winLeg(side: "a" | "b") {
  return [
    ev("visit", { side, score: 180, darts: 3 }),
    ev("visit", { side, score: 180, darts: 3 }),
    ev("visit", { side, score: 141, darts: 3, checkout: true }),
  ];
}

console.log("\nDarts:");

resetIds();
test("plain leg: visits subtract and checkout ends leg", () => {
  const s = darts([
    ev("visit", { side: "a", score: 180, darts: 3 }),
    ev("visit", { side: "b", score: 60, darts: 3 }),
    ev("visit", { side: "a", score: 180, darts: 3 }),
    ev("visit", { side: "b", score: 45, darts: 3 }),
    ev("visit", { side: "a", score: 141, darts: 3, checkout: true }),
  ]);
  const d = s.detail as DartsDetail;
  expectEq(d.legsWon.a, 1);
  expectEq(d.legsWon.b, 0);
  expectEq(d.remaining.a, 501);
  expectEq(d.remaining.b, 501);
  expectEq(s.isComplete, false);
});

resetIds();
test("bust: over-score reverts remaining", () => {
  const s = darts([ev("visit", { side: "a", score: 100, darts: 3 })]);
  let d = s.detail as DartsDetail;
  expectEq(d.remaining.a, 401);
  const s2 = darts([
    ev("visit", { side: "a", score: 100, darts: 3 }),
    ev("visit", { side: "a", score: 500, darts: 3 }),
  ]);
  d = s2.detail as DartsDetail;
  expectEq(d.remaining.a, 401);
  expectEq(d.legVisits[1]?.bust, true);
});

resetIds();
test("bust: leaving 1 unchanged", () => {
  const s = darts([
    ev("visit", { side: "a", score: 40, darts: 3 }),
  ], { start_score: 41 });
  const d = s.detail as DartsDetail;
  expectEq(d.remaining.a, 41);
  expectEq(d.legVisits[0]?.bust, true);
});

resetIds();
test("bust: reaching 0 without checkout", () => {
  const s = darts([ev("visit", { side: "a", score: 501, darts: 3 })]);
  const d = s.detail as DartsDetail;
  expectEq(d.remaining.a, 501);
  expectEq(d.legVisits[0]?.bust, true);
});

resetIds();
test("double-out: checkout true wins leg", () => {
  const s = darts([ev("visit", { side: "a", score: 501, darts: 3, checkout: true })]);
  const d = s.detail as DartsDetail;
  expectEq(d.legsWon.a, 1);
  expectEq(d.remaining.a, 501);
});

resetIds();
test("legs mode: first to legs_to_win wins match", () => {
  const events = [...winLeg("a"), ...winLeg("a")];
  const s = darts(events, { play_format: "legs", legs_to_win: 2, sets_to_win: 3 });
  expectEq(s.isComplete, true);
  expectEq(s.winnerSide, "a");
  expectEq(s.scoreSummary, { a: 2, b: 0 });
});

resetIds();
test("sets mode: legs roll into sets and match completes", () => {
  const leg = (side: "a" | "b") => [
    ev("visit", { side, score: 501, darts: 3, checkout: true }),
  ];
  const events = [
    ...leg("a"),
    ...leg("a"),
    ...leg("a"),
    ...leg("a"),
  ];
  const s = darts(events, {
    play_format: "sets",
    legs_to_win: 2,
    sets_to_win: 2,
    start_score: 501,
  });
  expectEq(s.isComplete, true);
  expectEq(s.winnerSide, "a");
  const d = s.detail as DartsDetail;
  expectEq(d.setsWon.a, 2);
  expectEq(d.completedSets.length, 2);
});

resetIds();
test("stats: 180s, high checkout, 9-dart leg, average", () => {
  const events = winLeg("a");
  const s = darts(events);
  const d = s.detail as DartsDetail;
  expectEq(d.stats.oneEighties.a, 2);
  expectEq(d.stats.highCheckout.a, 141);
  expectEq(d.stats.bestLegDarts.a, 9);
  expectEq(d.stats.nineDartLegs.a, 1);
  expectEq(d.stats.threeDartAvg.a, 167);
});

resetIds();
test("undo cancels last visit", () => {
  const s = darts([
    ev("visit", { side: "a", score: 100, darts: 3 }),
    ev("visit", { side: "b", score: 60, darts: 3 }),
    ev("undo"),
  ]);
  const d = s.detail as DartsDetail;
  expectEq(d.remaining.b, 501);
  expectEq(d.legVisits.length, 1);
});

resetIds();
test("deterministic recompute", () => {
  const events = [
    ev("visit", { side: "a", score: 180, darts: 3 }),
    ev("visit", { side: "b", score: 140, darts: 3 }),
  ];
  const a = darts(events);
  resetIds();
  const b = darts(events);
  expectEq(JSON.stringify(a), JSON.stringify(b));
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

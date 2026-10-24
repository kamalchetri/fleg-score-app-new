/**
 * Combat bout results and category routing.
 * Run with: npx tsx tests/combat-bout.test.ts
 */

import { computeCombatState } from "../lib/scoring";
import type { ScoringEvent } from "../lib/scoring";
import { resolveCategoryMatchEngine, resolveMatchEngine } from "../lib/sports/nspg";

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

function ev(id: number, event_type: string, payload: Record<string, unknown> = {}): ScoringEvent {
  return { id, event_type, payload, created_at: "2026-10-11T00:00:00.000Z" };
}

test("no result is incomplete", () => {
  const state = computeCombatState([]);
  expectEq(state.isComplete, false);
  expectEq(state.winnerSide, null);
  expectEq(state.display, "No result");
});

test("winner with points completes the bout", () => {
  const state = computeCombatState([
    ev(1, "bout_result", { winnerSide: "a", pointsA: 10, pointsB: 8, method: "decision" }),
  ]);
  expectEq(state.isComplete, true);
  expectEq(state.winnerSide, "a");
  expectEq(state.scoreSummary, { a: 10, b: 8 });
  expectEq(state.display, "10 – 8");
});

test("winner without points displays the method", () => {
  const state = computeCombatState([
    ev(1, "bout_result", { winnerSide: "b", method: "stoppage" }),
  ]);
  expectEq(state.isComplete, true);
  expectEq(state.winnerSide, "b");
  expectEq(state.display, "Stoppage");
  expectEq(state.scoreSummary, { a: 0, b: 0 });
});

test("tied points keep the explicit winner", () => {
  const state = computeCombatState([
    ev(1, "bout_result", { winnerSide: "b", pointsA: 5, pointsB: 5, method: "decision" }),
  ]);
  expectEq(state.isComplete, true);
  expectEq(state.winnerSide, "b");
  expectEq(state.display, "5 – 5");
});

test("invalid winner is ignored", () => {
  const state = computeCombatState([
    ev(1, "bout_result", { winnerSide: "home", pointsA: 3, pointsB: 1, method: "decision" }),
  ]);
  expectEq(state.isComplete, false);
  expectEq(state.winnerSide, null);
});

test("negative and non-finite points are ignored", () => {
  const negative = computeCombatState([
    ev(1, "bout_result", { winnerSide: "a", pointsA: -1, pointsB: 2, method: "decision" }),
  ]);
  const infinite = computeCombatState([
    ev(1, "bout_result", { winnerSide: "a", pointsA: Number.POSITIVE_INFINITY, pointsB: 1, method: "other" }),
  ]);
  expectEq(negative.isComplete, false);
  expectEq(infinite.isComplete, false);
  expectEq(negative.winnerSide, null);
});

test("undo reopens the bout", () => {
  const state = computeCombatState([
    ev(1, "bout_result", { winnerSide: "a", method: "walkover" }),
    ev(2, "undo", {}),
  ]);
  expectEq(state.isComplete, false);
  expectEq(state.winnerSide, null);
  expectEq(state.display, "No result");
});

test("pencak tanding and wushu sanda use combat", () => {
  expectEq(resolveCategoryMatchEngine("pencak_silat", "Putra Tanding 55 kg"), "combat");
  expectEq(resolveCategoryMatchEngine("pencak silat", "Senior Tanding"), "combat");
  expectEq(resolveCategoryMatchEngine("wushu", "Men's Sanda 60kg"), "combat");
  expectEq(resolveCategoryMatchEngine("Wushu", "Sanda"), "combat");
});

test("artistic ensembles and unknown categories stay unsupported", () => {
  expectEq(resolveCategoryMatchEngine("pencak_silat", "Men Artistic Regu"), null);
  expectEq(resolveCategoryMatchEngine("pencak_silat", "Men Artistic"), "artistic");
  expectEq(resolveCategoryMatchEngine("pencak_silat", "Tunggal"), "artistic");
  expectEq(resolveCategoryMatchEngine("pencak_silat", "Ganda"), "artistic");
  expectEq(resolveCategoryMatchEngine("wushu", "Taolu"), "artistic");
  expectEq(resolveCategoryMatchEngine("wushu", "Nanquan"), null);
  expectEq(resolveCategoryMatchEngine("wushu", ""), null);
  expectEq(resolveCategoryMatchEngine("athletics", "100m"), null);
  expectEq(resolveCategoryMatchEngine("archery", "Ranking Round"), null);
  expectEq(resolveMatchEngine("wushu"), null);
  expectEq(resolveMatchEngine("pencak_silat"), null);
});

test("boxing taekwondo and wrestling are combat", () => {
  expectEq(resolveCategoryMatchEngine("boxing", "Flyweight"), "combat");
  expectEq(resolveCategoryMatchEngine("taekwondo", null), "combat");
  expectEq(resolveCategoryMatchEngine("wrestling", "Freestyle 65kg"), "combat");
});

test("existing scored sports ignore combat category names", () => {
  expectEq(resolveCategoryMatchEngine("football", "Sanda"), "futsal");
  expectEq(resolveCategoryMatchEngine("futsal", "Tanding"), "futsal");
  expectEq(resolveCategoryMatchEngine("basketball", "Sanda"), "basketball");
  expectEq(resolveCategoryMatchEngine("badminton", "Tanding"), "badminton");
  expectEq(resolveCategoryMatchEngine("pickleball", "Sanda"), "pickleball");
  expectEq(resolveCategoryMatchEngine("darts", "Tanding"), "darts");
  expectEq(resolveMatchEngine("football"), "futsal");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

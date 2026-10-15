/**
 * Table tennis engine, configuration, and category routing.
 * Run with: npx tsx tests/table-tennis.test.ts
 */

import { computeMatchState, computeMatchStateForStage, computeTableTennisState, parseTableTennisConfig } from "../lib/scoring";
import type { ScoringEvent, TableTennisConfig, TableTennisDetail } from "../lib/scoring";
import {
  NSPG_SPORTS,
  resolveCategoryMatchEngine,
  resolveCategorySupport,
  resolveMatchEngine,
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

function closeGame(targetA: number, targetB: number): ScoringEvent[] {
  const events: ScoringEvent[] = [];
  let a = 0;
  let b = 0;
  while (a < targetA || b < targetB) {
    if (a < targetA && a <= b) {
      events.push(point("a"));
      a += 1;
    } else if (b < targetB) {
      events.push(point("b"));
      b += 1;
    } else {
      events.push(point("a"));
      a += 1;
    }
  }
  return events;
}

const TO_11: TableTennisConfig = { best_of: 3, points_to: 11, win_by: 2, cap: null };

function detail(config: TableTennisConfig, events: ScoringEvent[]): TableTennisDetail {
  const state = computeTableTennisState(config, events);
  if (state.detail.sport !== "table_tennis") throw new Error("expected table tennis detail");
  return state.detail;
}

test("game to 11", () => {
  seq = 1;
  const state = computeTableTennisState(TO_11, closeGame(11, 0));
  const d = state.detail as TableTennisDetail;
  expectEq(d.completedGames, [{ a: 11, b: 0 }]);
  expectEq(d.currentGame, { a: 0, b: 0 });
  expectEq(d.gamesWon, { a: 1, b: 0 });
  expectEq(state.isComplete, false);
  expectEq(state.winnerSide, null);
  expectEq(state.display, "1–0 · 11-0 · 0-0");
});

test("deuce at 10-10 does not end the game", () => {
  seq = 1;
  const d = detail(TO_11, closeGame(10, 10));
  expectEq(d.currentGame, { a: 10, b: 10 });
  expectEq(d.completedGames, []);
  expectEq(d.gamesWon, { a: 0, b: 0 });
});

test("win by two after deuce", () => {
  seq = 1;
  const events = [...closeGame(10, 10), point("a")];
  const held = detail(TO_11, events);
  expectEq(held.currentGame, { a: 11, b: 10 });
  expectEq(held.completedGames, []);
  const won = detail(TO_11, [...events, point("a")]);
  expectEq(won.completedGames, [{ a: 12, b: 10 }]);
  expectEq(won.gamesWon, { a: 1, b: 0 });
});

test("optional cap ends a game inside the win-by margin", () => {
  seq = 1;
  const capped: TableTennisConfig = { best_of: 3, points_to: 11, win_by: 2, cap: 15 };
  const under = detail(capped, closeGame(14, 14));
  expectEq(under.currentGame, { a: 14, b: 14 });
  expectEq(under.completedGames, []);
  const atCap = detail(capped, [...closeGame(14, 14), point("a")]);
  expectEq(atCap.completedGames, [{ a: 15, b: 14 }]);
  expectEq(atCap.gamesWon, { a: 1, b: 0 });
});

test("best of three completes when one side wins two games", () => {
  seq = 1;
  const state = computeTableTennisState(TO_11, [...closeGame(11, 0), ...closeGame(0, 11), ...closeGame(11, 0)]);
  expectEq(state.isComplete, true);
  expectEq(state.winnerSide, "a");
  expectEq(state.scoreSummary, { a: 2, b: 1 });
  const d = state.detail as TableTennisDetail;
  expectEq(d.completedGames, [
    { a: 11, b: 0 },
    { a: 0, b: 11 },
    { a: 11, b: 0 },
  ]);
  expectEq(state.display, "2–1 · 11-0, 0-11, 11-0");
});

test("points after match completion are ignored", () => {
  seq = 1;
  const won = [...closeGame(11, 0), ...closeGame(11, 0)];
  const done = computeTableTennisState(TO_11, won);
  const extra = computeTableTennisState(TO_11, [...won, point("b"), point("b")]);
  expectEq(done.isComplete, true);
  expectEq(extra.scoreSummary, done.scoreSummary);
  expectEq(extra.display, done.display);
  expectEq((extra.detail as TableTennisDetail).currentGame, { a: 0, b: 0 });
});

test("undo reopens a completed game and a completed match", () => {
  seq = 1;
  const game = closeGame(11, 0);
  const closed = detail(TO_11, game);
  expectEq(closed.gamesWon, { a: 1, b: 0 });
  const reopenedGame = detail(TO_11, [...game, undo()]);
  expectEq(reopenedGame.gamesWon, { a: 0, b: 0 });
  expectEq(reopenedGame.completedGames, []);
  expectEq(reopenedGame.currentGame, { a: 10, b: 0 });

  const match = [...closeGame(11, 0), ...closeGame(11, 0)];
  const complete = computeTableTennisState(TO_11, match);
  expectEq(complete.isComplete, true);
  const reopened = computeTableTennisState(TO_11, [...match, undo()]);
  expectEq(reopened.isComplete, false);
  expectEq(reopened.winnerSide, null);
  expectEq(reopened.scoreSummary, { a: 1, b: 0 });
  expectEq((reopened.detail as TableTennisDetail).currentGame, { a: 10, b: 0 });
});

test("missing and invalid configuration is rejected", () => {
  expectEq(parseTableTennisConfig(undefined), null);
  expectEq(parseTableTennisConfig(null), null);
  expectEq(parseTableTennisConfig({}), null);
  expectEq(parseTableTennisConfig({ best_of: 3, points_to: 11 }), null);
  expectEq(parseTableTennisConfig({ best_of: 2, points_to: 11, win_by: 2 }), null);
  expectEq(parseTableTennisConfig({ best_of: 3, points_to: 0, win_by: 2 }), null);
  expectEq(parseTableTennisConfig({ best_of: 3, points_to: 11.5, win_by: 2 }), null);
  expectEq(parseTableTennisConfig({ best_of: 3, points_to: 11, win_by: 2, cap: 10 }), null);
  expectEq(parseTableTennisConfig({ best_of: "3", points_to: 11, win_by: 2 }), null);
  const parsed = parseTableTennisConfig({ best_of: 5, points_to: 11, win_by: 2 });
  expectEq(parsed, { best_of: 5, points_to: 11, win_by: 2, cap: null });
  expectEq(parseTableTennisConfig({ best_of: 1, points_to: 11, win_by: 2, cap: 11 })?.cap, 11);
  let threw = false;
  try {
    computeMatchState("table_tennis", {}, []);
  } catch (e: unknown) {
    threw = e instanceof Error && e.message === "Rules not configured";
  }
  if (!threw) throw new Error("invalid config was scored with a default");
  threw = false;
  try {
    computeMatchStateForStage("table_tennis", null, [], { stageType: "group" });
  } catch (e: unknown) {
    threw = e instanceof Error && e.message === "Rules not configured";
  }
  if (!threw) throw new Error("stage format filled in table tennis rules");
});

test("singles routing is accepted and doubles or team routing is rejected", () => {
  expectEq(resolveCategoryMatchEngine("table_tennis", "Men's Singles"), "table_tennis");
  expectEq(resolveCategoryMatchEngine("Table Tennis", "Women's singles"), "table_tennis");
  expectEq(resolveCategoryMatchEngine("table_tennis", "Men's Doubles"), null);
  expectEq(resolveCategoryMatchEngine("table_tennis", "Mixed Doubles"), null);
  expectEq(resolveCategoryMatchEngine("table_tennis", "Men's Team"), null);
  expectEq(resolveCategoryMatchEngine("table_tennis", "Team"), null);
  expectEq(resolveMatchEngine("table_tennis"), null);
  const rules = { best_of: 5, points_to: 11, win_by: 2 };
  expectEq(resolveCategorySupport("table_tennis", "Men's Singles", rules), "supported");
  expectEq(resolveCategorySupport("table_tennis", "Men's Singles", {}), "structured");
  expectEq(resolveCategorySupport("table_tennis", "Men's Doubles", rules), "unsupported");
  expectEq(resolveCategorySupport("table_tennis", "Mixed Doubles", rules), "unsupported");
  expectEq(resolveCategorySupport("table_tennis", "Team", rules), "unsupported");
});

test("existing engines and combat routing stay unchanged", () => {
  expectEq(resolveCategoryMatchEngine("football", "Men's Singles"), "futsal");
  expectEq(resolveCategoryMatchEngine("basketball", "Sanda"), "basketball");
  expectEq(resolveCategoryMatchEngine("badminton", "Men's Singles"), "badminton");
  expectEq(resolveCategoryMatchEngine("pickleball", "Singles"), "pickleball");
  expectEq(resolveCategoryMatchEngine("darts", "Singles"), "darts");
  expectEq(resolveCategoryMatchEngine("boxing", "Flyweight"), "combat");
  expectEq(resolveCategoryMatchEngine("taekwondo", null), "combat");
  expectEq(resolveCategoryMatchEngine("wrestling", "Freestyle"), "combat");
  expectEq(resolveCategoryMatchEngine("wushu", "Men's Sanda"), "combat");
  expectEq(resolveCategoryMatchEngine("wushu", "Taolu"), null);
  expectEq(resolveCategoryMatchEngine("pencak_silat", "Tanding"), "combat");
  expectEq(resolveCategoryMatchEngine("pencak_silat", "Tunggal"), null);
  expectEq(resolveCategorySupport("boxing", "Flyweight"), "structured");
  expectEq(resolveCategorySupport("wushu", "Sanda"), "structured");
  expectEq(resolveCategorySupport("wushu", "Taolu"), "unsupported");
  expectEq(resolveCategorySupport("pencak_silat", "Putra Tanding"), "structured");
  expectEq(resolveCategorySupport("pencak_silat", "Artistic"), "unsupported");
  expectEq(resolveCategorySupport("athletics", "100m"), "unsupported");
  expectEq(resolveCategorySupport("archery", "Ranking Round"), "unsupported");
  expectEq(resolveCategorySupport("volleyball", "Men"), "structured");
  expectEq(resolveCategorySupport("sepaktakraw", "Regu"), "structured");
  expectEq(resolveCategorySupport("lawn_tennis", "Men's Singles"), "structured");
  expectEq(NSPG_SPORTS.boxing.liveScoring, "structured");
  expectEq(NSPG_SPORTS.table_tennis.engine, null);
  const badminton = computeMatchState("badminton", { best_of: 3, points_to: 21, win_by: 2, cap: 30 }, []);
  expectEq(badminton.detail.sport, "badminton");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

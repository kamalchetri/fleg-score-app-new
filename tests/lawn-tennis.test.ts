/**
 * Lawn tennis singles engine, configuration, and category routing.
 * Run with: npx tsx tests/lawn-tennis.test.ts
 */

import {
  computeLawnTennisState,
  computeMatchState,
  computeMatchStateForStage,
  parseLawnTennisConfig,
} from "../lib/scoring";
import type { LawnTennisConfig, LawnTennisDetail, LawnTennisTiebreakConfig, ScoringEvent } from "../lib/scoring";
import { resolveCategoryMatchEngine, resolveCategorySupport, resolveMatchEngine } from "../lib/sports/nspg";

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

function hold(side: "a" | "b"): ScoringEvent[] {
  return [point(side), point(side), point(side), point(side)];
}

function games(side: "a" | "b", count: number): ScoringEvent[] {
  const events: ScoringEvent[] = [];
  for (let i = 0; i < count; i += 1) events.push(...hold(side));
  return events;
}

function alternateGames(countEach: number): ScoringEvent[] {
  const events: ScoringEvent[] = [];
  for (let i = 0; i < countEach; i += 1) events.push(...hold("a"), ...hold("b"));
  return events;
}

function tiebreakPoints(targetA: number, targetB: number): ScoringEvent[] {
  const events: ScoringEvent[] = [];
  let a = 0;
  let b = 0;
  while (a < targetA || b < targetB) {
    if (a <= b && a < targetA) {
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

function tb(enabled: boolean, trigger: number, pointsTo: number, winBy: number): LawnTennisTiebreakConfig {
  return { enabled, trigger_games: trigger, points_to: pointsTo, win_by: winBy };
}

const RULES: LawnTennisConfig = {
  best_of_sets: 3,
  games_to_win_set: 6,
  set_win_by_games: 2,
  regular_set_tiebreak: tb(true, 6, 7, 2),
  deciding_set_tiebreak: tb(true, 6, 10, 2),
};

const NO_TIEBREAK: LawnTennisConfig = {
  ...RULES,
  regular_set_tiebreak: tb(false, 6, 7, 2),
  deciding_set_tiebreak: tb(false, 6, 7, 2),
};

function detail(config: LawnTennisConfig, events: ScoringEvent[]): LawnTennisDetail {
  const state = computeLawnTennisState(config, events);
  if (state.detail.sport !== "lawn_tennis") throw new Error("expected lawn tennis detail");
  return state.detail;
}

test("0/15/30/40 progression", () => {
  expectEq(detail(RULES, []).pointLabels, { a: "0", b: "0" });
  expectEq(detail(RULES, [point("a")]).pointLabels, { a: "15", b: "0" });
  expectEq(detail(RULES, [point("a"), point("a")]).pointLabels, { a: "30", b: "0" });
  expectEq(detail(RULES, [point("a"), point("a"), point("b")]).pointLabels, { a: "30", b: "15" });
  expectEq(detail(RULES, [point("a"), point("a"), point("a")]).pointLabels, { a: "40", b: "0" });
});

test("deuce, advantage, loss of advantage, and game", () => {
  const deuce = [point("a"), point("b"), point("a"), point("b"), point("a"), point("b")];
  const atDeuce = detail(RULES, deuce);
  expectEq(atDeuce.phase, "deuce");
  expectEq(atDeuce.pointLabels, { a: "40", b: "40" });
  expectEq(atDeuce.games, { a: 0, b: 0 });

  const advantage = detail(RULES, [...deuce, point("a")]);
  expectEq(advantage.phase, "advantage");
  expectEq(advantage.advantageSide, "a");
  expectEq(advantage.pointLabels, { a: "Ad", b: "40" });

  const lost = detail(RULES, [...deuce, point("a"), point("b")]);
  expectEq(lost.phase, "deuce");
  expectEq(lost.advantageSide, null);

  const won = detail(RULES, [...deuce, point("a"), point("a")]);
  expectEq(won.games, { a: 1, b: 0 });
  expectEq(won.points, { a: 0, b: 0 });
  expectEq(won.phase, "game");
});

test("set completion uses the configured margin", () => {
  const fourAll = [...alternateGames(4)];
  const fiveFour = detail(NO_TIEBREAK, [...fourAll, ...hold("a")]);
  expectEq(fiveFour.setsWon, { a: 0, b: 0 });
  expectEq(fiveFour.games, { a: 5, b: 4 });

  const sixFour = detail(NO_TIEBREAK, [...fourAll, ...hold("a"), ...hold("a")]);
  expectEq(sixFour.setsWon, { a: 1, b: 0 });
  expectEq(sixFour.completedSets, [{ a: 6, b: 4, tiebreak: null }]);
  expectEq(sixFour.games, { a: 0, b: 0 });
});

test("regular-set tiebreak", () => {
  const atSix = detail(RULES, alternateGames(6));
  expectEq(atSix.games, { a: 6, b: 6 });
  expectEq(atSix.inTiebreak, false);
  expectEq(atSix.decidingSet, false);

  const midBreak = detail(RULES, [...alternateGames(6), ...tiebreakPoints(6, 5)]);
  expectEq(midBreak.inTiebreak, true);
  expectEq(midBreak.points, { a: 6, b: 5 });
  expectEq(midBreak.setsWon, { a: 0, b: 0 });

  const won = detail(RULES, [...alternateGames(6), ...tiebreakPoints(7, 5)]);
  expectEq(won.setsWon, { a: 1, b: 0 });
  expectEq(won.completedSets, [{ a: 7, b: 6, tiebreak: { a: 7, b: 5 } }]);
  expectEq(won.inTiebreak, false);
  expectEq(won.decidingSet, false);
});

test("deciding set uses its own tiebreak", () => {
  const split = [...games("a", 6), ...games("b", 6), ...alternateGames(6)];
  const sevenNil = detail(RULES, [...split, ...Array.from({ length: 7 }, () => point("a"))]);
  expectEq(sevenNil.decidingSet, true);
  expectEq(sevenNil.inTiebreak, true);
  expectEq(sevenNil.points, { a: 7, b: 0 });
  expectEq(sevenNil.setsWon, { a: 1, b: 1 });

  const onlySet = {
    ...RULES,
    best_of_sets: 1,
    regular_set_tiebreak: tb(true, 6, 7, 2),
    deciding_set_tiebreak: tb(true, 6, 10, 2),
  };
  const early = detail(onlySet, [...alternateGames(6), ...Array.from({ length: 7 }, () => point("a"))]);
  expectEq(early.decidingSet, true);
  expectEq(early.setsWon, { a: 0, b: 0 });
  expectEq(early.points, { a: 7, b: 0 });
  const match = detail(onlySet, [...alternateGames(6), ...Array.from({ length: 10 }, () => point("a"))]);
  expectEq(match.setsWon, { a: 1, b: 0 });
  expectEq(computeLawnTennisState(onlySet, [...alternateGames(6), ...Array.from({ length: 10 }, () => point("a"))]).isComplete, true);
});

test("match completion", () => {
  const events = [...games("a", 6), ...games("a", 6)];
  const state = computeLawnTennisState(RULES, events);
  expectEq(state.isComplete, true);
  expectEq(state.winnerSide, "a");
  expectEq(state.scoreSummary, { a: 2, b: 0 });
  const d = state.detail as LawnTennisDetail;
  expectEq(d.completedSets.length, 2);
  expectEq(d.decidingSet, false);
});

test("undo across point, game, set, tiebreak, and completed match", () => {
  const onePoint = [point("a")];
  expectEq(detail(RULES, [...onePoint, undo()]).pointLabels, { a: "0", b: "0" });

  const game = [...hold("a")];
  const reopenedGame = detail(RULES, [...game, undo()]);
  expectEq(reopenedGame.games, { a: 0, b: 0 });
  expectEq(reopenedGame.pointLabels, { a: "40", b: "0" });

  const set = games("a", 6);
  const reopenedSet = detail(NO_TIEBREAK, [...set, undo()]);
  expectEq(reopenedSet.setsWon, { a: 0, b: 0 });
  expectEq(reopenedSet.games, { a: 5, b: 0 });
  expectEq(reopenedSet.pointLabels, { a: "40", b: "0" });

  const broken = [...alternateGames(6), ...tiebreakPoints(7, 5)];
  const reopenedBreak = detail(RULES, [...broken, undo()]);
  expectEq(reopenedBreak.setsWon, { a: 0, b: 0 });
  expectEq(reopenedBreak.inTiebreak, true);
  expectEq(reopenedBreak.points, { a: 6, b: 5 });

  const match = [...games("a", 6), ...games("a", 6)];
  const reopenedMatch = computeLawnTennisState(RULES, [...match, undo()]);
  expectEq(reopenedMatch.isComplete, false);
  expectEq(reopenedMatch.winnerSide, null);
  const reopenedDetail = reopenedMatch.detail as LawnTennisDetail;
  expectEq(reopenedDetail.setsWon, { a: 1, b: 0 });
  expectEq(reopenedDetail.games, { a: 5, b: 0 });
});

test("points after match completion are ignored", () => {
  const match = [...games("a", 6), ...games("a", 6)];
  const done = computeLawnTennisState(RULES, match);
  const extra = computeLawnTennisState(RULES, [...match, point("b"), point("b"), point("b"), point("b")]);
  expectEq(extra.isComplete, true);
  expectEq(extra.winnerSide, "a");
  expectEq(extra.scoreSummary, done.scoreSummary);
  expectEq((extra.detail as LawnTennisDetail).completedSets, (done.detail as LawnTennisDetail).completedSets);
  expectEq((extra.detail as LawnTennisDetail).points, { a: 0, b: 0 });
});

test("missing and invalid rules fail closed", () => {
  const tie = tb(true, 6, 7, 2);
  expectEq(parseLawnTennisConfig(undefined), null);
  expectEq(parseLawnTennisConfig(null), null);
  expectEq(parseLawnTennisConfig({}), null);
  expectEq(parseLawnTennisConfig([]), null);
  expectEq(
    parseLawnTennisConfig({
      best_of_sets: 3,
      games_to_win_set: 6,
      set_win_by_games: 2,
      regular_set_tiebreak: tie,
    }),
    null,
  );
  expectEq(
    parseLawnTennisConfig({
      ...RULES,
      best_of_sets: 2,
    }),
    null,
  );
  expectEq(parseLawnTennisConfig({ ...RULES, best_of_sets: 0 }), null);
  expectEq(parseLawnTennisConfig({ ...RULES, best_of_sets: 3.5 }), null);
  expectEq(parseLawnTennisConfig({ ...RULES, best_of_sets: Infinity }), null);
  expectEq(parseLawnTennisConfig({ ...RULES, best_of_sets: Number.NaN }), null);
  expectEq(parseLawnTennisConfig({ ...RULES, games_to_win_set: 0 }), null);
  expectEq(parseLawnTennisConfig({ ...RULES, games_to_win_set: -6 }), null);
  expectEq(parseLawnTennisConfig({ ...RULES, set_win_by_games: 0 }), null);
  expectEq(
    parseLawnTennisConfig({
      ...RULES,
      regular_set_tiebreak: { enabled: "yes", trigger_games: 6, points_to: 7, win_by: 2 },
    }),
    null,
  );
  expectEq(
    parseLawnTennisConfig({
      ...RULES,
      deciding_set_tiebreak: { enabled: true, trigger_games: 6, points_to: 7.5, win_by: 2 },
    }),
    null,
  );
  expectEq(
    parseLawnTennisConfig({
      ...RULES,
      set_win_by_games: 1,
      regular_set_tiebreak: tb(true, 6, 7, 2),
    }),
    null,
  );
  expectEq(parseLawnTennisConfig(RULES)?.best_of_sets, 3);

  let threw = false;
  try {
    computeMatchState("lawn_tennis", {}, []);
  } catch (e) {
    threw = e instanceof Error && e.message === "Rules not configured";
  }
  expectEq(threw, true);
  threw = false;
  try {
    computeMatchStateForStage("lawn_tennis", null, [], { stageType: "group" });
  } catch (e) {
    threw = e instanceof Error && e.message === "Rules not configured";
  }
  expectEq(threw, true);
  const scored = computeMatchState("lawn_tennis", RULES, [point("a")]);
  expectEq(scored.detail.sport, "lawn_tennis");
  const football = computeMatchState("football", {}, []);
  expectEq(football.detail.sport, "futsal");
});

test("singles routing and rejection of doubles, mixed, team, and pair categories", () => {
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Men's Singles"), "lawn_tennis");
  expectEq(resolveCategoryMatchEngine("Lawn Tennis", "Women's singles"), "lawn_tennis");
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Singles"), "lawn_tennis");
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Boys U18 Singles"), "lawn_tennis");
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Men's Doubles"), null);
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Mixed Doubles"), null);
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Mixed Singles"), null);
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Men's Team"), null);
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Teams"), null);
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Open Pairs"), null);
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Pair"), null);
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Singles Doubles"), null);
  expectEq(resolveCategoryMatchEngine("lawn_tennis", "Men's"), null);
  expectEq(resolveCategoryMatchEngine("lawn_tennis", null), null);
  expectEq(resolveCategoryMatchEngine("lawn_tennis", ""), null);
  expectEq(resolveMatchEngine("lawn_tennis"), null);
  expectEq(resolveCategoryMatchEngine("football", "Men's Singles"), "futsal");
  expectEq(resolveCategoryMatchEngine("badminton", "Men's Singles"), "badminton");
  expectEq(resolveCategorySupport("lawn_tennis", "Men's Singles", RULES), "supported");
  expectEq(resolveCategorySupport("lawn_tennis", "Men's Singles", {}), "structured");
  expectEq(resolveCategorySupport("lawn_tennis", "Men's Doubles", RULES), "unsupported");
  expectEq(resolveCategorySupport("lawn_tennis", "Open Pairs", RULES), "unsupported");
  expectEq(resolveCategorySupport("lawn_tennis", "Men's", RULES), "unsupported");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

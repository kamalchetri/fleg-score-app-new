// SYNC: ported from Fleg-score web 2026-07-04 (import paths adjusted)
/**
 * Scoring engine unit tests (futsal + pickleball, including undo chains).
 * Run with: npx tsx src/__tests__/scoring-engine.test.ts
 * (same zero-dependency runner pattern as aiko-registration-controls.test.ts)
 */

import { computeMatchState } from "../lib/scoring";
import type { ScoringEvent } from "../lib/scoring";
import type {
  FutsalDetail,
  PickleballDetail,
  BasketballDetail,
  BadmintonDetail,
} from "../lib/scoring";

// ─── Test runner (synchronous, deterministic) ────────────────────────────────
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

// ─── Event builder ───────────────────────────────────────────────────────────
let nextId = 1;
function ev(
  event_type: string,
  payload: Record<string, unknown> = {},
): ScoringEvent {
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

const futsal = (events: ScoringEvent[]) =>
  computeMatchState("futsal", null, events);
const pickle = (events: ScoringEvent[]) =>
  computeMatchState("pickleball", null, events);
const basketball = (events: ScoringEvent[]) =>
  computeMatchState("basketball", null, events);
const badminton = (events: ScoringEvent[]) =>
  computeMatchState("badminton", null, events);

// ─── Futsal ──────────────────────────────────────────────────────────────────
console.log("\nFutsal:");

resetIds();
test("no events → 0-0, not started, incomplete", () => {
  const s = futsal([]);
  expectEq(s.scoreSummary, { a: 0, b: 0 });
  expectEq(s.isComplete, false);
  expectEq(s.winnerSide, null);
  expectEq((s.detail as FutsalDetail).currentPeriod, null);
});

resetIds();
test("goals accumulate per side during periods", () => {
  const s = futsal([
    ev("period_start"),
    ev("goal", { side: "a" }),
    ev("goal", { side: "a" }),
    ev("goal", { side: "b" }),
  ]);
  expectEq(s.scoreSummary, { a: 2, b: 1 });
  expectEq(s.isComplete, false, "match not complete mid-period");
  expectEq((s.detail as FutsalDetail).currentPeriod, 1);
});

resetIds();
test("full regulation with winner → complete", () => {
  const s = futsal([
    ev("period_start"),
    ev("goal", { side: "a" }),
    ev("period_end"),
    ev("period_start"),
    ev("goal", { side: "b" }),
    ev("goal", { side: "a" }),
    ev("period_end"),
  ]);
  expectEq(s.scoreSummary, { a: 2, b: 1 });
  expectEq(s.isComplete, true);
  expectEq(s.winnerSide, "a");
  expectEq(s.display, "2 – 1");
});

resetIds();
test("regulation draw → complete as draw (shootout optional)", () => {
  const s = futsal([
    ev("period_start"),
    ev("goal", { side: "a" }),
    ev("period_end"),
    ev("period_start"),
    ev("goal", { side: "b" }),
    ev("period_end"),
  ]);
  expectEq(s.isComplete, true);
  expectEq(s.winnerSide, null);
});

resetIds();
test("penalty shootout decides a drawn match", () => {
  const s = futsal([
    ev("period_start"),
    ev("goal", { side: "a" }),
    ev("period_end"),
    ev("period_start"),
    ev("goal", { side: "b" }),
    ev("period_end"),
    ev("period_start"), // period 3 = shootout
    ev("goal", { side: "a" }),
    ev("goal", { side: "a" }),
    ev("goal", { side: "b" }),
    ev("period_end"),
  ]);
  expectEq(s.scoreSummary, { a: 1, b: 1 }, "regulation goals unchanged");
  expectEq((s.detail as FutsalDetail).shootout, { a: 2, b: 1 });
  expectEq(s.isComplete, true);
  expectEq(s.winnerSide, "a");
  expectEq(s.display, "1 – 1 (2–1 pens)");
});

resetIds();
test("cards are tracked with side/type/player", () => {
  const s = futsal([
    ev("period_start"),
    ev("card", { side: "a", cardType: "yellow", player: "R. Singh" }),
    ev("card", { side: "b", cardType: "red" }),
  ]);
  const d = s.detail as FutsalDetail;
  expectEq(d.cards.length, 2);
  expectEq(d.cards[0], {
    side: "a",
    cardType: "yellow",
    player: "R. Singh",
    minute: null,
    clock: null,
    secondYellow: false,
  });
  expectEq(d.cards[1], {
    side: "b",
    cardType: "red",
    player: null,
    minute: null,
    clock: null,
    secondYellow: false,
  });
});

resetIds();
test("undo cancels the latest goal", () => {
  const s = futsal([
    ev("period_start"),
    ev("goal", { side: "a" }),
    ev("goal", { side: "b" }),
    ev("undo"), // cancels b's goal
  ]);
  expectEq(s.scoreSummary, { a: 1, b: 0 });
});

resetIds();
test("undo chain: undo, undo cancels two most recent scoring events", () => {
  const s = futsal([
    ev("period_start"),
    ev("goal", { side: "a" }),
    ev("card", { side: "b", cardType: "yellow" }),
    ev("goal", { side: "b" }),
    ev("undo"), // cancels b goal
    ev("undo"), // cancels b yellow card
  ]);
  expectEq(s.scoreSummary, { a: 1, b: 0 });
  expectEq((s.detail as FutsalDetail).cards.length, 0);
});

resetIds();
test("undo does not cancel period events, and excess undo is a no-op", () => {
  const s = futsal([
    ev("period_start"),
    ev("undo"), // nothing undoable yet → no-op
    ev("goal", { side: "a" }),
    ev("undo"),
    ev("undo"), // stack empty again → no-op
  ]);
  expectEq(s.scoreSummary, { a: 0, b: 0 });
  expectEq((s.detail as FutsalDetail).currentPeriod, 1, "period survives undo");
});

resetIds();
test("event ids out of insertion order still replay by id", () => {
  const e1 = ev("period_start");
  const e2 = ev("goal", { side: "a" });
  const e3 = ev("undo");
  const s = futsal([e3, e1, e2]); // shuffled input
  expectEq(s.scoreSummary, { a: 0, b: 0 });
});

resetIds();
function evAt(
  event_type: string,
  created_at: string,
  payload: Record<string, unknown> = {},
): ScoringEvent {
  const id = nextId++;
  return { id, event_type, payload, created_at };
}

test("possession clock: A 60s then B 40s → 60/40", () => {
  const s = futsal([
    evAt("period_start", "2026-08-04T10:00:00.000Z"),
    evAt("possession", "2026-08-04T10:00:00.000Z", { side: "a" }),
    evAt("possession", "2026-08-04T10:01:00.000Z", { side: "b" }),
    evAt("period_end", "2026-08-04T10:01:40.000Z"),
  ]);
  const d = s.detail as FutsalDetail;
  expectEq(d.possessionMs, { a: 60_000, b: 40_000 });
  expectEq(d.possession, { a: 60, b: 40 });
});

resetIds();
test("possession clock: period_end mid-hold closes the segment", () => {
  const s = futsal([
    evAt("period_start", "2026-08-04T10:00:00.000Z"),
    evAt("possession", "2026-08-04T10:00:00.000Z", { side: "a" }),
    evAt("period_end", "2026-08-04T10:02:30.000Z"),
  ]);
  expectEq((s.detail as FutsalDetail).possessionMs, { a: 150_000, b: 0 });
});

resetIds();
test("possession clock: undo of switch reverts", () => {
  const s = futsal([
    evAt("period_start", "2026-08-04T10:00:00.000Z"),
    evAt("possession", "2026-08-04T10:00:00.000Z", { side: "a" }),
    evAt("possession", "2026-08-04T10:01:00.000Z", { side: "b" }),
    evAt("undo", "2026-08-04T10:01:05.000Z"),
    evAt("period_end", "2026-08-04T10:02:00.000Z"),
  ]);
  expectEq((s.detail as FutsalDetail).possessionMs, { a: 120_000, b: 0 });
});

// ─── Pickleball ──────────────────────────────────────────────────────────────
console.log("\nPickleball:");

resetIds();
test("no events → 0-0 games, incomplete", () => {
  const s = pickle([]);
  expectEq(s.scoreSummary, { a: 0, b: 0 });
  expectEq(s.isComplete, false);
  expectEq(s.display, "0-0");
});

resetIds();
function points(side: "a" | "b", n: number): ScoringEvent[] {
  return Array.from({ length: n }, () => ev("point", { side }));
}

test("game completes at 11 with 2-point margin", () => {
  const s = pickle([...points("b", 5), ...points("a", 11)]);
  const d = s.detail as PickleballDetail;
  expectEq(d.gamesWon, { a: 1, b: 0 });
  expectEq(d.completedGames, [{ a: 11, b: 5 }]);
});

resetIds();
test("10-10 requires win by 2 (deuce)", () => {
  const raw: ScoringEvent[] = [];
  for (let i = 0; i < 10; i++) {
    raw.push(ev("point", { side: "a" }), ev("point", { side: "b" }));
  }
  raw.push(ev("point", { side: "a" })); // 11-10 — not enough
  let s = pickle(raw);
  let d = s.detail as PickleballDetail;
  expectEq(d.gamesWon, { a: 0, b: 0 }, "11-10 does not win");
  expectEq(d.currentGame, { a: 11, b: 10 });

  raw.push(ev("point", { side: "a" })); // 12-10 — wins
  s = pickle(raw);
  d = s.detail as PickleballDetail;
  expectEq(d.gamesWon, { a: 1, b: 0 });
  expectEq(d.completedGames, [{ a: 12, b: 10 }]);
});

resetIds();
test("best of 3: two games wins the match", () => {
  const s = pickle([
    ...points("a", 11),
    ...points("b", 11), // game 2 (b) — but interleaved sequencing matters:
  ]);
  // a wins game 1 11-0, then b wins game 2 11-0 → 1-1, incomplete
  expectEq(s.scoreSummary, { a: 1, b: 1 });
  expectEq(s.isComplete, false);

  const s2 = pickle([...points("a", 11), ...points("b", 11), ...points("a", 11)]);
  expectEq(s2.scoreSummary, { a: 2, b: 1 });
  expectEq(s2.isComplete, true);
  expectEq(s2.winnerSide, "a");
  expectEq(s2.display, "11-0, 0-11, 11-0");
});

resetIds();
test("points after match completion are ignored", () => {
  const s = pickle([
    ...points("a", 11),
    ...points("a", 11),
    ...points("b", 5), // match already over
  ]);
  expectEq(s.scoreSummary, { a: 2, b: 0 });
  expectEq((s.detail as PickleballDetail).currentGame, { a: 0, b: 0 });
});

resetIds();
test("undo removes last point", () => {
  const s = pickle([
    ev("point", { side: "a" }),
    ev("point", { side: "b" }),
    ev("undo"),
  ]);
  expectEq((s.detail as PickleballDetail).currentGame, { a: 1, b: 0 });
});

resetIds();
test("undo across a game boundary reopens the game", () => {
  const raw = [...points("a", 11)]; // game won 11-0
  let s = pickle(raw);
  expectEq((s.detail as PickleballDetail).gamesWon, { a: 1, b: 0 });

  raw.push(ev("undo")); // cancel the game-winning point
  s = pickle(raw);
  const d = s.detail as PickleballDetail;
  expectEq(d.gamesWon, { a: 0, b: 0 }, "game reopened");
  expectEq(d.currentGame, { a: 10, b: 0 });
});

resetIds();
test("undo chain across match point", () => {
  const raw = [...points("a", 11), ...points("a", 10), ...points("b", 2)];
  raw.push(ev("point", { side: "a" })); // 11-2: match over 2-0
  let s = pickle(raw);
  expectEq(s.isComplete, true);

  raw.push(ev("undo")); // cancel match point
  s = pickle(raw);
  expectEq(s.isComplete, false, "match reopened by undo");
  expectEq((s.detail as PickleballDetail).currentGame, { a: 10, b: 2 });
});

resetIds();
test("game_start events are tolerated (no state impact)", () => {
  const s = pickle([ev("game_start"), ev("point", { side: "b" })]);
  expectEq((s.detail as PickleballDetail).currentGame, { a: 0, b: 1 });
});

resetIds();
test("custom sport_config overrides preset (points_to 15, best_of 5)", () => {
  const s = computeMatchState(
    "pickleball",
    { best_of: 5, points_to: 15, win_by: 2 },
    [...points("a", 15)],
  );
  const d = s.detail as PickleballDetail;
  expectEq(d.gamesWon, { a: 1, b: 0 });
  expectEq(d.gamesNeeded, 3);
});

// ─── Basketball ──────────────────────────────────────────────────────────────
console.log("\nBasketball:");

resetIds();
test("1/2/3-point events sum correctly", () => {
  const s = basketball([
    ev("period_start"),
    ev("point", { side: "a", points: 2 }),
    ev("point", { side: "b", points: 3 }),
    ev("point", { side: "a", points: 1 }),
  ]);
  expectEq(s.scoreSummary, { a: 3, b: 3 });
  expectEq((s.detail as BasketballDetail).fouls, { a: 0, b: 0 });
});

resetIds();
test("fouls tally without affecting score", () => {
  const s = basketball([
    ev("foul", { side: "a" }),
    ev("foul", { side: "a" }),
    ev("foul", { side: "b" }),
    ev("point", { side: "b", points: 2 }),
  ]);
  expectEq(s.scoreSummary, { a: 0, b: 2 });
  expectEq((s.detail as BasketballDetail).fouls, { a: 2, b: 1 });
});

resetIds();
test("regulation tie after 4 periods → not complete (needs OT)", () => {
  const events: ScoringEvent[] = [];
  for (let q = 0; q < 4; q++) {
    events.push(ev("period_start"));
    for (let i = 0; i < 5; i++) events.push(ev("point", { side: "a", points: 2 }));
    for (let i = 0; i < 5; i++) events.push(ev("point", { side: "b", points: 2 }));
    events.push(ev("period_end"));
  }
  const s = basketball(events);
  expectEq(s.scoreSummary, { a: 40, b: 40 });
  expectEq(s.isComplete, false);
  expectEq((s.detail as BasketballDetail).periodsCompleted, 4);
});

resetIds();
test("OT period breaks tie → complete with winner", () => {
  const events: ScoringEvent[] = [];
  for (let q = 0; q < 4; q++) {
    events.push(ev("period_start"));
    for (let i = 0; i < 5; i++) events.push(ev("point", { side: "a", points: 2 }));
    for (let i = 0; i < 5; i++) events.push(ev("point", { side: "b", points: 2 }));
    events.push(ev("period_end"));
  }
  events.push(ev("period_start"));
  events.push(ev("point", { side: "a", points: 2 }));
  events.push(ev("point", { side: "a", points: 2 }));
  events.push(ev("point", { side: "a", points: 1 }));
  events.push(ev("point", { side: "b", points: 2 }));
  events.push(ev("point", { side: "b", points: 1 }));
  events.push(ev("period_end"));
  const s = basketball(events);
  expectEq(s.scoreSummary, { a: 45, b: 43 });
  expectEq(s.isComplete, true);
  expectEq(s.winnerSide, "a");
});

resetIds();
test("undo reverts last point", () => {
  const s = basketball([
    ev("point", { side: "a", points: 3 }),
    ev("point", { side: "b", points: 2 }),
    ev("undo"),
  ]);
  expectEq(s.scoreSummary, { a: 3, b: 0 });
});

resetIds();
test("line scores per quarter", () => {
  const s = basketball([
    ev("period_start"),
    ev("point", { side: "a", points: 2 }),
    ev("point", { side: "a", points: 2 }),
    ev("point", { side: "a", points: 2 }),
    ev("point", { side: "a", points: 2 }),
    ev("point", { side: "a", points: 2 }),
    ev("point", { side: "a", points: 2 }),
    ev("point", { side: "b", points: 2 }),
    ev("point", { side: "b", points: 2 }),
    ev("point", { side: "b", points: 2 }),
    ev("point", { side: "b", points: 2 }),
    ev("period_end"),
    ev("period_start"),
    ev("point", { side: "a", points: 2 }),
    ev("point", { side: "a", points: 2 }),
    ev("point", { side: "a", points: 2 }),
    ev("point", { side: "a", points: 2 }),
    ev("point", { side: "a", points: 2 }),
    ev("point", { side: "b", points: 2 }),
    ev("point", { side: "b", points: 2 }),
    ev("point", { side: "b", points: 2 }),
    ev("point", { side: "b", points: 2 }),
    ev("point", { side: "b", points: 2 }),
    ev("point", { side: "b", points: 1 }),
    ev("period_end"),
  ]);
  expectEq((s.detail as BasketballDetail).lineScores, [
    { a: 12, b: 8 },
    { a: 10, b: 11 },
  ]);
});

// ─── Badminton ───────────────────────────────────────────────────────────────
console.log("\nBadminton:");

resetIds();
test("game to 21 with win-by-2", () => {
  const events: ScoringEvent[] = [];
  for (let i = 0; i < 19; i++) events.push(ev("point", { side: "a" }));
  for (let i = 0; i < 17; i++) events.push(ev("point", { side: "b" }));
  events.push(ev("point", { side: "a" }));
  events.push(ev("point", { side: "a" }));
  const s = badminton(events);
  expectEq((s.detail as BadmintonDetail).completedGames, [{ a: 21, b: 17 }]);
  expectEq(s.scoreSummary, { a: 1, b: 0 });
});

resetIds();
test("deuce at 20-20 needs two-point lead", () => {
  const events: ScoringEvent[] = [];
  for (let i = 0; i < 20; i++) events.push(ev("point", { side: "a" }));
  for (let i = 0; i < 20; i++) events.push(ev("point", { side: "b" }));
  let s = badminton(events);
  expectEq(s.isComplete, false);
  expectEq((s.detail as BadmintonDetail).currentGame, { a: 20, b: 20 });
  events.push(ev("point", { side: "a" }));
  s = badminton(events);
  expectEq(s.isComplete, false);
  events.push(ev("point", { side: "b" }));
  s = badminton(events);
  expectEq((s.detail as BadmintonDetail).currentGame, { a: 21, b: 21 });
  expectEq(s.isComplete, false);
  events.push(ev("point", { side: "a" }));
  events.push(ev("point", { side: "a" }));
  s = badminton(events);
  expectEq((s.detail as BadmintonDetail).completedGames[0], { a: 23, b: 21 });
});

resetIds();
test("29-29 cap → next point wins at 30", () => {
  const events: ScoringEvent[] = [];
  for (let i = 0; i < 29; i++) {
    events.push(ev("point", { side: "a" }));
    events.push(ev("point", { side: "b" }));
  }
  events.push(ev("point", { side: "a" }));
  const s = badminton(events);
  expectEq((s.detail as BadmintonDetail).completedGames, [{ a: 30, b: 29 }]);
});

resetIds();
test("best-of-3 match win at 2 games", () => {
  const game = (aPts: number, bPts: number) => {
    const e: ScoringEvent[] = [];
    const n = Math.max(aPts, bPts);
    for (let i = 0; i < n; i++) {
      if (i < aPts) e.push(ev("point", { side: "a" }));
      if (i < bPts) e.push(ev("point", { side: "b" }));
    }
    return e;
  };
  const s = badminton([...game(21, 10), ...game(21, 15)]);
  expectEq(s.isComplete, true);
  expectEq(s.winnerSide, "a");
  expectEq(s.display, "21-10, 21-15");
});

resetIds();
test("badminton undo reverts last point", () => {
  const s = badminton([
    ev("point", { side: "a" }),
    ev("point", { side: "b" }),
    ev("undo"),
  ]);
  expectEq((s.detail as BadmintonDetail).currentGame, { a: 1, b: 0 });
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

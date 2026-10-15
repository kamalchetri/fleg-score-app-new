// SYNC: copied from Fleg-score web 2026-07-13 — imports adjusted to app paths (../lib/formats)
/**
 * Formats engine unit tests: round robin, standings, groups→knockout.
 * Run with: npx tsx src/__tests__/formats-engine.test.ts
 */

import { generateRoundRobin } from "../lib/formats/roundrobin";
import {
  computeStandings,
  standingsConfigForSport,
  type StandingsMatch,
} from "../lib/formats/standings";
import {
  splitIntoGroups,
  generateGroupStage,
  advanceFromGroups,
  knockoutSeedsFromGroups,
} from "../lib/formats/groups";
import { resolveMatchFormat, resolveStageContext } from "../lib/scoring/format";

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

function expectTrue(cond: boolean, label: string): void {
  if (!cond) throw new Error(label);
}

const ids = (n: number) => Array.from({ length: n }, (_, i) => `e${i + 1}`);

// ── Round robin ─────────────────────────────────────────────────────────────
console.log("\nRound robin:");

test("4 entrants → 3 rounds, 6 matches, everyone plays everyone once", () => {
  const rr = generateRoundRobin(ids(4));
  expectEq(rr.rounds, 3);
  expectEq(rr.pairings.length, 6);
  const seen = new Set(
    rr.pairings.map((p) => [p.entrantA, p.entrantB].sort().join("-")),
  );
  expectEq(seen.size, 6, "all pairings unique");
});

test("5 entrants (odd) → 5 rounds, 10 matches, one bye per round", () => {
  const rr = generateRoundRobin(ids(5));
  expectEq(rr.rounds, 5);
  expectEq(rr.pairings.length, 10);
  for (let r = 1; r <= 5; r++) {
    expectEq(
      rr.pairings.filter((p) => p.round === r).length,
      2,
      `round ${r} has 2 matches`,
    );
  }
  // Each entrant plays 4 matches.
  for (const id of ids(5)) {
    const count = rr.pairings.filter(
      (p) => p.entrantA === id || p.entrantB === id,
    ).length;
    expectEq(count, 4, `${id} plays 4`);
  }
});

test("no entrant appears twice in the same round", () => {
  const rr = generateRoundRobin(ids(8));
  for (let r = 1; r <= rr.rounds; r++) {
    const inRound = rr.pairings
      .filter((p) => p.round === r)
      .flatMap((p) => [p.entrantA, p.entrantB]);
    expectEq(new Set(inRound).size, inRound.length, `round ${r} distinct`);
  }
});

test("double round robin mirrors legs with swapped sides", () => {
  const rr = generateRoundRobin(ids(4), { doubleRoundRobin: true });
  expectEq(rr.rounds, 6);
  expectEq(rr.pairings.length, 12);
  const leg1 = rr.pairings.filter((p) => p.round <= 3);
  const leg2 = rr.pairings.filter((p) => p.round > 3);
  for (const p of leg1) {
    expectTrue(
      leg2.some(
        (q) =>
          q.round === p.round + 3 &&
          q.entrantA === p.entrantB &&
          q.entrantB === p.entrantA,
      ),
      `mirror of ${p.entrantA}-${p.entrantB} exists`,
    );
  }
});

test("deterministic for identical input", () => {
  expectEq(generateRoundRobin(ids(6)), generateRoundRobin(ids(6)));
});

test("rejects fewer than 2 entrants", () => {
  let threw = false;
  try {
    generateRoundRobin(["only"]);
  } catch {
    threw = true;
  }
  expectTrue(threw, "should throw");
});

// ── Standings ───────────────────────────────────────────────────────────────
console.log("\nStandings:");

const futsalCfg = standingsConfigForSport({
  table_points: { win: 3, draw: 1, loss: 0 },
});
const pbCfg = standingsConfigForSport({});

const E = (id: string) => ({ id, name: id.toUpperCase() });
const M = (
  a: string,
  b: string,
  sa: number,
  sb: number,
  status = "completed",
): StandingsMatch => ({
  entrantA: a,
  entrantB: b,
  status,
  winnerId: sa === sb ? null : sa > sb ? a : b,
  scoreA: sa,
  scoreB: sb,
});

test("futsal points 3/1/0 with draws", () => {
  const rows = computeStandings(
    [M("a", "b", 2, 2), M("a", "c", 1, 0), M("b", "c", 0, 3)],
    [E("a"), E("b"), E("c")],
    futsalCfg,
  );
  expectEq(rows.map((r) => [r.entrantId, r.points]), [
    ["a", 4],
    ["c", 3],
    ["b", 1],
  ]);
  expectEq(rows[0].drawn, 1);
  expectEq(rows[0].rank, 1);
});

test("head-to-head decides before score diff", () => {
  // a and b tied on points; b beat a head-to-head but a has better diff.
  const rows = computeStandings(
    [
      M("a", "c", 9, 0),
      M("b", "a", 1, 0),
      M("b", "c", 1, 0),
      M("c", "a", 0, 5),
      M("c", "b", 2, 0),
      M("a", "b", 0, 1), // b beats a again
    ],
    [E("a"), E("b"), E("c")],
    futsalCfg,
  );
  // a: 2 wins (vs c twice) = 6pts, diff +13. b: 2 wins (vs a twice)... recount:
  // a: W9-0c, L0-1b, W5-0c, L0-1b → 6 pts, diff 14-2=+12
  // b: W1-0a, W1-0c, L0-2c, W1-0a → 9 pts
  // c: L0-9a, L0-1b, W2-0b, L0-5a → 3 pts
  expectEq(rows.map((r) => r.entrantId), ["b", "a", "c"]);
});

test("true head-to-head tiebreak within points-tied pairs", () => {
  // a & b tied on 6 pts (a far better diff, but b beat a head-to-head);
  // c & d tied on 3 pts (equal diff, d beat c head-to-head).
  const rows = computeStandings(
    [
      M("b", "a", 1, 0),
      M("a", "c", 9, 0),
      M("a", "d", 9, 0),
      M("b", "d", 1, 0),
      M("c", "b", 1, 0),
      M("d", "c", 1, 0),
    ],
    [E("a"), E("b"), E("c"), E("d")],
    futsalCfg,
  );
  expectEq(rows.map((r) => r.entrantId), ["b", "a", "d", "c"]);
});

test("pickleball ranks by match wins, no draws", () => {
  const rows = computeStandings(
    [M("a", "b", 2, 1), M("a", "c", 2, 0), M("b", "c", 2, 0)],
    [E("a"), E("b"), E("c")],
    pbCfg,
  );
  expectEq(rows.map((r) => [r.entrantId, r.points]), [
    ["a", 2],
    ["b", 1],
    ["c", 0],
  ]);
});

test("walkover counts as win/loss", () => {
  const wo: StandingsMatch = {
    entrantA: "a",
    entrantB: "b",
    status: "walkover",
    winnerId: "a",
    scoreA: 0,
    scoreB: 0,
  };
  const rows = computeStandings([wo], [E("a"), E("b")], futsalCfg);
  expectEq(rows[0].entrantId, "a");
  expectEq(rows[0].won, 1);
  expectEq(rows[0].points, 3);
  expectEq(rows[1].lost, 1);
});

test("scheduled/live matches are ignored", () => {
  const rows = computeStandings(
    [M("a", "b", 3, 0, "scheduled"), M("a", "b", 0, 3, "live")],
    [E("a"), E("b")],
    futsalCfg,
  );
  expectEq(rows[0].played, 0);
  expectEq(rows[1].played, 0);
});

test("alphabetical fallback is stable", () => {
  const rows = computeStandings([], [E("b"), E("a")], futsalCfg);
  expectEq(rows.map((r) => r.entrantId), ["a", "b"]);
});

// ── Groups ──────────────────────────────────────────────────────────────────
console.log("\nGroups:");

test("snake split, 6 entrants into 2 groups", () => {
  expectEq(splitIntoGroups(ids(6), { groupCount: 2 }), [
    ["e1", "e4", "e5"],
    ["e2", "e3", "e6"],
  ]);
});

test("snake split, 7 entrants into 3 groups (odd/uneven)", () => {
  expectEq(splitIntoGroups(ids(7), { groupCount: 3 }), [
    ["e1", "e6", "e7"],
    ["e2", "e5"],
    ["e3", "e4"],
  ]);
});

test("groupSize config resolves count", () => {
  const groups = splitIntoGroups(ids(8), { groupSize: 4 });
  expectEq(groups.length, 2);
});

test("generateGroupStage: 2 groups of 4 → RR fixtures per group", () => {
  const stage = generateGroupStage(ids(8), {
    groupCount: 2,
    advancePerGroup: 2,
  });
  expectEq(stage.length, 2);
  expectEq(stage[0].name, "A");
  expectEq(stage[1].name, "B");
  for (const g of stage) {
    expectEq(g.pairings.length, 6, `${g.name} has 6 matches`);
    expectEq(g.rounds, 3);
  }
});

test("rejects advancePerGroup >= smallest group", () => {
  let threw = false;
  try {
    generateGroupStage(ids(6), { groupCount: 3, advancePerGroup: 2 });
  } catch {
    threw = true;
  }
  expectTrue(threw, "should throw");
});

test("cross-seeding 2 groups: A1 vs B2, B1 vs A2", () => {
  const bracket = advanceFromGroups([
    { group: 0, rank: 1, entrantId: "A1" },
    { group: 1, rank: 1, entrantId: "B1" },
    { group: 0, rank: 2, entrantId: "A2" },
    { group: 1, rank: 2, entrantId: "B2" },
  ]);
  const r1 = bracket.matches.filter((m) => m.round === 1);
  const pairs = r1.map((m) => [m.entrantA, m.entrantB].sort().join("v"));
  expectTrue(pairs.includes("A1vB2"), "A1 vs B2");
  expectTrue(pairs.includes("A2vB1"), "B1 vs A2");
});

test("4 groups: no same-group round-1 meetings", () => {
  const qualifiers = [0, 1, 2, 3].flatMap((g) => [
    { group: g, rank: 1, entrantId: `G${g}R1` },
    { group: g, rank: 2, entrantId: `G${g}R2` },
  ]);
  const bracket = advanceFromGroups(qualifiers);
  for (const m of bracket.matches.filter((x) => x.round === 1)) {
    expectTrue(
      m.entrantA![0 + 1] !== m.entrantB![1],
      `${m.entrantA} vs ${m.entrantB} not same group`,
    );
  }
});

test("3 groups edge case: byes for top seeds, same-group avoided", () => {
  const qualifiers = [0, 1, 2].flatMap((g) => [
    { group: g, rank: 1, entrantId: `G${g}R1` },
    { group: g, rank: 2, entrantId: `G${g}R2` },
  ]);
  const bracket = advanceFromGroups(qualifiers);
  expectEq(bracket.bracketSize, 8);
  const r1 = bracket.matches.filter((m) => m.round === 1);
  const byes = r1.filter((m) => m.status === "walkover");
  expectEq(byes.length, 2, "two byes");
  const played = r1.filter((m) => m.entrantA && m.entrantB);
  for (const m of played) {
    expectTrue(m.entrantA![1] !== m.entrantB![1], `${m.entrantA} vs ${m.entrantB}`);
  }
});

test("knockoutSeedsFromGroups orders rank blocks in group order", () => {
  const seeds = knockoutSeedsFromGroups([
    { group: 1, rank: 2, entrantId: "B2" },
    { group: 0, rank: 1, entrantId: "A1" },
    { group: 1, rank: 1, entrantId: "B1" },
    { group: 0, rank: 2, entrantId: "A2" },
  ]);
  expectEq(seeds.map((s) => s.id), ["A1", "B1", "A2", "B2"]);
});

// ── Match format context ────────────────────────────────────────────────────
console.log("\nMatch format context:");

test("stage context uses configured knockout rounds", () => {
  expectEq(
    resolveStageContext({
      stageType: "knockout",
      stageConfig: { rounds: 4 },
      matchRound: 3,
    }),
    { stageType: "knockout", round: 3, maxRound: 4 },
  );
});

test("unknown stage safely matches the web knockout default", () => {
  expectEq(resolveStageContext({ stageType: "unexpected", matchRound: 2 }), {
    stageType: "knockout",
    round: 2,
    maxRound: 2,
  });
});

test("round override preserves darts legs_to_win", () => {
  expectEq(
    resolveMatchFormat({
      sport: "darts",
      sportConfig: {
        best_of: 3,
        points_to: 1,
        win_by: 1,
        round_formats: {
          final: { best_of: 5, points_to: 1, win_by: 1, legs_to_win: 5 },
        },
      },
      stageType: "knockout",
      round: 3,
      maxRound: 3,
    }),
    { best_of: 5, points_to: 1, win_by: 1, legs_to_win: 5 },
  );
});

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

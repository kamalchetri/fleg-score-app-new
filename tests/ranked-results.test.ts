/**
 * Ranked results stay local. They do not create entrants or brackets.
 * Run with: npx tsx tests/ranked-results.test.ts
 */

import {
  confirmRankedAction,
  formatStoredValue,
  parseRankedRules,
  parseResultInput,
  projectRankedBoard,
  reviewRankedDraft,
  undoRankedAction,
  type RankedBoard,
  type RankedRules,
} from "../lib/ranked-results/engine";
import { RANKED_LAB_FIXTURES } from "../lib/ranked-results/fixtures";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (error: unknown) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

function expectEq<T>(actual: T, expected: T, label = ""): void {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) throw new Error(`${label ? label + ": " : ""}expected ${right}, got ${left}`);
}

const timeRules = rules({
  mode: "time",
  unit: "ms",
  maxAttempts: 1,
  aggregation: "final",
  qualifierCount: 2,
  tiePolicy: "shared_rank",
  allowedStatuses: ["DNS", "DNF", "DSQ"],
  maxValue: 120000,
});

const distanceRules = rules({
  mode: "distance",
  unit: "mm",
  maxAttempts: 3,
  aggregation: "best",
  qualifierCount: null,
  tiePolicy: "shared_rank",
  allowedStatuses: [],
  maxValue: 20000,
});

const pointsRules = rules({
  mode: "points",
  unit: "points",
  maxAttempts: 1,
  aggregation: "final",
  qualifierCount: 2,
  tiePolicy: "shared_rank",
  allowedStatuses: [],
  maxValue: 100,
});

function rules(input: unknown): RankedRules {
  const parsed = parseRankedRules(input);
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.rules;
}

function board(ids: string[], actions: RankedBoard["actions"] = []): RankedBoard {
  return {
    entrants: ids.map((id) => ({ id, name: id, district: "Lab" })),
    actions,
  };
}

test("time, distance, and points rank in the configured direction", () => {
  const times = projectRankedBoard(timeRules, board(["a", "b", "c"], [
    { kind: "attempt", entrantId: "a", value: 11000 },
    { kind: "attempt", entrantId: "b", value: 10230 },
    { kind: "attempt", entrantId: "c", value: 11880 },
  ]));
  expectEq(times.rows.map((row) => row.entrantId), ["b", "a", "c"]);
  expectEq(times.rows.map((row) => row.rank), [1, 2, 3]);

  const distances = projectRankedBoard(distanceRules, board(["a", "b", "c"], [
    { kind: "attempt", entrantId: "a", value: 6100 },
    { kind: "attempt", entrantId: "b", value: 6450 },
    { kind: "attempt", entrantId: "c", value: 6200 },
  ]));
  expectEq(distances.rows.map((row) => row.entrantId), ["b", "c", "a"]);

  const points = projectRankedBoard(pointsRules, board(["a", "b", "c"], [
    { kind: "attempt", entrantId: "a", value: 70 },
    { kind: "attempt", entrantId: "b", value: 90 },
    { kind: "attempt", entrantId: "c", value: 80 },
  ]));
  expectEq(points.rows.map((row) => row.entrantId), ["b", "c", "a"]);
  expectEq(points.createsEntrants, false);
  expectEq(points.createsBracket, false);
});

test("stored integers format back to the same display", () => {
  expectEq(parseResultInput(timeRules, "10.230"), { ok: true, value: 10230 });
  expectEq(formatStoredValue(timeRules, 10230), "10.230");
  expectEq(parseResultInput(timeRules, "1:02.345"), { ok: true, value: 62345 });
  expectEq(formatStoredValue(timeRules, 62345), "1:02.345");
  expectEq(parseResultInput(distanceRules, "6.450"), { ok: true, value: 6450 });
  expectEq(formatStoredValue(distanceRules, 6450), "6.450");
  expectEq(parseResultInput(pointsRules, "86"), { ok: true, value: 86 });
  expectEq(formatStoredValue(pointsRules, 86), "86");
});

test("best attempt is selected in the ranking direction", () => {
  const distance = projectRankedBoard(distanceRules, board(["a"], [
    { kind: "attempt", entrantId: "a", value: 6120 },
    { kind: "attempt", entrantId: "a", value: 6450 },
    { kind: "attempt", entrantId: "a", value: 6330 },
  ]));
  expectEq(distance.rows[0]?.rankedValue, 6450);
  expectEq(distance.rows[0]?.attempts, [6120, 6450, 6330]);

  const timed = projectRankedBoard(
    rules({ ...timeRules, maxAttempts: 3, aggregation: "best", qualifierCount: null }),
    board(["a"], [
      { kind: "attempt", entrantId: "a", value: 12000 },
      { kind: "attempt", entrantId: "a", value: 10990 },
      { kind: "attempt", entrantId: "a", value: 11100 },
    ]),
  );
  expectEq(timed.rows[0]?.rankedValue, 10990);
});

test("shared ranks skip the next place", () => {
  const projected = projectRankedBoard(
    rules({ ...pointsRules, qualifierCount: 3 }),
    board(["a", "b", "c", "d"], [
      { kind: "attempt", entrantId: "a", value: 90 },
      { kind: "attempt", entrantId: "b", value: 90 },
      { kind: "attempt", entrantId: "c", value: 80 },
      { kind: "attempt", entrantId: "d", value: 70 },
    ]),
  );
  expectEq(projected.rows.map((row) => [row.entrantId, row.rank, row.tied, row.qualification]), [
    ["a", 1, true, "qualified"],
    ["b", 1, true, "qualified"],
    ["c", 3, false, "qualified"],
    ["d", 4, false, "not_qualified"],
  ]);
  expectEq(projected.qualificationNote, "clear");
  expectEq(projected.qualifierIds, ["a", "b", "c"]);
});

test("a tie on the qualification boundary selects nobody in the tie", () => {
  const projected = projectRankedBoard(pointsRules, board(["a", "b", "c", "d"], [
    { kind: "attempt", entrantId: "a", value: 95 },
    { kind: "attempt", entrantId: "b", value: 88 },
    { kind: "attempt", entrantId: "c", value: 88 },
    { kind: "attempt", entrantId: "d", value: 76 },
  ]));
  expectEq(projected.rows.map((row) => [row.entrantId, row.rank, row.qualification]), [
    ["a", 1, "qualified"],
    ["b", 2, "unresolved_tie"],
    ["c", 2, "unresolved_tie"],
    ["d", 4, "not_qualified"],
  ]);
  expectEq(projected.qualificationNote, "unresolved_tie");
  expectEq(projected.qualifierIds, ["a"]);
});

test("statuses stay after results and are not scores", () => {
  const projected = projectRankedBoard(timeRules, board(["finish", "absent", "stopped", "excluded"], [
    { kind: "attempt", entrantId: "finish", value: 11240 },
    { kind: "status", entrantId: "stopped", status: "DNF" },
    { kind: "status", entrantId: "excluded", status: "DSQ" },
    { kind: "status", entrantId: "absent", status: "DNS" },
  ]));
  expectEq(projected.rows.map((row) => [row.entrantId, row.rank, row.status, row.rankedValue]), [
    ["finish", 1, null, 11240],
    ["absent", null, "DNS", null],
    ["stopped", null, "DNF", null],
    ["excluded", null, "DSQ", null],
  ]);
});

test("malformed, negative, non-finite, and out-of-range input is rejected", () => {
  expectEq(parseResultInput(timeRules, "").ok, false);
  expectEq(parseResultInput(timeRules, "10.23"), { ok: false, reason: "malformed" });
  expectEq(parseResultInput(timeRules, "-1.000"), { ok: false, reason: "negative" });
  expectEq(parseResultInput(timeRules, "Infinity"), { ok: false, reason: "non_finite" });
  expectEq(parseResultInput(timeRules, "NaN"), { ok: false, reason: "non_finite" });
  expectEq(parseResultInput(pointsRules, "101"), { ok: false, reason: "out_of_range" });
  expectEq(parseResultInput(pointsRules, "10.0"), { ok: false, reason: "malformed" });
  expectEq(parseResultInput(distanceRules, "8.45"), { ok: false, reason: "malformed" });
  const confirmed = confirmRankedAction(pointsRules, board(["a"]), { kind: "attempt", entrantId: "a", value: 10.5 });
  expectEq(confirmed.ok, false);
});

test("review can be edited before confirm, and undo removes only the latest action", () => {
  const initial = board(["a", "b"]);
  const before = JSON.stringify(initial);
  const reviewed = reviewRankedDraft(timeRules, initial, { entrantId: "a", kind: "attempt", raw: "10.230" });
  expectEq(JSON.stringify(initial), before);
  if (!reviewed.ok || reviewed.action.kind !== "attempt") throw new Error("review did not accept 10.230");
  expectEq(reviewed.summary.includes("10.230"), true);
  const edited = reviewRankedDraft(timeRules, initial, { entrantId: "a", kind: "attempt", raw: "10.480" });
  if (!edited.ok || edited.action.kind !== "attempt") throw new Error("edit did not accept 10.480");
  const first = confirmRankedAction(timeRules, initial, edited.action);
  if (!first.ok) throw new Error(first.reason);
  const second = confirmRankedAction(timeRules, first.board, { kind: "attempt", entrantId: "b", value: 11100 });
  if (!second.ok) throw new Error(second.reason);
  const undone = undoRankedAction(second.board);
  expectEq(undone?.actions, [{ kind: "attempt", entrantId: "a", value: 10480 }]);
  expectEq(undoRankedAction(board(["a"])), null);
});

test("missing or contradictory rules fail closed", () => {
  expectEq(parseRankedRules({}).ok, false);
  expectEq(parseRankedRules(null).ok, false);
  expectEq(parseRankedRules({ mode: "time" }).ok, false);
  expectEq(parseRankedRules({ ...timeRules, unit: "seconds" }).ok, false);
  expectEq(parseRankedRules({ ...timeRules, tiePolicy: "countback" }).ok, false);
  expectEq(parseRankedRules({ ...timeRules, aggregation: "final", maxAttempts: 3 }).ok, false);
  expectEq(parseRankedRules({ ...timeRules, qualifierCount: 0 }).ok, false);
  expectEq(parseRankedRules({ ...timeRules, allowedStatuses: ["WD"] }).ok, false);
  expectEq(parseRankedRules({ ...pointsRules, allowedStatuses: ["DNS"] }).ok, true);
  const blocked = reviewRankedDraft(pointsRules, board(["a"]), { entrantId: "a", kind: "status", status: "DNS" });
  expectEq(blocked, { ok: false, reason: "status_not_allowed" });
});

test("lab fixtures stay synthetic and do not seed a bracket", () => {
  const ids = RANKED_LAB_FIXTURES.map((fixture) => fixture.id);
  expectEq(ids, [
    "lab-sprint",
    "lab-distance",
    "lab-points",
    "lab-tie-clear",
    "lab-tie-cut",
    "lab-status",
    "lab-invalid",
    "lab-names",
    "lab-final",
  ]);
  for (const fixture of RANKED_LAB_FIXTURES) {
    const parsed = parseRankedRules(fixture.rules);
    if (fixture.id === "lab-invalid") {
      expectEq(parsed.ok, false);
      continue;
    }
    if (!parsed.ok) throw new Error(`${fixture.id} ${parsed.reason}`);
    const projected = projectRankedBoard(parsed.rules, { entrants: fixture.entrants, actions: fixture.actions });
    expectEq(projected.createsEntrants, false);
    expectEq(projected.createsBracket, false);
    expectEq(JSON.stringify(projected).includes("olympic"), false);
  }
  const cut = RANKED_LAB_FIXTURES.find((fixture) => fixture.id === "lab-tie-cut");
  const parsedCut = parseRankedRules(cut?.rules);
  if (!cut || !parsedCut.ok) throw new Error("cut fixture");
  const projectedCut = projectRankedBoard(parsedCut.rules, { entrants: cut.entrants, actions: cut.actions });
  expectEq(projectedCut.qualificationNote, "unresolved_tie");
  expectEq(projectedCut.qualifierIds, ["lab-cut-1"]);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

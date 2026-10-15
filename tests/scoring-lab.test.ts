/**
 * Scoring lab fixtures stay local and exercise the real projection.
 * Run with: npx tsx tests/scoring-lab.test.ts
 */

import { projectMatchState, matchEngine } from "../lib/scoring/project-match";
import { SCORING_LAB_FIXTURES } from "../lib/scoring-lab/fixtures";

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

function expect(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

test("lab fixtures are local ids and cover the scoring cases", () => {
  const ids = SCORING_LAB_FIXTURES.map((item) => item.id);
  for (const id of [
    "football",
    "basketball",
    "badminton",
    "pickleball",
    "darts",
    "combat",
    "combat-points",
    "combat-method",
    "table-tennis",
    "table-tennis-unconfigured",
    "table-tennis-invalid",
    "tennis-game",
    "tennis-deuce",
    "tennis-tiebreak",
    "tennis-deciding",
    "tennis-done",
    "tennis-rules",
    "tennis-names",
    "volleyball-set",
    "volleyball-deuce",
    "volleyball-deciding",
    "volleyball-cap",
    "volleyball-done",
    "volleyball-rules",
    "volleyball-names",
    "takraw-set",
    "takraw-deuce",
    "takraw-deciding",
    "takraw-cap",
    "takraw-done",
    "takraw-rules",
    "takraw-names",
    "archery-set",
    "archery-total",
    "archery-review",
    "archery-tie",
    "archery-shootoff",
    "archery-done",
    "archery-rules",
    "archery-recurve-preset",
    "archery-compound-preset",
    "takraw-regu-preset",
    "archery-ranking",
    "archery-names",
    "artistic",
    "ranked",
  ]) {
    expect(ids.includes(id), `missing ${id}`);
  }
  for (const fixture of SCORING_LAB_FIXTURES) {
    expect(fixture.match.id.startsWith("lab-match-"), fixture.id);
    expect(fixture.match.tournament?.id === "lab-tournament", fixture.id);
  }
});

test("every lab fixture projects without a network", () => {
  for (const fixture of SCORING_LAB_FIXTURES) {
    const engine = matchEngine(fixture.match);
    const state = projectMatchState(fixture.match, fixture.events);
    if (fixture.id === "table-tennis-unconfigured") {
      expect(engine === "table_tennis", "singles without stored rules still routes to table tennis");
      expect(
        state?.detail.sport === "table_tennis" && state.detail.pointsTo === 11 && state.detail.cap === null,
        "empty table tennis uses the standard preset",
      );
    } else if (fixture.id === "table-tennis-invalid") {
      expect(engine === "table_tennis", "invalid table tennis still routes");
      expect(state === null, "invalid table tennis rules stay closed");
    } else if (fixture.id === "tennis-rules") {
      expect(engine === "lawn_tennis", "singles without rules still routes to lawn tennis");
      expect(state === null, "missing lawn tennis rules do not invent a score");
    } else if (fixture.id === "volleyball-rules") {
      expect(engine === "volleyball", "volleyball without stored rules still routes to volleyball");
      expect(
        state?.detail.sport === "volleyball" &&
          state.detail.pointsTo === 25 &&
          state.detail.cap === null &&
          state.detail.setsNeeded === 3,
        "empty volleyball uses the standard preset",
      );
    } else if (fixture.id === "takraw-rules") {
      expect(engine === "sepaktakraw", "sepaktakraw without rules still routes to sepaktakraw");
      expect(state === null, "missing sepaktakraw rules do not invent a score");
    } else if (fixture.id === "archery-rules") {
      expect(engine === "archery", "archery without a bow type still routes to archery");
      expect(state === null, "archery without recurve or compound does not invent a format");
    } else if (fixture.id === "archery-recurve-preset") {
      expect(state?.detail.sport === "archery" && state.detail.format === "set_points", "recurve preset");
    } else if (fixture.id === "archery-compound-preset") {
      expect(state?.detail.sport === "archery" && state.detail.format === "cumulative", "compound preset");
    } else if (fixture.id === "takraw-regu-preset") {
      expect(
        state?.detail.sport === "sepaktakraw" && state.detail.pointsTo === 21 && state.detail.cap === 25,
        "regu preset",
      );
    } else if (fixture.id === "archery-ranking" || fixture.id === "artistic" || fixture.id === "ranked") {
      expect(engine === null, `${fixture.id} should stay unsupported`);
      expect(state === null, `${fixture.id} should not score`);
    } else {
      expect(state !== null, `${fixture.id} should project`);
    }
  }
  const points = SCORING_LAB_FIXTURES.find((item) => item.id === "combat-points");
  const method = SCORING_LAB_FIXTURES.find((item) => item.id === "combat-method");
  const table = SCORING_LAB_FIXTURES.find((item) => item.id === "table-tennis");
  const pointsState = projectMatchState(points!.match, points!.events);
  const methodState = projectMatchState(method!.match, method!.events);
  const tableState = projectMatchState(table!.match, table!.events);
  expect(pointsState?.detail.sport === "combat" && pointsState.detail.result?.pointsA === 12, "combat points");
  expect(methodState?.detail.sport === "combat" && methodState.detail.result?.pointsA === null, "combat method");
  expect(tableState?.detail.sport === "table_tennis" && tableState.detail.completedGames.length === 1, "table tennis summary");
  expect(matchEngine(SCORING_LAB_FIXTURES[0].match) === "futsal", "football uses the futsal engine");
  const tiebreak = SCORING_LAB_FIXTURES.find((item) => item.id === "tennis-tiebreak");
  const deciding = SCORING_LAB_FIXTURES.find((item) => item.id === "tennis-deciding");
  const done = SCORING_LAB_FIXTURES.find((item) => item.id === "tennis-done");
  const tiebreakState = projectMatchState(tiebreak!.match, tiebreak!.events);
  const decidingState = projectMatchState(deciding!.match, deciding!.events);
  const doneState = projectMatchState(done!.match, done!.events);
  expect(tiebreakState?.detail.sport === "lawn_tennis" && tiebreakState.detail.inTiebreak, "regular-set tiebreak");
  expect(decidingState?.detail.sport === "lawn_tennis" && decidingState.detail.decidingSet, "deciding set");
  expect(doneState?.isComplete === true && doneState.winnerSide === "a", "completed lawn tennis match");
  const volleyCap = SCORING_LAB_FIXTURES.find((item) => item.id === "volleyball-cap");
  const volleyDeciding = SCORING_LAB_FIXTURES.find((item) => item.id === "volleyball-deciding");
  const volleyDone = SCORING_LAB_FIXTURES.find((item) => item.id === "volleyball-done");
  const capState = projectMatchState(volleyCap!.match, volleyCap!.events);
  const decidingVolley = projectMatchState(volleyDeciding!.match, volleyDeciding!.events);
  const doneVolley = projectMatchState(volleyDone!.match, volleyDone!.events);
  expect(
    capState?.detail.sport === "volleyball" && capState.detail.completedSets[0]?.a === 27,
    "capped volleyball set",
  );
  expect(
    decidingVolley?.detail.sport === "volleyball" && decidingVolley.detail.decidingSet,
    "volleyball deciding set",
  );
  expect(doneVolley?.isComplete === true && doneVolley.winnerSide === "a", "completed volleyball match");
  const takrawCap = SCORING_LAB_FIXTURES.find((item) => item.id === "takraw-cap");
  const takrawDeciding = SCORING_LAB_FIXTURES.find((item) => item.id === "takraw-deciding");
  const takrawDone = SCORING_LAB_FIXTURES.find((item) => item.id === "takraw-done");
  const takrawDouble = SCORING_LAB_FIXTURES.find((item) => item.id === "takraw-deuce");
  const capTakraw = projectMatchState(takrawCap!.match, takrawCap!.events);
  const decidingTakraw = projectMatchState(takrawDeciding!.match, takrawDeciding!.events);
  const doneTakraw = projectMatchState(takrawDone!.match, takrawDone!.events);
  expect(matchEngine(takrawDouble!.match) === "sepaktakraw", "Double still uses the sepaktakraw engine");
  expect(
    capTakraw?.detail.sport === "sepaktakraw" && capTakraw.detail.completedSets[0]?.a === 25,
    "capped sepaktakraw set",
  );
  expect(
    decidingTakraw?.detail.sport === "sepaktakraw" && decidingTakraw.detail.decidingSet,
    "sepaktakraw deciding set",
  );
  expect(doneTakraw?.isComplete === true && doneTakraw.winnerSide === "a", "completed sepaktakraw match");
  const archeryTie = SCORING_LAB_FIXTURES.find((item) => item.id === "archery-tie");
  const archeryShoot = SCORING_LAB_FIXTURES.find((item) => item.id === "archery-shootoff");
  const archeryDone = SCORING_LAB_FIXTURES.find((item) => item.id === "archery-done");
  const archeryReview = SCORING_LAB_FIXTURES.find((item) => item.id === "archery-review");
  const tieState = projectMatchState(archeryTie!.match, archeryTie!.events);
  const shootState = projectMatchState(archeryShoot!.match, archeryShoot!.events);
  const doneArchery = projectMatchState(archeryDone!.match, archeryDone!.events);
  expect(archeryReview?.archeryDraft?.reviewing === true, "review fixture opens on the review step");
  expect(
    tieState?.detail.sport === "archery" && tieState.detail.shootOffRequired && !tieState.isComplete,
    "archery regulation tie",
  );
  expect(
    shootState?.detail.sport === "archery" &&
      shootState.isComplete &&
      shootState.winnerSide === "a" &&
      shootState.detail.shootOff?.scoreA === 9 &&
      shootState.detail.shootOff.scoreB === 9,
    "completed archery shoot-off",
  );
  expect(
    doneArchery?.detail.sport === "archery" && doneArchery.isComplete && doneArchery.detail.completedEnds.length === 2,
    "completed archery match ignores a later end",
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

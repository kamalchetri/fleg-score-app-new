import { getOrganiserPersistence } from "../lib/organiser-persistence";
import { disciplineForTournament, seedScoringMatch } from "../lib/nspg-organiser";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => Promise<void>): void { fn().then(() => { console.log(`  ✓  ${name}`); passed++; }).catch((error) => { console.error(`  ✗  ${name}`); console.error(error); failed++; }); }

test("seed adapter never publishes", async () => {
  const result = await getOrganiserPersistence("seed").publish({} as never);
  if (result.published || result.reason !== "production_persistence_disabled") throw new Error("seed publish should be disabled");
});
test("production adapter fails closed before deployment", async () => {
  let failedClosed = false;
  try { await getOrganiserPersistence("production").saveDraft({} as never); } catch (error) { failedClosed = error instanceof Error && error.message === "organiser_persistence_not_deployed"; }
  if (!failedClosed) throw new Error("production adapter must fail closed");
});
test("general FLEG sports resolve to their own organiser pads", async () => {
  if (disciplineForTournament("fleg-futsal-open") !== "futsal") throw new Error("futsal resolver drifted");
  if (disciplineForTournament("fleg-pickleball-open") !== "pickleball") throw new Error("pickleball resolver drifted");
  if (seedScoringMatch("futsal-match", "futsal").tournament?.sport !== "futsal") throw new Error("futsal seed pad is wrong");
  if (seedScoringMatch("pickleball-match", "pickleball").tournament?.sport !== "pickleball") throw new Error("pickleball seed pad is wrong");
});

setTimeout(() => { if (failed > 0) process.exit(1); console.log(`${passed} passed, ${failed} failed`); }, 0);

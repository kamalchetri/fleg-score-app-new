import { applyHarnessMutation, publishHarness, type HarnessState } from "../lib/organiser-harness";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void): void { try { fn(); console.log(`  ✓  ${name}`); passed++; } catch (error) { console.error(`  ✗  ${name}`); console.error(error); failed++; } }
const base: HarnessState = { draft: { name: "NSPG Football", sport: "football", venue: "Stadium", city: "Kohima", approvedEntrants: 8, fixtureCount: 1, unscheduledFixtures: 0, unassignedReferees: 0, rulesConfigured: true, rankedRulesConfigured: false, usesRankedResults: false, productionPersistenceEnabled: true }, appliedKeys: new Set(), revision: 0 };

test("failed publish does not mutate state", () => { const blocked = applyHarnessMutation(base, { type: "set_schedule", count: 1 }); try { publishHarness(blocked); throw new Error("expected publish to fail"); } catch (error) { if (!(error instanceof Error) || !error.message.startsWith("publish_blocked:")) throw error; } if (base.draft.unscheduledFixtures !== 0) throw new Error("base state changed"); });
test("fixture key is idempotent", () => { const once = applyHarnessMutation(base, { type: "add_fixture", key: "submission:category" }); const twice = applyHarnessMutation(once, { type: "add_fixture", key: "submission:category" }); if (twice.draft.fixtureCount !== once.draft.fixtureCount) throw new Error("duplicate fixture added"); });
test("valid draft publishes as a new revision", () => { const result = publishHarness(base); if (result.revision !== 1) throw new Error("revision not advanced"); });

if (failed > 0) process.exit(1);
console.log(`${passed} passed, ${failed} failed`);

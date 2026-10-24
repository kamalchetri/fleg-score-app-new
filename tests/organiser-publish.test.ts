import { validatePublishDraft } from "../lib/organiser-publish";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void): void { try { fn(); console.log(`  ✓  ${name}`); passed++; } catch (error) { console.error(`  ✗  ${name}`); console.error(error); failed++; } }
function expect(value: boolean, message: string): void { if (!value) throw new Error(message); }

const ready = { name: "NSPG Football", sport: "football", venue: "Stadium", city: "Kohima", approvedEntrants: 8, fixtureCount: 12, unscheduledFixtures: 0, unassignedReferees: 0, rulesConfigured: true, rankedRulesConfigured: false, usesRankedResults: false, productionPersistenceEnabled: true };

test("complete draft is publishable", () => expect(validatePublishDraft(ready).ok, "expected publishable"));
test("missing venue fails closed", () => expect(validatePublishDraft({ ...ready, venue: null }).failures.includes("missing_venue_or_city"), "venue should be required"));
test("unfinished fixtures fail closed", () => expect(validatePublishDraft({ ...ready, unscheduledFixtures: 1 }).failures.includes("fixtures_unscheduled"), "schedule should be required"));
test("ranked sports require ranked rules", () => expect(validatePublishDraft({ ...ready, usesRankedResults: true }).failures.includes("ranked_rules_not_configured"), "ranked rules should be required"));
test("disabled persistence blocks publishing", () => expect(validatePublishDraft({ ...ready, productionPersistenceEnabled: false }).failures.includes("persistence_disabled"), "persistence should block"));

if (failed > 0) process.exit(1);
console.log(`${passed} passed, ${failed} failed`);

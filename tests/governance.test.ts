/**
 * Governance audit log and organizer CSV export.
 * Run with: npx tsx tests/governance.test.ts
 */

import {
  AUDIT_PAGE_SIZE,
  actorLabel,
  appendAuditEvent,
  auditBackupCompleted,
  auditDataExported,
  auditReadPlan,
  formatAuditDetails,
  formatAuditTime,
  humanizeAction,
  isOrganizerRole,
  type AuditAppAction,
  type AuditRpc,
} from "../lib/audit";
import { buildEntrantsCsv, buildResultsCsv, buildStandingsCsv, prepareTournamentExport, type ExportSource } from "../lib/export-csv";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void> | void): Promise<void> | void {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  ✓  ${name}`);
      passed++;
    })
    .catch((error: unknown) => {
      console.error(`  ✗  ${name}`);
      console.error(`     ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    });
}

function expectEq<T>(actual: T, expected: T, label = ""): void {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) throw new Error(`${label ? label + ": " : ""}expected ${right}, got ${left}`);
}

const source: ExportSource = {
  tournament: { id: "tour-1", name: "Hill Games", sport_config: { table_points: { win: 3, draw: 1, loss: 0 } } },
  categories: [{ id: "cat-1", name: "Athletics 100m" }],
  entrants: [
    { id: "a", display_name: 'Ada "Ace", Kire', seed: 1, status: "approved", category_id: "cat-1" },
    { id: "b", display_name: "=cmd", seed: null, status: "approved", category_id: "cat-1" },
  ],
  contacts: [
    {
      entrant_id: "a",
      contact_name: "Ada Contact",
      contact_email: "ada@example.com",
      contact_phone: "9000000000",
    },
  ],
  stages: [{ id: "stage-1", category_id: "cat-1", name: "Heat 1", stage_type: "league", config: {} }],
  matches: [
    {
      id: "match-1",
      category_id: "cat-1",
      stage_id: "stage-1",
      round: 1,
      position: 0,
      entrant_a: "a",
      entrant_b: "b",
      winner_id: "a",
      status: "completed",
      score: { a: 2, b: 1, summary: { a: 2, b: 1 }, display: "2–1" },
    },
  ],
};

function rpcRecorder(): { calls: Parameters<AuditRpc>[0][]; rpc: AuditRpc; fail: boolean } {
  const calls: Parameters<AuditRpc>[0][] = [];
  const state = { calls, fail: false, rpc: null as unknown as AuditRpc };
  state.rpc = async (args) => {
    calls.push(args);
    if (state.fail) return { data: null, error: { message: "not_tournament_staff" } };
    return { data: 41, error: null };
  };
  return state;
}

async function main(): Promise<void> {
  await test("actions and details are readable and omit contact fields", () => {
    expectEq(humanizeAction("event_published"), "Event Published");
    expectEq(humanizeAction("result_finalized"), "Result Finalized");
    expectEq(humanizeAction("data_exported"), "Data Exported");
    const now = new Date(2026, 9, 13, 15, 0, 0);
    expectEq(formatAuditTime(new Date(2026, 9, 13, 10, 24, 0).toISOString(), now), "Today 10:24");
    expectEq(formatAuditTime(new Date(2026, 9, 12, 10, 24, 0).toISOString(), now), "12 Oct 10:24");
    expectEq(actorLabel(null, new Map()), "System");
    expectEq(actorLabel("abcdef123456", new Map()), "abcdef12");
    expectEq(actorLabel("abcdef123456", new Map([["abcdef123456", "Admin"]])), "Admin");
    expectEq(
      formatAuditDetails({
        label: "Athletics 100m Heat 1",
        from: "live",
        to: "completed",
        role: "scorekeeper",
        format: "csv",
        rows: 4,
        scope: "tournament",
        contact_email: "hidden@example.com",
      }),
      "Athletics 100m Heat 1 · live → completed · scorekeeper · csv · 4 rows · tournament",
    );
    expectEq(formatAuditDetails({ contact_email: "hidden@example.com" }), "");
  });

  await test("audit reads are paged and app writes go through the rpc once", async () => {
    expectEq(
      auditReadPlan({ tournamentId: "tour-1", action: "result_finalized", occurredGte: null, occurredLte: null, page: 1 }),
      {
        tournamentId: "tour-1",
        action: "result_finalized",
        occurredGte: null,
        occurredLte: null,
        rangeFrom: AUDIT_PAGE_SIZE,
        rangeTo: AUDIT_PAGE_SIZE * 2 - 1,
      },
    );
    expectEq(auditReadPlan({ tournamentId: "tour-1", action: "not_an_action", occurredGte: null, occurredLte: null, page: 0 }), null);

    const recorder = rpcRecorder();
    const blocked = await appendAuditEvent(
      {
        tournamentId: "tour-1",
        action: "competition_created" as AuditAppAction,
        entityType: "tournament",
        entityId: "tour-1",
        details: {},
      },
      recorder.rpc,
    );
    expectEq(blocked, { ok: false, message: "bad_action" });
    expectEq(recorder.calls.length, 0);

    const exported = await auditDataExported({ tournamentId: "tour-1", entityType: "entrants", rows: 2 }, recorder.rpc);
    expectEq(exported, { ok: true, id: 41 });
    expectEq(recorder.calls, [
      {
        p_tournament_id: "tour-1",
        p_action: "data_exported",
        p_entity_type: "entrants",
        p_entity_id: "tour-1",
        p_details: { format: "csv", rows: 2, scope: "tournament" },
      },
    ]);

    recorder.fail = true;
    const failedExport = await auditDataExported({ tournamentId: "tour-1", entityType: "results", rows: 1 }, recorder.rpc);
    expectEq(failedExport, { ok: false, message: "not_tournament_staff" });
    expectEq(recorder.calls.length, 2);

    const backup = rpcRecorder();
    const completed = await auditBackupCompleted({ tournamentId: "tour-1" }, backup.rpc);
    expectEq(completed.ok, true);
    expectEq(backup.calls[0]?.p_action, "backup_completed");
    expectEq(backup.calls.length, 1);
  });

  await test("exports are valid csv and contacts stay on the organizer entrants file", () => {
    expectEq(isOrganizerRole("owner"), true);
    expectEq(isOrganizerRole("co_organizer"), true);
    expectEq(isOrganizerRole("referee"), false);
    expectEq(isOrganizerRole("scorekeeper"), false);
    expectEq(isOrganizerRole(null), false);

    const entrants = buildEntrantsCsv(source);
    expectEq(entrants.rows, 2);
    expectEq(entrants.csv.includes("ada@example.com"), true);
    expectEq(entrants.csv.includes('"Ada ""Ace"", Kire"'), true);
    expectEq(entrants.csv.includes("'=cmd"), true);

    const results = buildResultsCsv(source);
    expectEq(results.rows, 1);
    expectEq(results.csv.split("\n")[0], "category,stage,round,position,entrant_a,entrant_b,status,score_a,score_b,display,winner");
    expectEq(results.csv.includes("ada@example.com"), false);
    expectEq(results.csv.includes("9000000000"), false);
    expectEq(results.csv.includes("Athletics 100m"), true);
    expectEq(results.csv.includes("2–1"), true);

    const standings = buildStandingsCsv(source);
    expectEq(standings.csv.split("\n")[0], "category,stage,rank,entrant,played,won,drawn,lost,score_for,score_against,diff,points");
    expectEq(standings.csv.includes("ada@example.com"), false);
    expectEq(standings.rows, 2);

    expectEq(prepareTournamentExport("entrants", "referee", source), { ok: false, reason: "not_organizer" });
    expectEq(prepareTournamentExport("results", "scorekeeper", source), { ok: false, reason: "not_organizer" });
    const organizer = prepareTournamentExport("entrants", "owner", source);
    if (!organizer.ok) throw new Error("owner export was refused");
    expectEq(organizer.filename, "hill-games-entrants.csv");
    expectEq(organizer.rows, 2);
    expectEq(organizer.csv.includes("contact_email"), true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

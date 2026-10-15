/**
 * Classify an exported read-only NSPG snapshot.
 * Writes a counts report and a gitignored manifest.
 * Does not print manifest rows, does not contact Supabase, and has no apply command.
 *
 *   npx tsx scripts/nspg-dry-run.ts --snapshot .nspg-dry-run/snapshot.json --report docs/nspg-provisioning/DRY-RUN-REPORT.md --manifest .nspg-dry-run/manifest.json
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { classifySnapshot, IMPORT_IDEMPOTENCY_KEY, type NspgSnapshot } from "../lib/nspg-provision/classify";
import { renderDryRunReport } from "../lib/nspg-provision/report";

function argument(flag: string): string {
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`missing ${flag}`);
  return value;
}

const snapshotPath = argument("--snapshot");
const reportPath = argument("--report");
const manifestPath = argument("--manifest");
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as NspgSnapshot;
const result = classifySnapshot(snapshot);
const report = renderDryRunReport(snapshot, result);

mkdirSync(dirname(reportPath), { recursive: true });
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(reportPath, report, "utf8");
writeFileSync(
  manifestPath,
  JSON.stringify({
    inspectedAt: snapshot.inspectedAt,
    idempotencyKey: IMPORT_IDEMPOTENCY_KEY,
    links: result.classified.map((link) => ({
      submissionId: link.submissionId,
      regCategoryId: link.regCategoryId,
      formId: link.formId,
      sport: link.sport,
      categoryName: link.categoryName,
      importClass: link.importClass,
      proposedTournamentSlug: link.proposedTournamentSlug,
      entrantEligible: link.entrantEligible,
    })),
    review: result.review,
  }),
  "utf8",
);

const classTotal = Object.values(result.counts).reduce((sum, value) => sum + value, 0);
console.log(
  [
    `inspected_at=${snapshot.inspectedAt}`,
    `confirmed_submissions=${result.confirmedSubmissions}`,
    `confirmed_links=${result.confirmedLinks}`,
    `class_total=${classTotal}`,
    `classified_once=${result.classifiedOnce}`,
    `unknown_categories=${result.unknownCategories.length}`,
    `duplicate_pairs=${result.duplicatePairs}`,
    `cross_form_links=${result.crossFormLinks}`,
    `tournament_collisions=${result.tournamentCollisions.length}`,
    `review_rows=${result.review.length}`,
    `manifest_written=yes`,
    `safe_to_apply_production=no`,
  ].join("\n"),
);

import { IMPORT_CLASSES, type ClassificationResult, type ImportClass, type NspgSnapshot } from "./classify";
import { OCTOBER_11_BASELINE } from "./historical";

function delta(current: number, previous: number): string {
  const diff = current - previous;
  if (diff === 0) return "0";
  return diff > 0 ? `+${diff}` : String(diff);
}

function classRows(counts: Record<ImportClass, number>, previous: Record<ImportClass, number>): string {
  const labels: Record<ImportClass, string> = {
    auto_importable_singles: "Auto-importable singles",
    pending_qualification: "Archery qualification pending",
    ranked_result: "Ranked-result event",
    district_roster: "District/team/squad roster required",
    unlinked_pair: "Unlinked doubles/mixed doubles",
    artistic_ensemble: "Artistic ensemble",
    multi_weight_conflict: "Multi-weight conflict",
    other_unresolved: "Other unresolved",
  };
  return IMPORT_CLASSES.map(
    (name) => `| ${labels[name]} | ${counts[name]} | ${previous[name]} | ${delta(counts[name], previous[name])} |`,
  ).join("\n");
}

/** Counts and checks only. This string must not include submission identifiers. */
export function renderDryRunReport(snapshot: NspgSnapshot, result: ClassificationResult): string {
  const classTotal = IMPORT_CLASSES.reduce((sum, name) => sum + result.counts[name], 0);
  const previousClassTotal = IMPORT_CLASSES.reduce((sum, name) => sum + OCTOBER_11_BASELINE.classes[name], 0);
  const competitionFormIds = new Set(
    snapshot.forms.filter((form) => form.slug.toLowerCase().startsWith("nspg26-") && form.sport !== "officials").map((form) => form.id),
  );
  const withdrawn = snapshot.submissions.filter(
    (submission) => submission.status === "withdrawn" && competitionFormIds.has(submission.formId),
  ).length;
  const categoriesWithLinks = new Set(result.byCategory.map((row) => `${row.sport}:${row.category}`)).size;
  const checksPassed =
    result.classifiedOnce &&
    classTotal === result.confirmedLinks &&
    result.unknownCategories.length === 0 &&
    result.duplicatePairs === 0 &&
    result.crossFormLinks === 0 &&
    result.tournamentCollisions.length === 0;

  const sportRows = result.bySport
    .map((row) => {
      const previous = OCTOBER_11_BASELINE.bySport[row.sport] ?? { people: 0, links: 0 };
      return `| ${row.sport} | ${row.people} | ${delta(row.people, previous.people)} | ${row.links} | ${delta(row.links, previous.links)} | ${row.auto_importable_singles} | ${row.pending_qualification} | ${row.ranked_result} | ${row.district_roster} | ${row.unlinked_pair} | ${row.artistic_ensemble} | ${row.multi_weight_conflict} | ${row.other_unresolved} |`;
    })
    .join("\n");

  const categoryRows = result.byCategory
    .map((row) => `| ${row.sport} | ${row.category} | ${row.importClass} | ${row.links} |`)
    .join("\n");

  return `# NSPG provisioning dry run

Read-only classification. Nothing was inserted, updated, or deleted.

## Inspection

| Item | Value |
| --- | --- |
| Inspected at | ${snapshot.inspectedAt} |
| Baseline | ${OCTOBER_11_BASELINE.label} |
| Confirmed submissions | ${result.confirmedSubmissions} (${delta(result.confirmedSubmissions, OCTOBER_11_BASELINE.confirmedSubmissions)} from ${OCTOBER_11_BASELINE.confirmedSubmissions}) |
| Confirmed links | ${result.confirmedLinks} (${delta(result.confirmedLinks, OCTOBER_11_BASELINE.confirmedLinks)} from ${OCTOBER_11_BASELINE.confirmedLinks}) |
| Withdrawn submissions in the snapshot | ${withdrawn} (baseline ${OCTOBER_11_BASELINE.withdrawnSubmissions}) |
| Prior import-link rows | ${snapshot.importLinks.length} |
| Existing entrant rows seen | ${snapshot.entrants.length} |
| Officials links excluded | ${result.officialsExcluded} |

## Classification

Each confirmed competition link is in one class. Class total ${classTotal}. Baseline class total ${previousClassTotal}.

| Class | Now | 11 Oct | Change |
| --- | ---: | ---: | ---: |
${classRows(result.counts, OCTOBER_11_BASELINE.classes)}
| **Total** | **${classTotal}** | **${previousClassTotal}** | **${delta(classTotal, previousClassTotal)}** |

## Sport

| Sport | People | People change | Links | Links change | Auto | Qualification | Ranked | Roster | Pair | Artistic | Multi-weight | Other |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${sportRows}

## Category

Categories with at least one confirmed link: ${categoriesWithLinks}. Registration categories in the snapshot: ${snapshot.categories.length}. A category can appear twice when different submissions in that category fall into different classes.

| Sport | Category | Class | Links |
| --- | --- | --- | ---: |
${categoryRows}

## Candidate manifest

Confirmed auto-importable singles: ${result.counts.auto_importable_singles}. Those are the only rows an approved manifest may contain.

Blocked confirmed links: ${result.confirmedLinks - result.counts.auto_importable_singles}. Withdrawn submissions: ${withdrawn}. These stay in the snapshot and in the tables above. They are not candidates, and they are not written as entrants or linkage rows. A blocked or withdrawn row placed in the manifest aborts the whole import.

## Checks

| Check | Result |
| --- | --- |
| Every confirmed link classified once | ${result.classifiedOnce ? "yes" : "no"} |
| Class counts sum to confirmed links | ${classTotal === result.confirmedLinks ? "yes" : "no"} |
| Duplicate category links | ${result.duplicatePairs} |
| Cross-form links | ${result.crossFormLinks} |
| Unknown categories | ${result.unknownCategories.length === 0 ? "none" : result.unknownCategories.join(", ")} |
| Proposed slug collisions | ${result.tournamentCollisions.length === 0 ? "none" : result.tournamentCollisions.join(", ")} |
| Multi-weight submissions | ${result.multiWeightSubmissions} |
| Dry-run checks passed | ${checksPassed ? "yes" : "no"} |
| Safe to apply on production | no |

Production apply stays blocked. The organizer, sport-check change, dates, roster, pairing, and weight-class decisions are still unresolved. Registration rows stay immutable.
`;
}

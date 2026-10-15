/**
 * NSPG import classifier. Synthetic identifiers only.
 * Run with: npx tsx tests/nspg-provision.test.ts
 */

import {
  classifyCategory,
  classifySnapshot,
  IMPORT_IDEMPOTENCY_KEY,
  type NspgSnapshot,
  type SnapshotCategory,
  type SnapshotForm,
  type SnapshotLink,
  type SnapshotSubmission,
} from "../lib/nspg-provision/classify";
import {
  APPLY_ACKNOWLEDGEMENT,
  evaluateImportGate,
  ImportGateError,
  LOCAL_PROJECT_REF,
  type ImportGateInput,
} from "../lib/nspg-provision/gate";
import { canonicalSnapshotText, registrationDigest, sha256Hex } from "../lib/nspg-provision/hash";
import {
  assessManifest,
  classifyRegistration,
  type CandidateCheck,
  type ManifestRecord,
  type SnapshotCounts,
} from "../lib/nspg-provision/manifest";

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

function snapshot(overrides: Partial<NspgSnapshot> = {}): NspgSnapshot {
  return {
    inspectedAt: "2026-10-12T00:00:00Z",
    forms: [],
    categories: [],
    submissions: [],
    links: [],
    tournaments: [],
    entrants: [],
    importLinks: [],
    ...overrides,
  };
}

test("idempotency key is one category link", () => {
  expectEq([...IMPORT_IDEMPOTENCY_KEY], ["submissionId", "regCategoryId"]);
});

test("racket singles stay importable beside doubles", () => {
  expectEq(classifyCategory("badminton", "Men's Singles", 0), "auto_importable_singles");
  expectEq(classifyCategory("table_tennis", "Mixed Doubles", 0), "unlinked_pair");
  expectEq(classifyCategory("lawn_tennis", "Men's Singles", 0), "auto_importable_singles");
});

test("sepaktakraw Double is a squad", () => {
  expectEq(classifyCategory("sepaktakraw", "Men - Double", 0), "district_roster");
});

test("pencak tanding can be importable while regu stays blocked", () => {
  expectEq(classifyCategory("pencak_silat", "Men Tanding - Class A (45-50kg)", 1), "auto_importable_singles");
  expectEq(classifyCategory("pencak_silat", "Men Artistic - Regu", 1), "artistic_ensemble");
});

test("one weight class is importable and two are blocked", () => {
  expectEq(classifyCategory("boxing", "Men 48kg", 1), "auto_importable_singles");
  expectEq(classifyCategory("wushu", "Sanda Men 52kg", 2), "multi_weight_conflict");
});

test("archery team is a roster before olympic-round wording", () => {
  expectEq(classifyCategory("archery", "Men Indian Round - Team Olympic Round", 0), "district_roster");
  expectEq(classifyCategory("archery", "Men Indian Round - Individual Olympic Round", 0), "pending_qualification");
  expectEq(classifyCategory("archery", "Men Indian Round - Individual", 0), "ranked_result");
});

test("athletics relay is a roster and an individual event is ranked", () => {
  expectEq(classifyCategory("athletics", "Men 4x100m Relay", 0), "district_roster");
  expectEq(classifyCategory("athletics", "Women 100m", 0), "ranked_result");
});

test("an unknown category name is unresolved", () => {
  expectEq(classifyCategory("badminton", "Exhibition", 0), "other_unresolved");
});

test("officials are excluded and only confirmed links are classified once", () => {
  const result = classifySnapshot(snapshot({
    forms: [
      { id: "form-badminton", slug: "nspg26-badminton", sport: "badminton", status: "published" },
      { id: "form-officials", slug: "nspg26-officials", sport: "officials", status: "published" },
    ],
    categories: [
      { id: "cat-singles", formId: "form-badminton", name: "Men's Singles", sortOrder: 1 },
      { id: "cat-doubles", formId: "form-badminton", name: "Men's Doubles", sortOrder: 2 },
    ],
    submissions: [
      { id: "sub-both", formId: "form-badminton", status: "confirmed" },
      { id: "sub-out", formId: "form-badminton", status: "withdrawn" },
      { id: "sub-held", formId: "form-badminton", status: "pending" },
      { id: "sub-official", formId: "form-officials", status: "confirmed" },
    ],
    links: [
      { submissionId: "sub-both", categoryId: "cat-singles" },
      { submissionId: "sub-both", categoryId: "cat-doubles" },
      { submissionId: "sub-both", categoryId: "cat-singles" },
      { submissionId: "sub-out", categoryId: "cat-singles" },
      { submissionId: "sub-held", categoryId: "cat-singles" },
      { submissionId: "sub-official", categoryId: "cat-singles" },
    ],
  }));
  expectEq(result.officialsExcluded, 1);
  expectEq(result.duplicatePairs, 1);
  expectEq(result.confirmedLinks, 2);
  expectEq(result.classifiedOnce, true);
  expectEq(result.counts.auto_importable_singles, 1);
  expectEq(result.counts.unlinked_pair, 1);
  expectEq(result.classified.filter((link) => link.entrantEligible).length, 1);
  expectEq(
    result.review.map((item) => item.reason).sort(),
    ["duplicate_link", "status_changed", "withdrawn"],
  );
  expectEq(result.safeToApplyProduction, false);
});

test("a missing category is unresolved once and is not counted as a weight", () => {
  const result = classifySnapshot(snapshot({
    forms: [{ id: "form-boxing", slug: "nspg26-boxing", sport: "boxing", status: "published" }],
    categories: [{ id: "cat-48", formId: "form-boxing", name: "Men 48kg", sortOrder: 1 }],
    submissions: [{ id: "sub-one", formId: "form-boxing", status: "confirmed" }],
    links: [
      { submissionId: "sub-one", categoryId: "cat-48" },
      { submissionId: "sub-one", categoryId: "missing-category" },
    ],
  }));
  expectEq(result.counts.auto_importable_singles, 1);
  expectEq(result.counts.other_unresolved, 1);
  expectEq(result.unknownCategories, ["Unknown category"]);
  expectEq(result.multiWeightSubmissions, 0);
});

test("two weights on one submission block both links", () => {
  const result = classifySnapshot(snapshot({
    forms: [{ id: "form-boxing", slug: "nspg26-boxing", sport: "boxing", status: "published" }],
    categories: [
      { id: "cat-48", formId: "form-boxing", name: "Men 48kg", sortOrder: 1 },
      { id: "cat-52", formId: "form-boxing", name: "Men 52kg", sortOrder: 2 },
    ],
    submissions: [{ id: "sub-two", formId: "form-boxing", status: "confirmed" }],
    links: [
      { submissionId: "sub-two", categoryId: "cat-48" },
      { submissionId: "sub-two", categoryId: "cat-52" },
    ],
  }));
  expectEq(result.counts.multi_weight_conflict, 2);
  expectEq(result.counts.auto_importable_singles, 0);
  expectEq(result.multiWeightSubmissions, 1);
  expectEq(result.classified.every((link) => link.entrantEligible === false), true);
});

test("a prior link whose submission changed or whose category disappeared is review only", () => {
  const result = classifySnapshot(snapshot({
    forms: [{ id: "form-boxing", slug: "nspg26-boxing", sport: "boxing", status: "published" }],
    categories: [{ id: "cat-48", formId: "form-boxing", name: "Men 48kg", sortOrder: 1 }],
    submissions: [{ id: "sub-old", formId: "form-boxing", status: "withdrawn" }],
    links: [],
    importLinks: [
      { submissionId: "sub-old", regCategoryId: "cat-48", entrantId: "entrant-1" },
      { submissionId: "sub-old", regCategoryId: "cat-gone", entrantId: null },
    ],
  }));
  expectEq(result.confirmedLinks, 0);
  expectEq(
    result.review.map((item) => `${item.regCategoryId}:${item.reason}`).sort(),
    ["cat-48:link_removed", "cat-48:status_changed", "cat-gone:link_removed", "cat-gone:status_changed"],
  );
});

function form(id: string, sport: string): SnapshotForm {
  return { id, slug: `nspg26-${sport.replace(/_/g, "-")}`, sport, status: "published" };
}

function category(id: string, formId: string, name: string): SnapshotCategory {
  return { id, formId, name, sortOrder: 1 };
}

function submission(id: string, formId: string, status: string): SnapshotSubmission {
  return { id, formId, status };
}

function link(submissionId: string, categoryId: string): SnapshotLink {
  return { submissionId, categoryId };
}

function mixedSnapshot(): NspgSnapshot {
  return snapshot({
    forms: [
      form("form-badminton", "badminton"),
      form("form-sepak", "sepaktakraw"),
      form("form-pencak", "pencak_silat"),
      form("form-boxing", "boxing"),
      form("form-archery", "archery"),
      form("form-athletics", "athletics"),
      form("form-officials", "officials"),
    ],
    categories: [
      category("cat-singles", "form-badminton", "Men's Singles"),
      category("cat-doubles", "form-badminton", "Men's Doubles"),
      category("cat-exhibition", "form-badminton", "Exhibition"),
      category("cat-sepak", "form-sepak", "Men - Double"),
      category("cat-tanding", "form-pencak", "Men Tanding - Class A (45-50kg)"),
      category("cat-regu", "form-pencak", "Men Artistic - Regu"),
      category("cat-48", "form-boxing", "Men 48kg"),
      category("cat-52", "form-boxing", "Men 52kg"),
      category("cat-olympic", "form-archery", "Women Recurve - Individual Olympic Round"),
      category("cat-100", "form-athletics", "Women 100m"),
      category("cat-relay", "form-athletics", "Men 4x100m Relay"),
    ],
    submissions: [
      submission("sub-singles", "form-badminton", "confirmed"),
      submission("sub-sepak", "form-sepak", "confirmed"),
      submission("sub-pencak", "form-pencak", "confirmed"),
      submission("sub-weights", "form-boxing", "confirmed"),
      submission("sub-one", "form-boxing", "confirmed"),
      submission("sub-out", "form-badminton", "withdrawn"),
      submission("sub-unknown", "form-badminton", "confirmed"),
      submission("sub-official", "form-officials", "confirmed"),
      submission("sub-qualify", "form-archery", "confirmed"),
      submission("sub-ranked", "form-athletics", "confirmed"),
      submission("sub-relay", "form-athletics", "confirmed"),
    ],
    links: [
      link("sub-singles", "cat-singles"),
      link("sub-singles", "cat-doubles"),
      link("sub-sepak", "cat-sepak"),
      link("sub-pencak", "cat-tanding"),
      link("sub-pencak", "cat-regu"),
      link("sub-weights", "cat-48"),
      link("sub-weights", "cat-52"),
      link("sub-one", "cat-48"),
      link("sub-out", "cat-singles"),
      link("sub-unknown", "cat-exhibition"),
      link("sub-official", "cat-singles"),
      link("sub-qualify", "cat-olympic"),
      link("sub-ranked", "cat-100"),
      link("sub-relay", "cat-relay"),
    ],
  });
}

function validCheck(overrides: Partial<CandidateCheck> = {}): CandidateCheck {
  return {
    submissionId: "sub-one",
    regCategoryId: "cat-48",
    approvedClass: "auto_importable_singles",
    approvedCategoryName: "Men 48kg",
    liveStatus: "confirmed",
    liveClass: "auto_importable_singles",
    liveCategoryName: "Men 48kg",
    linkPresent: true,
    duplicateInManifest: false,
    duplicateInSnapshot: false,
    crossForm: false,
    crossTournament: false,
    ...overrides,
  };
}

function readyInput(counts: SnapshotCounts, candidates: CandidateCheck[]): ImportGateInput {
  const hash = "a".repeat(64);
  return {
    mode: "apply",
    projectRef: LOCAL_PROJECT_REF,
    snapshotHash: hash,
    liveHash: hash,
    snapshotAt: "2026-10-16T00:00:00.000Z",
    now: "2026-10-16T00:00:00.000Z",
    organizerId: "00000000-0000-4000-8000-0000000000aa",
    organizerExists: true,
    acknowledgement: APPLY_ACKNOWLEDGEMENT,
    expectedSnapshot: counts,
    liveSnapshot: counts,
    candidates,
    expectedCandidates: candidates.length,
    slugCollisions: 0,
    status: "draft",
    visibility: "private",
    allowNullSchedule: true,
  };
}

function evaluateFailure(input: ImportGateInput): string {
  try {
    evaluateImportGate(input);
  } catch (error) {
    return error instanceof ImportGateError ? error.code : "other";
  }
  return "applied";
}

test("a missing or misspelled apply flag cannot write", () => {
  expectEq(evaluateImportGate({}).apply, false);
  expectEq(evaluateImportGate({ mode: "dry-run" }).apply, false);
  expectEq(evaluateFailure({ mode: "APPLY" }), "apply_flag_required");
});

test("apply refuses a wrong project, a stale snapshot, and open registration", () => {
  const counts: SnapshotCounts = {
    submissions: 1, links: 1, withdrawnSubmissions: 0, withdrawnLinks: 0,
    confirmedSubmissions: 1, confirmedLinks: 1, auto: 1, roster: 0, pairs: 0,
    artistic: 0, qualification: 0, ranked: 0, multiWeight: 0, unresolved: 0,
  };
  const ready = readyInput(counts, [validCheck()]);
  expectEq([
    evaluateFailure({ ...ready, projectRef: "zcubdqfzdbwtfcdsntoa" }),
    evaluateFailure({ ...ready, projectRef: "local-fleg-nspg-provisio" }),
    evaluateFailure({ ...ready, acknowledgement: null }),
    evaluateFailure({ ...ready, now: "2026-10-12T00:00:00.000Z", snapshotAt: "2026-10-12T00:00:00.000Z" }),
    evaluateFailure({ ...ready, snapshotAt: "2026-10-15T18:00:00.000Z" }),
    evaluateFailure({ ...ready, expectedSnapshot: { ...counts, auto: 99 } }),
    evaluateFailure({ ...ready, expectedCandidates: 99 }),
    evaluateFailure({ ...ready, organizerExists: false }),
    evaluateFailure({ ...ready, slugCollisions: 1 }),
    evaluateFailure({ ...ready, snapshotHash: "not-a-hash" }),
    evaluateFailure({ ...ready, snapshotHash: "a".repeat(32) }),
    evaluateFailure({ ...ready, snapshotHash: "A".repeat(64) }),
    evaluateFailure({ ...ready, liveHash: "b".repeat(64) }),
    evaluateFailure({ ...ready, allowNullSchedule: false }),
    evaluateFailure({ ...ready, city: "Chümoukedima", allowNullSchedule: false, startsAt: "2026-10-20T00:00:00.000Z", endsAt: "2026-10-21T00:00:00.000Z", venueName: "Hall" }),
  ], [
    "production_project_refused",
    "wrong_project_reference",
    "acknowledgement_required",
    "registration_open",
    "stale_snapshot",
    "snapshot_count_drift",
    "candidate_count_drift",
    "invalid_organizer",
    "slug_collision",
    "malformed_snapshot",
    "malformed_snapshot",
    "malformed_snapshot",
    "snapshot_hash_mismatch",
    "schedule_not_provided",
    "city_not_allowed",
  ]);
  expectEq(evaluateImportGate(ready).apply, true);
});

test("sha256 is the empty-string and abc vectors", () => {
  expectEq(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  expectEq(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("a mixed snapshot imports only its approved auto subset", () => {
  const source = mixedSnapshot();
  const reordered = snapshot({
    ...source,
    forms: [...source.forms].reverse(),
    categories: [...source.categories].reverse(),
    submissions: [...source.submissions].reverse(),
    links: [...source.links].reverse(),
  });
  expectEq(registrationDigest(reordered), registrationDigest(source));
  expectEq(canonicalSnapshotText(source).includes("\r"), false);
  expectEq(canonicalSnapshotText(source).includes("Synthetic"), false);

  const classified = classifyRegistration(source);
  expectEq(classified.counts.auto, 3);
  expectEq(classified.counts.pairs, 1);
  expectEq(classified.counts.roster, 2);
  expectEq(classified.counts.artistic, 1);
  expectEq(classified.counts.multiWeight, 2);
  expectEq(classified.counts.qualification, 1);
  expectEq(classified.counts.ranked, 1);
  expectEq(classified.counts.unresolved, 1);
  expectEq(classified.counts.withdrawnSubmissions, 1);
  expectEq(classified.counts.withdrawnLinks, 1);
  expectEq(classified.candidates.map((row) => row.submissionId).sort(), ["sub-one", "sub-pencak", "sub-singles"]);
  expectEq(classified.candidates.every((row) => row.importClass === "auto_importable_singles"), true);

  const checks = assessManifest(source, classified.candidates);
  const decision = evaluateImportGate({
    ...readyInput(classified.counts, checks),
    snapshotHash: registrationDigest(source),
    liveHash: registrationDigest(source),
  });
  expectEq(decision.apply, true);

  const blocked: ManifestRecord = {
    submissionId: "sub-sepak",
    regCategoryId: "cat-sepak",
    importClass: "district_roster",
    categoryName: "Men - Double",
  };
  expectEq(
    evaluateFailure({
      ...readyInput(classified.counts, assessManifest(source, [...classified.candidates, blocked])),
      snapshotHash: registrationDigest(source),
      liveHash: registrationDigest(source),
    }),
    "blocked_candidate",
  );
});

test("hash changes for every classification-relevant mutation and ignores order", () => {
  const source = mixedSnapshot();
  const base = registrationDigest(source);
  const statusChanged = mixedSnapshot();
  statusChanged.submissions = statusChanged.submissions.map((row) =>
    row.id === "sub-one" ? { ...row, status: "pending" } : row,
  );
  const categoryChanged = mixedSnapshot();
  categoryChanged.categories = categoryChanged.categories.map((row) =>
    row.id === "cat-48" ? { ...row, name: "Men 48kg Changed" } : row,
  );
  const submissionAdded = mixedSnapshot();
  submissionAdded.submissions = [...submissionAdded.submissions, submission("sub-extra", "form-boxing", "confirmed")];
  const linkRemoved = mixedSnapshot();
  linkRemoved.links = linkRemoved.links.filter((row) => row.submissionId !== "sub-ranked");
  const keysReordered = snapshot({
    inspectedAt: source.inspectedAt,
    importLinks: source.importLinks,
    entrants: source.entrants,
    tournaments: source.tournaments,
    links: source.links.map((row) => ({ categoryId: row.categoryId, submissionId: row.submissionId })),
    submissions: source.submissions.map((row) => ({ status: row.status, formId: row.formId, id: row.id })),
    categories: source.categories.map((row) => ({ name: row.name, sortOrder: row.sortOrder, formId: row.formId, id: row.id })),
    forms: source.forms.map((row) => ({ status: row.status, sport: row.sport, slug: row.slug, id: row.id })),
  });
  expectEq(registrationDigest(keysReordered), base);
  expectEq(registrationDigest(statusChanged) === base, false);
  expectEq(registrationDigest(categoryChanged) === base, false);
  expectEq(registrationDigest(submissionAdded) === base, false);
  expectEq(registrationDigest(linkRemoved) === base, false);
});

test("candidate drift aborts and blocked rows stay out of the manifest", () => {
  const source = mixedSnapshot();
  const classified = classifyRegistration(source);
  const approved = classified.candidates;
  const withdrawn = mixedSnapshot();
  withdrawn.submissions = withdrawn.submissions.map((row) =>
    row.id === "sub-one" ? { ...row, status: "withdrawn" } : row,
  );
  expectEq(
    evaluateFailure(readyInput(classifyRegistration(withdrawn).counts, assessManifest(withdrawn, approved))),
    "withdrawn_candidate",
  );

  const secondWeight = mixedSnapshot();
  secondWeight.links = [...secondWeight.links, link("sub-one", "cat-52")];
  expectEq(
    evaluateFailure(readyInput(classifyRegistration(secondWeight).counts, assessManifest(secondWeight, approved))),
    "classification_mismatch",
  );

  const removed = mixedSnapshot();
  removed.links = removed.links.filter((row) => !(row.submissionId === "sub-one" && row.categoryId === "cat-48"));
  expectEq(
    evaluateFailure(readyInput(classifyRegistration(removed).counts, assessManifest(removed, approved))),
    "candidate_link_removed",
  );

  const duplicated = assessManifest(source, [...approved, approved[0]]);
  expectEq(evaluateFailure(readyInput(classified.counts, duplicated)), "duplicate_candidate");
  const crossed = assessManifest(source, [{ ...approved[0], tournamentSlug: "nspg26-volleyball" }]);
  expectEq(evaluateFailure(readyInput(classified.counts, crossed)), "cross_tournament_candidate");
});

test("an existing nspg slug is a collision and production apply stays blocked", () => {
  const result = classifySnapshot(snapshot({
    tournaments: [{ id: "tour-1", slug: "nspg26-boxing", sport: "boxing", status: "draft", visibility: "private" }],
  }));
  expectEq(result.tournamentCollisions, ["nspg26-boxing"]);
  expectEq(result.safeToApplyProduction, false);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

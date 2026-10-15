// Separates the full registration snapshot, its classification report, and the approved candidate manifest.

import {
  classifySnapshot,
  tournamentSlugForSport,
  type ClassificationResult,
  type NspgSnapshot,
} from "./classify";
import { compareUtf8 } from "./hash";

export interface SnapshotCounts {
  submissions: number;
  links: number;
  withdrawnSubmissions: number;
  withdrawnLinks: number;
  confirmedSubmissions: number;
  confirmedLinks: number;
  auto: number;
  roster: number;
  pairs: number;
  artistic: number;
  qualification: number;
  ranked: number;
  multiWeight: number;
  unresolved: number;
}

/** One approved import row. Only `auto_importable_singles` is legal. */
export interface ManifestRecord {
  submissionId: string;
  regCategoryId: string;
  importClass: string;
  categoryName: string;
  tournamentSlug?: string | null;
}

/** Live facts for one manifest row, compared with the approved snapshot. */
export interface CandidateCheck {
  submissionId: string;
  regCategoryId: string;
  approvedClass: string;
  approvedCategoryName: string;
  liveStatus: string | null;
  liveClass: string | null;
  liveCategoryName: string | null;
  linkPresent: boolean;
  duplicateInManifest: boolean;
  duplicateInSnapshot: boolean;
  crossForm: boolean;
  crossTournament: boolean;
}

export interface ClassifiedSnapshot {
  result: ClassificationResult;
  counts: SnapshotCounts;
  candidates: ManifestRecord[];
}

function competitionSubmissionIds(snapshot: NspgSnapshot): Set<string> {
  const forms = new Set(
    snapshot.forms.filter((form) => form.slug.toLowerCase().startsWith("nspg26-") && form.sport !== "officials").map((form) => form.id),
  );
  return new Set(snapshot.submissions.filter((submission) => forms.has(submission.formId)).map((submission) => submission.id));
}

export function snapshotCounts(snapshot: NspgSnapshot, result: ClassificationResult): SnapshotCounts {
  const submissionIds = competitionSubmissionIds(snapshot);
  const submissions = snapshot.submissions.filter((submission) => submissionIds.has(submission.id));
  const withdrawnIds = new Set(submissions.filter((submission) => submission.status === "withdrawn").map((submission) => submission.id));
  const links = snapshot.links.filter((link) => submissionIds.has(link.submissionId));
  return {
    submissions: submissions.length,
    links: links.length,
    withdrawnSubmissions: withdrawnIds.size,
    withdrawnLinks: links.filter((link) => withdrawnIds.has(link.submissionId)).length,
    confirmedSubmissions: result.confirmedSubmissions,
    confirmedLinks: result.confirmedLinks,
    auto: result.counts.auto_importable_singles,
    roster: result.counts.district_roster,
    pairs: result.counts.unlinked_pair,
    artistic: result.counts.artistic_ensemble,
    qualification: result.counts.pending_qualification,
    ranked: result.counts.ranked_result,
    multiWeight: result.counts.multi_weight_conflict,
    unresolved: result.counts.other_unresolved,
  };
}

/** Confirmed auto-importable singles only. Blocked and withdrawn rows stay in the report. */
export function buildAutoManifest(result: ClassificationResult): ManifestRecord[] {
  return result.classified
    .filter((link) => link.importClass === "auto_importable_singles" && link.entrantEligible)
    .map((link) => ({
      submissionId: link.submissionId,
      regCategoryId: link.regCategoryId,
      importClass: link.importClass,
      categoryName: link.categoryName,
      tournamentSlug: link.proposedTournamentSlug,
    }))
    .sort((left, right) => compareUtf8(`${left.submissionId}|${left.regCategoryId}`, `${right.submissionId}|${right.regCategoryId}`));
}

export function classifyRegistration(snapshot: NspgSnapshot): ClassifiedSnapshot {
  const result = classifySnapshot(snapshot);
  return {
    result,
    counts: snapshotCounts(snapshot, result),
    candidates: buildAutoManifest(result),
  };
}

export function assessManifest(snapshot: NspgSnapshot, manifest: readonly ManifestRecord[]): CandidateCheck[] {
  const result = classifySnapshot(snapshot);
  const forms = new Map(snapshot.forms.map((form) => [form.id, form]));
  const categories = new Map(snapshot.categories.map((category) => [category.id, category]));
  const submissions = new Map(snapshot.submissions.map((submission) => [submission.id, submission]));
  const liveClass = new Map(result.classified.map((link) => [`${link.submissionId}|${link.regCategoryId}`, link]));
  const linkCounts = new Map<string, number>();
  for (const link of snapshot.links) {
    const key = `${link.submissionId}|${link.categoryId}`;
    linkCounts.set(key, (linkCounts.get(key) ?? 0) + 1);
  }
  const manifestCounts = new Map<string, number>();
  for (const row of manifest) {
    const key = `${row.submissionId}|${row.regCategoryId}`;
    manifestCounts.set(key, (manifestCounts.get(key) ?? 0) + 1);
  }
  return manifest.map((row) => {
    const key = `${row.submissionId}|${row.regCategoryId}`;
    const submission = submissions.get(row.submissionId);
    const category = categories.get(row.regCategoryId);
    const submissionForm = submission ? forms.get(submission.formId) : undefined;
    const categoryForm = category ? forms.get(category.formId) : undefined;
    const expectedSlug = submissionForm ? tournamentSlugForSport(submissionForm.sport) : null;
    const categorySportDiffers = Boolean(submissionForm && categoryForm && submissionForm.sport !== categoryForm.sport);
    const slugDiffers = Boolean(row.tournamentSlug && expectedSlug && row.tournamentSlug !== expectedSlug);
    return {
      submissionId: row.submissionId,
      regCategoryId: row.regCategoryId,
      approvedClass: row.importClass,
      approvedCategoryName: row.categoryName,
      liveStatus: submission?.status ?? null,
      liveClass: liveClass.get(key)?.importClass ?? null,
      liveCategoryName: category?.name ?? null,
      linkPresent: (linkCounts.get(key) ?? 0) > 0,
      duplicateInManifest: (manifestCounts.get(key) ?? 0) > 1,
      duplicateInSnapshot: (linkCounts.get(key) ?? 0) > 1,
      crossForm: Boolean(submission && category && category.formId !== submission.formId),
      crossTournament: categorySportDiffers || slugDiffers,
    };
  });
}

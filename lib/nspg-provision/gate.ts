// Apply gates for a future local importer. This module does not connect to a database.
// The full snapshot may contain blocked and withdrawn rows. Those rows are counted
// elsewhere and do not, by themselves, refuse an approved auto-importable manifest.

import type { CandidateCheck, SnapshotCounts } from "./manifest";

export const DRY_RUN_MODE = "dry-run";
export const APPLY_MODE = "apply";
export const LOCAL_PROJECT_REF = "local-fleg-nspg-provision";
export const PRODUCTION_PROJECT_REF = "zcubdqfzdbwtfcdsntoa";
export const APPLY_ACKNOWLEDGEMENT = "ACKNOWLEDGE_NSPG_LOCAL_IMPORT";
export const REGISTRATION_CLOSES_AT = "2026-10-15T18:29:00.000Z";
export const SNAPSHOT_MAX_AGE_MS = 15 * 60 * 1000;

const HASH_PATTERN = /^[0-9a-f]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ImportGateError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ImportGateError";
    this.code = code;
  }
}

export interface ImportGateInput {
  mode?: string | null;
  projectRef?: string | null;
  snapshotHash?: string | null;
  liveHash?: string | null;
  snapshotAt?: string | null;
  now?: string | null;
  organizerId?: string | null;
  organizerExists?: boolean | null;
  acknowledgement?: string | null;
  expectedSnapshot?: SnapshotCounts | null;
  liveSnapshot?: SnapshotCounts | null;
  candidates?: readonly CandidateCheck[] | null;
  expectedCandidates?: number | null;
  slugCollisions?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  venueName?: string | null;
  city?: string | null;
  status?: string | null;
  visibility?: string | null;
  allowNullSchedule?: boolean | null;
}

export interface ImportGateDecision {
  apply: false;
  refusal: string | null;
}

const COUNT_KEYS: Array<keyof SnapshotCounts> = [
  "submissions",
  "links",
  "withdrawnSubmissions",
  "withdrawnLinks",
  "confirmedSubmissions",
  "confirmedLinks",
  "auto",
  "roster",
  "pairs",
  "artistic",
  "qualification",
  "ranked",
  "multiWeight",
  "unresolved",
];

function sameCounts(expected: SnapshotCounts, live: SnapshotCounts): boolean {
  return COUNT_KEYS.every((key) => expected[key] === live[key]);
}

/**
 * Problems in the approved manifest abort the import.
 * Blocked classes that appear only in the full snapshot are not a refusal.
 */
export function manifestRefusal(input: ImportGateInput): string | null {
  const applying = input.mode === APPLY_MODE;
  if (applying && input.candidates == null) return "manifest_required";
  if (applying && input.expectedSnapshot == null) return "snapshot_counts_required";
  if (applying && input.expectedCandidates == null) return "candidate_counts_required";
  if (applying && input.liveSnapshot == null) return "snapshot_counts_required";
  const candidates = input.candidates;
  if (candidates == null) return (input.slugCollisions ?? 0) > 0 ? "slug_collision" : null;
  if (candidates.some((row) => row.approvedClass !== "auto_importable_singles")) return "blocked_candidate";
  if (candidates.some((row) => row.liveStatus === "withdrawn")) return "withdrawn_candidate";
  if (candidates.some((row) => row.liveStatus !== "confirmed")) return "candidate_not_confirmed";
  if (candidates.some((row) => !row.linkPresent)) return "candidate_link_removed";
  if (candidates.some((row) => row.duplicateInManifest || row.duplicateInSnapshot)) return "duplicate_candidate";
  if (candidates.some((row) => row.crossForm)) return "cross_form_candidate";
  if (candidates.some((row) => row.crossTournament)) return "cross_tournament_candidate";
  if (candidates.some((row) => row.liveCategoryName !== row.approvedCategoryName)) return "candidate_category_changed";
  if (candidates.some((row) => row.liveClass !== "auto_importable_singles" || row.liveClass !== row.approvedClass)) {
    return "classification_mismatch";
  }
  if (input.expectedSnapshot != null && input.liveSnapshot != null && !sameCounts(input.expectedSnapshot, input.liveSnapshot)) {
    return "snapshot_count_drift";
  }
  if (input.expectedCandidates != null && input.expectedCandidates !== candidates.length) return "candidate_count_drift";
  if ((input.slugCollisions ?? 0) > 0) return "slug_collision";
  return null;
}

function assertApplyArguments(input: ImportGateInput, now: Date): void {
  if (input.projectRef === PRODUCTION_PROJECT_REF) throw new ImportGateError("production_project_refused");
  if (input.projectRef !== LOCAL_PROJECT_REF) throw new ImportGateError("wrong_project_reference");
  if (input.acknowledgement !== APPLY_ACKNOWLEDGEMENT) throw new ImportGateError("acknowledgement_required");
  if (!input.snapshotAt) throw new ImportGateError("snapshot_required");
  const snapshotAt = new Date(input.snapshotAt);
  if (Number.isNaN(snapshotAt.getTime())) throw new ImportGateError("malformed_snapshot");
  const closesAt = new Date(REGISTRATION_CLOSES_AT);
  if (now.getTime() < closesAt.getTime()) throw new ImportGateError("registration_open");
  if (snapshotAt.getTime() < closesAt.getTime() || snapshotAt.getTime() > now.getTime()) {
    throw new ImportGateError("stale_snapshot");
  }
  if (now.getTime() - snapshotAt.getTime() > SNAPSHOT_MAX_AGE_MS) throw new ImportGateError("stale_snapshot");
  if (!input.snapshotHash || !HASH_PATTERN.test(input.snapshotHash)) throw new ImportGateError("malformed_snapshot");
  if (input.liveHash != null && input.liveHash !== input.snapshotHash) throw new ImportGateError("snapshot_hash_mismatch");
  if (!input.organizerId || !UUID_PATTERN.test(input.organizerId) || input.organizerExists !== true) {
    throw new ImportGateError("invalid_organizer");
  }
  if (input.status !== "draft" || input.visibility !== "private") throw new ImportGateError("status_not_explicit");
  const scheduleMissing = !input.startsAt || !input.endsAt || !input.venueName || !input.city;
  if (scheduleMissing && input.allowNullSchedule !== true) throw new ImportGateError("schedule_not_provided");
  if (input.city && input.city !== "kohima" && input.city !== "dimapur") throw new ImportGateError("city_not_allowed");
}

/**
 * `dry-run` is the only path that returns without throwing.
 * Any other mode, including a misspelling, throws `apply_flag_required`.
 * `apply` throws unless every precondition matches. It never returns a partial apply.
 */
export function evaluateImportGate(input: ImportGateInput): ImportGateDecision | { apply: true; refusal: null } {
  if (input.mode == null || input.mode === DRY_RUN_MODE) {
    return { apply: false, refusal: manifestRefusal(input) };
  }
  if (input.mode !== APPLY_MODE) throw new ImportGateError("apply_flag_required");
  const now = new Date(input.now ?? "");
  if (Number.isNaN(now.getTime())) throw new ImportGateError("malformed_snapshot");
  assertApplyArguments(input, now);
  const refusal = manifestRefusal(input);
  if (refusal) throw new ImportGateError(refusal);
  return { apply: true, refusal: null };
}

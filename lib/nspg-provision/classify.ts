// Pure NSPG import classifier. No database access and no personal fields.

export const IMPORT_CLASSES = [
  "auto_importable_singles",
  "pending_qualification",
  "ranked_result",
  "district_roster",
  "unlinked_pair",
  "artistic_ensemble",
  "multi_weight_conflict",
  "other_unresolved",
] as const;

export type ImportClass = (typeof IMPORT_CLASSES)[number];

export const COMPETITION_SPORTS = [
  "archery",
  "athletics",
  "badminton",
  "basketball",
  "boxing",
  "football",
  "lawn_tennis",
  "pencak_silat",
  "sepaktakraw",
  "table_tennis",
  "taekwondo",
  "volleyball",
  "wrestling",
  "wushu",
] as const;

export type CompetitionSport = (typeof COMPETITION_SPORTS)[number];

/** Idempotency key for a future import. One category link, one entrant. */
export const IMPORT_IDEMPOTENCY_KEY = ["submissionId", "regCategoryId"] as const;

export interface SnapshotForm {
  id: string;
  slug: string;
  sport: string;
  status: string;
}

export interface SnapshotCategory {
  id: string;
  formId: string;
  name: string;
  sortOrder: number;
}

export interface SnapshotSubmission {
  id: string;
  formId: string;
  status: string;
}

export interface SnapshotLink {
  submissionId: string;
  categoryId: string;
}

export interface SnapshotTournament {
  id: string;
  slug: string;
  sport: string;
  status: string;
  visibility: string;
}

export interface SnapshotEntrant {
  id: string;
  tournamentId: string;
  categoryId: string | null;
  status: string;
}

export interface SnapshotImportLink {
  submissionId: string;
  regCategoryId: string;
  entrantId: string | null;
}

/** Read-only export. Must not contain names, contact details, answers, or documents. */
export interface NspgSnapshot {
  inspectedAt: string;
  forms: SnapshotForm[];
  categories: SnapshotCategory[];
  submissions: SnapshotSubmission[];
  links: SnapshotLink[];
  tournaments: SnapshotTournament[];
  entrants: SnapshotEntrant[];
  importLinks: SnapshotImportLink[];
}

export interface ClassifiedLink {
  submissionId: string;
  regCategoryId: string;
  formId: string;
  sport: string;
  categoryName: string;
  importClass: ImportClass;
  proposedTournamentSlug: string | null;
  entrantEligible: boolean;
}

export interface ReviewItem {
  submissionId: string;
  regCategoryId: string | null;
  reason: "withdrawn" | "status_changed" | "link_removed" | "duplicate_link" | "cross_form_link" | "unknown_category";
}

export interface ClassificationResult {
  classified: ClassifiedLink[];
  review: ReviewItem[];
  unknownCategories: string[];
  counts: Record<ImportClass, number>;
  bySport: Array<Record<ImportClass, number> & { sport: string; people: number; links: number }>;
  byCategory: Array<{ sport: string; category: string; importClass: ImportClass; links: number }>;
  confirmedSubmissions: number;
  confirmedLinks: number;
  classifiedOnce: boolean;
  duplicatePairs: number;
  crossFormLinks: number;
  officialsExcluded: number;
  tournamentCollisions: string[];
  multiWeightSubmissions: number;
  safeToApplyProduction: false;
}

const WEIGHT_SPORTS = new Set(["boxing", "taekwondo", "wrestling", "wushu"]);
const RACKET_SPORTS = new Set(["badminton", "lawn_tennis", "table_tennis"]);
const ROSTER_SPORTS = new Set(["football", "basketball", "volleyball", "sepaktakraw"]);

export function tournamentSlugForSport(sport: string): string | null {
  return TOURNAMENT_SLUG[sport] ?? null;
}

const TOURNAMENT_SLUG: Record<string, string> = {
  archery: "nspg26-archery",
  athletics: "nspg26-athletics",
  badminton: "nspg26-badminton",
  basketball: "nspg26-basketball",
  boxing: "nspg26-boxing",
  football: "nspg26-football",
  lawn_tennis: "nspg26-lawn-tennis",
  pencak_silat: "nspg26-pencak-silat",
  sepaktakraw: "nspg26-sepaktakraw",
  table_tennis: "nspg26-table-tennis",
  taekwondo: "nspg26-taekwondo",
  volleyball: "nspg26-volleyball",
  wrestling: "nspg26-wrestling",
  wushu: "nspg26-wushu",
};

function emptyCounts(): Record<ImportClass, number> {
  return {
    auto_importable_singles: 0,
    pending_qualification: 0,
    ranked_result: 0,
    district_roster: 0,
    unlinked_pair: 0,
    artistic_ensemble: 0,
    multi_weight_conflict: 0,
    other_unresolved: 0,
  };
}

function includesFold(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle.toLowerCase());
}

function isWeightLink(sport: string, categoryName: string): boolean {
  if (WEIGHT_SPORTS.has(sport)) return true;
  return sport === "pencak_silat" && includesFold(categoryName, "Tanding");
}

/**
 * Same order as the 11 October read-only query.
 * Sepaktakraw is a roster sport before any doubles wording is considered.
 */
export function classifyCategory(sport: string, categoryName: string, weightCount: number): ImportClass {
  if (isWeightLink(sport, categoryName) && weightCount > 1) return "multi_weight_conflict";
  if (isWeightLink(sport, categoryName) && weightCount === 1) return "auto_importable_singles";
  if (RACKET_SPORTS.has(sport) && includesFold(categoryName, "Singles")) return "auto_importable_singles";
  if (RACKET_SPORTS.has(sport) && includesFold(categoryName, "Doubles")) return "unlinked_pair";
  if (sport === "archery" && includesFold(categoryName, "Team")) return "district_roster";
  if (sport === "archery" && includesFold(categoryName, "Olympic Round")) return "pending_qualification";
  if (sport === "archery") return "ranked_result";
  if (sport === "athletics" && includesFold(categoryName, "Relay")) return "district_roster";
  if (sport === "athletics") return "ranked_result";
  if (sport === "pencak_silat" && (includesFold(categoryName, "Tunggal") || includesFold(categoryName, "Solo Creative"))) {
    return "ranked_result";
  }
  if (sport === "pencak_silat" && (includesFold(categoryName, "Ganda") || includesFold(categoryName, "Regu"))) {
    return "artistic_ensemble";
  }
  if (ROSTER_SPORTS.has(sport)) return "district_roster";
  if (includesFold(categoryName, "Team")) return "district_roster";
  return "other_unresolved";
}

function competitionForm(form: SnapshotForm): boolean {
  return form.slug.toLowerCase().startsWith("nspg26-") && form.sport !== "officials";
}

export function classifySnapshot(snapshot: NspgSnapshot): ClassificationResult {
  const forms = new Map(snapshot.forms.map((form) => [form.id, form]));
  const categories = new Map(snapshot.categories.map((category) => [category.id, category]));
  const submissions = new Map(snapshot.submissions.map((submission) => [submission.id, submission]));
  const review: ReviewItem[] = [];
  const unknown = new Set<string>();
  let officialsExcluded = 0;
  let duplicatePairs = 0;
  let crossFormLinks = 0;

  const seenPairs = new Set<string>();
  const confirmedRows: Array<{
    submissionId: string;
    categoryId: string;
    formId: string;
    sport: string;
    categoryName: string;
    forcedClass: ImportClass | null;
  }> = [];

  for (const link of snapshot.links) {
    const submission = submissions.get(link.submissionId);
    const category = categories.get(link.categoryId);
    const form = submission ? forms.get(submission.formId) : undefined;
    if (!submission || !form || !competitionForm(form)) {
      if (form?.sport === "officials") officialsExcluded += 1;
      continue;
    }
    if (!category) {
      unknown.add("Unknown category");
      if (submission.status === "confirmed") {
        review.push({ submissionId: submission.id, regCategoryId: link.categoryId, reason: "unknown_category" });
        const pair = `${submission.id}:${link.categoryId}`;
        if (!seenPairs.has(pair)) {
          seenPairs.add(pair);
          confirmedRows.push({
            submissionId: submission.id,
            categoryId: link.categoryId,
            formId: form.id,
            sport: form.sport,
            categoryName: "Unknown category",
            forcedClass: "other_unresolved",
          });
        }
      }
      continue;
    }
    if (category.formId !== submission.formId) {
      crossFormLinks += 1;
      review.push({ submissionId: submission.id, regCategoryId: category.id, reason: "cross_form_link" });
    }
    const pair = `${submission.id}:${category.id}`;
    if (seenPairs.has(pair)) {
      duplicatePairs += 1;
      review.push({ submissionId: submission.id, regCategoryId: category.id, reason: "duplicate_link" });
      continue;
    }
    seenPairs.add(pair);
    if (submission.status === "withdrawn") {
      review.push({ submissionId: submission.id, regCategoryId: category.id, reason: "withdrawn" });
      continue;
    }
    if (submission.status !== "confirmed") {
      review.push({ submissionId: submission.id, regCategoryId: category.id, reason: "status_changed" });
      continue;
    }
    confirmedRows.push({
      submissionId: submission.id,
      categoryId: category.id,
      formId: form.id,
      sport: form.sport,
      categoryName: category.name,
      forcedClass: null,
    });
  }

  const weightCounts = new Map<string, number>();
  for (const row of confirmedRows) {
    if (row.forcedClass || !isWeightLink(row.sport, row.categoryName)) continue;
    const key = `${row.submissionId}:${row.sport}`;
    weightCounts.set(key, (weightCounts.get(key) ?? 0) + 1);
  }

  const classified: ClassifiedLink[] = confirmedRows.map((row) => {
    const weightCount = weightCounts.get(`${row.submissionId}:${row.sport}`) ?? 0;
    const importClass = row.forcedClass ?? classifyCategory(row.sport, row.categoryName, weightCount);
    if (importClass === "other_unresolved") unknown.add(row.categoryName);
    return {
      submissionId: row.submissionId,
      regCategoryId: row.categoryId,
      formId: row.formId,
      sport: row.sport,
      categoryName: row.categoryName,
      importClass,
      proposedTournamentSlug: TOURNAMENT_SLUG[row.sport] ?? null,
      entrantEligible: importClass === "auto_importable_singles",
    };
  });

  for (const existing of snapshot.importLinks) {
    const submission = submissions.get(existing.submissionId);
    if (submission && submission.status !== "confirmed") {
      review.push({
        submissionId: existing.submissionId,
        regCategoryId: existing.regCategoryId,
        reason: "status_changed",
      });
    }
    const stillLinked = snapshot.links.some(
      (link) => link.submissionId === existing.submissionId && link.categoryId === existing.regCategoryId,
    );
    if (!stillLinked) {
      review.push({
        submissionId: existing.submissionId,
        regCategoryId: existing.regCategoryId,
        reason: "link_removed",
      });
    }
  }

  const counts = emptyCounts();
  for (const link of classified) counts[link.importClass] += 1;

  const sportMap = new Map<string, Record<ImportClass, number> & { sport: string; people: number; links: number; ids: Set<string> }>();
  for (const link of classified) {
    const current = sportMap.get(link.sport) ?? { sport: link.sport, people: 0, links: 0, ids: new Set<string>(), ...emptyCounts() };
    current.links += 1;
    current[link.importClass] += 1;
    current.ids.add(link.submissionId);
    sportMap.set(link.sport, current);
  }
  const bySport = [...sportMap.values()]
    .map((row) => {
      const { ids, ...rest } = row;
      return { ...rest, people: ids.size };
    })
    .sort((a, b) => a.sport.localeCompare(b.sport));

  const categoryMap = new Map<string, { sport: string; category: string; importClass: ImportClass; links: number }>();
  for (const link of classified) {
    const key = `${link.sport}:${link.categoryName}:${link.importClass}`;
    const current = categoryMap.get(key) ?? {
      sport: link.sport,
      category: link.categoryName,
      importClass: link.importClass,
      links: 0,
    };
    current.links += 1;
    categoryMap.set(key, current);
  }
  const byCategory = [...categoryMap.values()].sort((a, b) =>
    a.sport === b.sport ? a.category.localeCompare(b.category) : a.sport.localeCompare(b.sport),
  );

  const confirmedSubmissions = new Set(classified.map((link) => link.submissionId)).size;
  const classTotal = IMPORT_CLASSES.reduce((sum, name) => sum + counts[name], 0);
  const proposedSlugs = new Set(Object.values(TOURNAMENT_SLUG));
  const tournamentCollisions = snapshot.tournaments
    .filter((tournament) => proposedSlugs.has(tournament.slug) || tournament.slug.toLowerCase().startsWith("nspg26-"))
    .map((tournament) => tournament.slug)
    .sort();

  const multiWeightSubmissions = new Set(
    [...weightCounts.entries()].filter(([, count]) => count > 1).map(([key]) => key.split(":")[0]),
  ).size;

  return {
    classified,
    review,
    unknownCategories: [...unknown].sort(),
    counts,
    bySport,
    byCategory,
    confirmedSubmissions,
    confirmedLinks: classified.length,
    classifiedOnce: classified.length === confirmedRows.length && classTotal === classified.length,
    duplicatePairs,
    crossFormLinks,
    officialsExcluded,
    tournamentCollisions,
    multiWeightSubmissions,
    safeToApplyProduction: false,
  };
}

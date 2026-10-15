// NSPG 2026 sport capability registry.
// Canonical slugs match reg_forms.sport. This module does not talk to Supabase.

import { parseArcheryConfig } from "../scoring/archery";
import { parseLawnTennisConfig } from "../scoring/lawn-tennis";
import { parseTableTennisConfig } from "../scoring/table-tennis";
import { parseSepaktakrawConfig } from "../scoring/sepaktakraw";
import { parseVolleyballConfig } from "../scoring/volleyball";

export const SCORING_ARCHETYPES = [
  "Team score and clock",
  "Racket/rally sets",
  "Combat bracket",
  "Athletics results",
  "Archery ends",
] as const;

export type ScoringArchetype = (typeof SCORING_ARCHETYPES)[number];

/** How competitors are entered for that discipline. */
export type EntrantStyle = "team" | "individual" | "mixed";

export type SupportStatus = "supported" | "structured" | "unsupported";

/**
 * Live engine module that can score the sport today.
 * Football uses the futsal/football engine in lib/scoring/futsal.ts.
 */
export type NspgLiveEngine = "futsal" | "basketball" | "badminton";

export const NSPG_SPORT_SLUGS = [
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

export type NspgSportSlug = (typeof NSPG_SPORT_SLUGS)[number];

export interface NspgSportCapability {
  slug: NspgSportSlug;
  displayName: string;
  archetype: ScoringArchetype;
  entrantStyle: EntrantStyle;
  management: SupportStatus;
  liveScoring: SupportStatus;
  engine: NspgLiveEngine | null;
  structuredResultEntryRequired: boolean;
}

const ARCHERY: ScoringArchetype = "Archery ends";
const ATHLETICS: ScoringArchetype = "Athletics results";
const CLOCK: ScoringArchetype = "Team score and clock";
const RALLY: ScoringArchetype = "Racket/rally sets";
const COMBAT: ScoringArchetype = "Combat bracket";

function supported(engine: NspgLiveEngine): Pick<
  NspgSportCapability,
  "management" | "liveScoring" | "engine" | "structuredResultEntryRequired"
> {
  return {
    management: "supported",
    liveScoring: "supported",
    engine,
    structuredResultEntryRequired: false,
  };
}

function pending(): Pick<
  NspgSportCapability,
  "management" | "liveScoring" | "engine" | "structuredResultEntryRequired"
> {
  return {
    management: "unsupported",
    liveScoring: "unsupported",
    engine: null,
    structuredResultEntryRequired: true,
  };
}

function structured(entryRequired: boolean): Pick<
  NspgSportCapability,
  "management" | "liveScoring" | "engine" | "structuredResultEntryRequired"
> {
  return {
    management: "unsupported",
    liveScoring: "structured",
    engine: null,
    structuredResultEntryRequired: entryRequired,
  };
}

export const NSPG_SPORTS: Record<NspgSportSlug, NspgSportCapability> = {
  archery: { slug: "archery", displayName: "Archery", archetype: ARCHERY, entrantStyle: "mixed", ...structured(true) },
  athletics: { slug: "athletics", displayName: "Athletics", archetype: ATHLETICS, entrantStyle: "mixed", ...pending() },
  badminton: { slug: "badminton", displayName: "Badminton", archetype: RALLY, entrantStyle: "mixed", ...supported("badminton") },
  basketball: { slug: "basketball", displayName: "Basketball", archetype: CLOCK, entrantStyle: "team", ...supported("basketball") },
  boxing: { slug: "boxing", displayName: "Boxing", archetype: COMBAT, entrantStyle: "individual", ...structured(false) },
  football: { slug: "football", displayName: "Football", archetype: CLOCK, entrantStyle: "team", ...supported("futsal") },
  lawn_tennis: { slug: "lawn_tennis", displayName: "Lawn Tennis", archetype: RALLY, entrantStyle: "mixed", ...structured(true) },
  pencak_silat: { slug: "pencak_silat", displayName: "Pencak Silat", archetype: COMBAT, entrantStyle: "mixed", ...pending() },
  sepaktakraw: { slug: "sepaktakraw", displayName: "Sepaktakraw", archetype: CLOCK, entrantStyle: "team", ...structured(true) },
  table_tennis: { slug: "table_tennis", displayName: "Table Tennis", archetype: RALLY, entrantStyle: "mixed", ...structured(true) },
  taekwondo: { slug: "taekwondo", displayName: "Taekwondo", archetype: COMBAT, entrantStyle: "individual", ...structured(false) },
  volleyball: { slug: "volleyball", displayName: "Volleyball", archetype: CLOCK, entrantStyle: "team", ...structured(true) },
  wrestling: { slug: "wrestling", displayName: "Wrestling", archetype: COMBAT, entrantStyle: "individual", ...structured(false) },
  wushu: { slug: "wushu", displayName: "Wushu", archetype: COMBAT, entrantStyle: "individual", ...pending() },
};

/**
 * Hyphenated or spaced forms of slugs that are stored without an underscore.
 * Canonical slugs themselves are not rewritten.
 */
const SLUG_ALIASES: Record<string, NspgSportSlug> = {
  sepak_takraw: "sepaktakraw",
};

const SLUG_SET = new Set<string>(NSPG_SPORT_SLUGS);

/**
 * Trim, lowercase, and turn spaces or hyphens into single underscores.
 * Existing underscores stay, so `lawn_tennis` remains `lawn_tennis`.
 */
export function normalizeSportSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Map a user-facing or stored sport string onto a canonical NSPG slug. */
export function canonicalNspgSlug(input: string): NspgSportSlug | null {
  const normalized = normalizeSportSlug(input);
  if (SLUG_SET.has(normalized)) return normalized as NspgSportSlug;
  return SLUG_ALIASES[normalized] ?? null;
}

export function getNspgSport(input: string): NspgSportCapability | null {
  const slug = canonicalNspgSlug(input);
  return slug ? NSPG_SPORTS[slug] : null;
}

/** NSPG live engine only. Unknown sports and sports without an engine return null, never futsal. */
export function resolveNspgEngine(input: string): NspgLiveEngine | null {
  return getNspgSport(input)?.engine ?? null;
}

export type MatchEngine = NspgLiveEngine | "pickleball" | "darts";
export type CategoryMatchEngine =
  | MatchEngine
  | "combat"
  | "table_tennis"
  | "lawn_tennis"
  | "volleyball"
  | "sepaktakraw"
  | "archery";

/**
 * Engine for match control and the public scoreboard.
 * NSPG sports come from the registry. Futsal, pickleball, and darts stay as
 * their own engines. Anything else returns null.
 */
export function resolveMatchEngine(input: string): MatchEngine | null {
  const nspg = canonicalNspgSlug(input);
  if (nspg) return NSPG_SPORTS[nspg].engine;
  const slug = normalizeSportSlug(input);
  if (slug === "futsal" || slug === "pickleball" || slug === "darts") return slug;
  return null;
}

/** Doubles, mixed, and team table-tennis categories stay unsupported. */
export function isTableTennisSinglesCategory(categoryName?: string | null): boolean {
  const category = (categoryName ?? "").trim();
  if (!category) return false;
  if (/\bdoubles\b/i.test(category) || /\bmixed\b/i.test(category) || /\bteams?\b/i.test(category)) {
    return false;
  }
  return /\bsingles\b/i.test(category);
}

/**
 * Two-archer Olympic-round or head-to-head categories only.
 * Hyphens and repeated spaces normalize to single spaces.
 * Ranking, qualification, and team categories stay unresolved, including names
 * that also contain an Olympic-round or head-to-head phrase.
 */
export function isArcheryHeadToHeadCategory(categoryName?: string | null): boolean {
  const normalized = (categoryName ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return false;
  if (/\bteams?\b/.test(normalized)) return false;
  if (/\branking\b/.test(normalized)) return false;
  if (/\bqualif/.test(normalized)) return false;
  return /\bolympic round\b/.test(normalized) || /\bhead to head\b/.test(normalized);
}

/**
 * Lawn tennis singles only. Doubles, mixed, team, and pair categories are rejected,
 * including names that also contain "singles". A category with no singles word is unresolved.
 */
export function isLawnTennisSinglesCategory(categoryName?: string | null): boolean {
  const category = (categoryName ?? "").trim();
  if (!category) return false;
  if (
    /\bdoubles\b/i.test(category) ||
    /\bmixed\b/i.test(category) ||
    /\bteams?\b/i.test(category) ||
    /\bpairs?\b/i.test(category)
  ) {
    return false;
  }
  return /\bsingles\b/i.test(category);
}

/**
 * Category-aware engine. Football, basketball, badminton, futsal, pickleball,
 * and darts ignore the category name. Combat is boxing, taekwondo, wrestling,
 * wushu Sanda, and pencak silat categories whose name contains "Tanding".
 * Table tennis and lawn tennis return an engine only for singles categories.
 * Volleyball and sepaktakraw return an engine for the canonical sport only.
 * Sepaktakraw categories, including Double, are not parsed into individual pairs.
 * Archery returns an engine only for an Olympic-round or head-to-head category.
 * Ranking, qualification, and team archery categories stay unsupported.
 * Rules and existing squad entrants are checked separately.
 * Pair, doubles, mixed, and team categories stay unsupported for racket sports.
 */
export function resolveCategoryMatchEngine(
  sport: string,
  categoryName?: string | null,
): CategoryMatchEngine | null {
  const existing = resolveMatchEngine(sport);
  if (existing) return existing;
  const slug = canonicalNspgSlug(sport);
  const category = (categoryName ?? "").trim();
  if (slug === "volleyball") return "volleyball";
  if (slug === "sepaktakraw") return "sepaktakraw";
  if (slug === "archery" && isArcheryHeadToHeadCategory(category)) return "archery";
  if (slug === "boxing" || slug === "taekwondo" || slug === "wrestling") return "combat";
  if (slug === "wushu" && /\bsanda\b/i.test(category)) return "combat";
  if (slug === "pencak_silat" && /tanding/i.test(category)) return "combat";
  if (slug === "table_tennis" && isTableTennisSinglesCategory(category)) return "table_tennis";
  if (slug === "lawn_tennis" && isLawnTennisSinglesCategory(category)) return "lawn_tennis";
  return null;
}

/**
 * Support for a sport and category. Table tennis singles is supported only
 * when `sportConfig` is a valid table-tennis rules object.
 */
export function resolveCategorySupport(
  sport: string,
  categoryName?: string | null,
  sportConfig?: unknown,
): SupportStatus {
  const slug = canonicalNspgSlug(sport);
  if (slug === "table_tennis") {
    if (!isTableTennisSinglesCategory(categoryName)) return "unsupported";
    return parseTableTennisConfig(sportConfig) ? "supported" : "structured";
  }
  if (slug === "lawn_tennis") {
    if (!isLawnTennisSinglesCategory(categoryName)) return "unsupported";
    return parseLawnTennisConfig(sportConfig) ? "supported" : "structured";
  }
  if (slug === "volleyball") {
    return parseVolleyballConfig(sportConfig) ? "supported" : "structured";
  }
  if (slug === "sepaktakraw") {
    return parseSepaktakrawConfig(sportConfig) ? "supported" : "structured";
  }
  if (slug === "archery") {
    if (!isArcheryHeadToHeadCategory(categoryName)) return "unsupported";
    return parseArcheryConfig(sportConfig) ? "supported" : "structured";
  }
  const engine = resolveCategoryMatchEngine(sport, categoryName);
  if (engine === "combat") return "structured";
  if (engine) return "supported";
  return "unsupported";
}

export interface MatchScoreSnapshot {
  a: number | null;
  b: number | null;
  display: string | null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Read `matches.score` as written by updateSnapshot: `{ summary: { a, b }, display }`. */
export function readMatchScoreSnapshot(score: unknown): MatchScoreSnapshot {
  if (!score || typeof score !== "object" || Array.isArray(score)) {
    return { a: null, b: null, display: null };
  }
  const row = score as Record<string, unknown>;
  const summary =
    row.summary && typeof row.summary === "object" && !Array.isArray(row.summary)
      ? (row.summary as Record<string, unknown>)
      : null;
  const display = typeof row.display === "string" && row.display.trim() ? row.display : null;
  return {
    a: finiteNumber(summary?.a ?? row.a),
    b: finiteNumber(summary?.b ?? row.b),
    display,
  };
}

export function formatSnapshotScore(score: unknown): { line: string; display: string | null } {
  const snap = readMatchScoreSnapshot(score);
  const a = snap.a === null ? "–" : String(snap.a);
  const b = snap.b === null ? "–" : String(snap.b);
  return { line: `${a} – ${b}`, display: snap.display };
}

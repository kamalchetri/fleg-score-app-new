/**
 * NSPG sport capability registry.
 * Run with: npx tsx tests/nspg-sports.test.ts
 */

import {
  NSPG_SPORT_SLUGS,
  NSPG_SPORTS,
  SCORING_ARCHETYPES,
  canonicalNspgSlug,
  normalizeSportSlug,
  resolveMatchEngine,
  resolveCategoryMatchEngine,
  resolveNspgEngine,
  type ScoringArchetype,
} from "../lib/sports/nspg";

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

const ARCHETYPE_SET = new Set<string>(SCORING_ARCHETYPES);

test("exactly 14 unique canonical NSPG sports", () => {
  expectEq(NSPG_SPORT_SLUGS.length, 14);
  expectEq(new Set(NSPG_SPORT_SLUGS).size, 14);
  expectEq(Object.keys(NSPG_SPORTS).sort(), [...NSPG_SPORT_SLUGS].sort());
  for (const slug of NSPG_SPORT_SLUGS) {
    expectEq(NSPG_SPORTS[slug].slug, slug);
    expectEq(canonicalNspgSlug(slug), slug);
  }
});

test("every sport has one of the five archetypes", () => {
  for (const slug of NSPG_SPORT_SLUGS) {
    const archetype: ScoringArchetype = NSPG_SPORTS[slug].archetype;
    if (!ARCHETYPE_SET.has(archetype)) {
      throw new Error(`${slug} has unknown archetype ${archetype}`);
    }
    if (!NSPG_SPORTS[slug].displayName.trim()) {
      throw new Error(`${slug} is missing a display name`);
    }
  }
  for (const archetype of SCORING_ARCHETYPES) {
    const users = NSPG_SPORT_SLUGS.filter((slug) => NSPG_SPORTS[slug].archetype === archetype);
    if (users.length === 0) throw new Error(`archetype unused: ${archetype}`);
  }
});

test("alias normalization keeps canonical underscore slugs", () => {
  expectEq(normalizeSportSlug("lawn_tennis"), "lawn_tennis");
  expectEq(normalizeSportSlug("table_tennis"), "table_tennis");
  expectEq(normalizeSportSlug("pencak_silat"), "pencak_silat");
  expectEq(canonicalNspgSlug("lawn tennis"), "lawn_tennis");
  expectEq(canonicalNspgSlug("lawn-tennis"), "lawn_tennis");
  expectEq(canonicalNspgSlug("  LAWN_TENNIS  "), "lawn_tennis");
  expectEq(canonicalNspgSlug("table tennis"), "table_tennis");
  expectEq(canonicalNspgSlug("table-tennis"), "table_tennis");
  expectEq(canonicalNspgSlug("pencak silat"), "pencak_silat");
  expectEq(canonicalNspgSlug("pencak-silat"), "pencak_silat");
  expectEq(canonicalNspgSlug("sepak takraw"), "sepaktakraw");
  expectEq(canonicalNspgSlug("sepak-takraw"), "sepaktakraw");
  expectEq(canonicalNspgSlug("sepaktakraw"), "sepaktakraw");
  expectEq(NSPG_SPORTS.lawn_tennis.slug, "lawn_tennis");
  expectEq(NSPG_SPORTS.sepaktakraw.slug, "sepaktakraw");
});

test("live engines and structured result sports are explicit", () => {
  expectEq(resolveNspgEngine("football"), "futsal");
  expectEq(resolveNspgEngine("basketball"), "basketball");
  expectEq(resolveNspgEngine("badminton"), "badminton");
  const live = NSPG_SPORT_SLUGS.filter((slug) => NSPG_SPORTS[slug].engine !== null);
  expectEq(live.sort(), ["badminton", "basketball", "football"]);
  const structured = new Set([
    "boxing",
    "taekwondo",
    "wrestling",
    "table_tennis",
    "lawn_tennis",
    "volleyball",
    "sepaktakraw",
    "archery",
    "pencak_silat",
    "wushu",
  ]);
  for (const slug of NSPG_SPORT_SLUGS) {
    const sport = NSPG_SPORTS[slug];
    if (sport.engine !== null) {
      expectEq(sport.liveScoring, "supported", slug);
      expectEq(sport.structuredResultEntryRequired, false, slug);
    } else if (structured.has(slug)) {
      expectEq(sport.liveScoring, "structured", slug);
      expectEq(sport.engine, null, slug);
    } else {
      expectEq(sport.liveScoring, "unsupported", slug);
      expectEq(sport.structuredResultEntryRequired, true, slug);
    }
  }
  expectEq(NSPG_SPORTS.boxing.structuredResultEntryRequired, false);
  expectEq(NSPG_SPORTS.taekwondo.structuredResultEntryRequired, false);
  expectEq(NSPG_SPORTS.wrestling.structuredResultEntryRequired, false);
  expectEq(NSPG_SPORTS.table_tennis.structuredResultEntryRequired, true);
  expectEq(NSPG_SPORTS.lawn_tennis.structuredResultEntryRequired, true);
  expectEq(NSPG_SPORTS.volleyball.structuredResultEntryRequired, true);
  expectEq(NSPG_SPORTS.sepaktakraw.structuredResultEntryRequired, true);
  expectEq(NSPG_SPORTS.archery.structuredResultEntryRequired, true);
  expectEq(NSPG_SPORTS.wushu.liveScoring, "structured");
  expectEq(NSPG_SPORTS.pencak_silat.liveScoring, "structured");
});

test("unknown sports never resolve to futsal", () => {
  for (const input of ["archery", "athletics", "volleyball", "wushu", "soccer", "quidditch", "foot ball", ""]) {
    const engine = resolveNspgEngine(input);
    if (engine === "futsal") throw new Error(`${input || "(empty)"} resolved to futsal`);
    const matchEngine = resolveMatchEngine(input);
    if (matchEngine === "futsal") throw new Error(`${input || "(empty)"} match engine resolved to futsal`);
  }
  expectEq(resolveMatchEngine("futsal"), "futsal");
  expectEq(resolveMatchEngine("pickleball"), "pickleball");
  expectEq(resolveMatchEngine("darts"), "darts");
  expectEq(resolveCategoryMatchEngine("pencak_silat", "Men Artistic"), "artistic");
  expectEq(resolveCategoryMatchEngine("wushu", "Women Taolu"), "artistic");
  expectEq(resolveCategoryMatchEngine("pencak_silat", "Men Regu"), null);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

/**
 * NSPG public data facade. Programme metadata is loaded from a restricted,
 * read-only Supabase RPC. Draft tournaments and closed registrations must not
 * be exposed through the normal client or replaced with invented results.
 */
import { fetchNspgProgramme, type NspgEventCategory } from "./nspg-programme";
import {
  SEED_SPORTS, SEED_FIXTURES, SEED_LIVE, SEED_MATCH, SEED_STANDINGS,
  SEED_MEDALS, SEED_MEDALISTS,
} from "./nspg-seed";

// Synthetic fixtures and athlete results are allowed only in explicit review builds.
const REVIEW_BUILD = process.env.EXPO_PUBLIC_REVIEW_BUILD === "1";

export type MatchStatus = "scheduled" | "live" | "final";

export interface NspgSport {
  slug: string;            // "football", "basketball", ...
  name: string;            // "Football"
  icon: string;            // lucide/ionicon name the kit maps to
  liveCount: number;       // matches live right now
  todayCount: number;      // matches scheduled today
  categoryCount?: number;  // live count of configured event categories
}

export interface Side {
  id: string;
  name: string;            // team / athlete name
  district: string;        // "Kohima"
  logoUrl: string | null;
  score: number | null;    // null before start
}

export interface Fixture {
  id: string;
  sportSlug: string;
  category: string;        // "Men", "Women", "Open", weight class, etc.
  roundLabel: string;      // "Group A", "Quarter-final", "Round 1"
  status: MatchStatus;
  startAt: string;         // ISO
  venue: string | null;
  sideA: Side;
  sideB: Side;
  clock: string | null;    // "2nd Half 72'" when live, else null
}

export interface MatchEvent {
  minute: string;          // "54'"
  type: string;            // "Goal", "Yellow Card", "Substitution", "Point", ...
  side: "a" | "b";
  detail: string;          // "Goal - Kohima (K. Rio)"
}

export interface MatchDetail extends Fixture {
  events: MatchEvent[];
  periodLabel: string;     // "Full Time", "2nd Half", "Set 3"
}

export interface StandingRow {
  rank: number;
  team: string;
  district: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
}

export interface StandingsGroup {
  groupLabel: string;      // "Group A" or "League"
  rows: StandingRow[];
  qualifyCount: number;    // top-N highlighted
}

export interface Standings {
  sportSlug: string;
  category: string;
  format: "league" | "groups" | "knockout";
  groups: StandingsGroup[];   // empty for pure knockout (use fixtures bracket instead)
}

export interface MedalRow {
  district: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

export interface Medalist {
  regId: string;
  name: string;
  district: string;
  sport: string;
  event: string;
  medal: "gold" | "silver" | "bronze";
}

// ─── Public hub API ─────────────────────────────────────────────────────────

/** The database defines all disciplines, not a six-sport local seed list. */
export async function listNspgSports(): Promise<NspgSport[]> {
  const { sports } = await fetchNspgProgramme();
  const icons: Record<string, string> = {
    archery: "target", athletics: "run", badminton: "badminton",
    basketball: "basketball", boxing: "boxing-glove", football: "football",
    lawn_tennis: "tennis", pencak_silat: "karate", sepaktakraw: "volleyball",
    table_tennis: "table-tennis", taekwondo: "karate", volleyball: "volleyball",
    wrestling: "kabaddi", wushu: "karate",
  };
  return sports.map((sport) => {
    const review = REVIEW_BUILD ? SEED_SPORTS.find((row) => row.slug === sport.slug) : null;
    return {
      slug: sport.slug,
      name: sport.name,
      icon: icons[sport.slug] ?? "trophy-outline",
      liveCount: review?.liveCount ?? 0,
      todayCount: review?.todayCount ?? 0,
      categoryCount: sport.categories.length,
    };
  });
}

/** Official districts are the actual registration-form dropdown options. */
export async function listNspgDistricts(): Promise<string[]> {
  return (await fetchNspgProgramme()).districts;
}

/** Every category is read from reg_form_categories via the read-only RPC. */
export async function listNspgCategories(sportSlug: string): Promise<NspgEventCategory[]> {
  const programme = await fetchNspgProgramme();
  const record = [...programme.sports, ...(programme.para ? [programme.para] : [])]
    .find((group) => group.slug === sportSlug);
  return record?.categories ?? [];
}

export async function getNspgParaGroup() {
  return (await fetchNspgProgramme()).para;
}

/** Until official results are published, do not show private draft fixtures. */
export async function getSportFixtures(sportSlug: string): Promise<Fixture[]> {
  return REVIEW_BUILD ? SEED_FIXTURES.filter((f) => f.sportSlug === sportSlug) : [];
}

export async function getLiveMatches(): Promise<Fixture[]> {
  return REVIEW_BUILD ? SEED_LIVE : [];
}

export async function getMatch(matchId: string): Promise<MatchDetail | null> {
  return REVIEW_BUILD ? SEED_MATCH[matchId] ?? null : null;
}

export async function getStandings(sportSlug: string, category?: string): Promise<Standings | null> {
  if (!REVIEW_BUILD) return null;
  const key = category ? `${sportSlug}:${category}` : sportSlug;
  return SEED_STANDINGS[key] ?? SEED_STANDINGS[sportSlug] ?? null;
}

export async function getMedalTally(): Promise<MedalRow[]> {
  return REVIEW_BUILD ? SEED_MEDALS : [];
}

export async function getMedalists(): Promise<Medalist[]> {
  return REVIEW_BUILD ? SEED_MEDALISTS : [];
}

export function subscribeLive(onChange: () => void, ms = 15000): () => void {
  const timer = setInterval(onChange, ms);
  return () => clearInterval(timer);
}

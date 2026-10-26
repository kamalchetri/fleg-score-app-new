/**
 * NSPG live data layer — the ONLY data source the NSPG public hub (Task B) reads from.
 * UI must call these functions; never query Supabase tables directly from screens.
 *
 * Today each function returns SEED data (see ./nspg-seed) so the UI can be built and
 * run before the production provisioning cutover (24 Oct). Claude swaps each body to a
 * Supabase read-view query at cutover — the exported types and signatures below are the
 * stable contract and will NOT change, so no screen code changes when it goes live.
 *
 * Backing Supabase read views (created by Claude at B2, public/anon SELECT only):
 *   nspg_v_sports, nspg_v_fixtures, nspg_v_live, nspg_v_match, nspg_v_standings, nspg_v_medals
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  SEED_FIXTURES, SEED_LIVE, SEED_MATCH, SEED_STANDINGS, SEED_MEDALS, SEED_MEDALISTS,
} from "./nspg-seed";

export type MatchStatus = "scheduled" | "live" | "final";

export interface NspgSport {
  slug: string;            // "football", "basketball", ...
  name: string;            // "Football"
  icon: string;            // lucide/ionicon name the kit maps to
  liveCount: number;       // matches live right now
  todayCount: number;      // matches scheduled today
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

// ─── Public hub API (Task B reads only these) ──────────────────────────────

/** All NSPG sports with live/today counts, for the hub grid. */
const SPORT_ICON: Record<string, string> = {
  archery: "target", athletics: "run", badminton: "badminton",
  basketball: "basketball", boxing: "boxing-glove", football: "football",
  lawn_tennis: "tennis", para: "wheelchair-accessibility",
  pencak_silat: "karate", sepaktakraw: "volleyball",
  table_tennis: "table-tennis", taekwondo: "karate",
  volleyball: "volleyball", wrestling: "kabaddi", wushu: "karate",
};

const SPORT_LABEL: Record<string, string> = {
  lawn_tennis: "Lawn Tennis", para: "Para Athletes",
  pencak_silat: "Pencak Silat", sepaktakraw: "Sepaktakraw",
  table_tennis: "Table Tennis",
};

/** NSPG disciplines come from live registration forms, not the six-item demo seed.
 * A closed registration form remains a valid programme discipline. Officials are
 * registration roles rather than a sporting discipline, so they are excluded.
 * Uses the existing anonymous Supabase client and database RLS.
 */
export async function listNspgSports(): Promise<NspgSport[]> {
  // The checked-in generated Database type predates the reg_forms table.
  const client = supabase as unknown as SupabaseClient;
  const { data, error } = await client
    .from("reg_forms")
    .select("sport,slug,title")
    .like("slug", "nspg26-%")
    .neq("sport", "officials")
    .order("sport");
  if (error) throw error;
  const sports = new Map<string, NspgSport>();
  for (const row of data ?? []) {
    const slug = typeof row.sport === "string" ? row.sport.trim() : "";
    if (!slug || sports.has(slug)) continue;
    const name = SPORT_LABEL[slug] ?? slug.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    sports.set(slug, { slug, name, icon: SPORT_ICON[slug] ?? "trophy-outline", liveCount: 0, todayCount: 0 });
  }
  return [...sports.values()];
}

/** Fixtures + schedule for one sport (all statuses), newest/soonest first. */
export async function getSportFixtures(sportSlug: string): Promise<Fixture[]> {
  return SEED_FIXTURES.filter((f) => f.sportSlug === sportSlug);
  // → select * from nspg_v_fixtures where sport_slug = $1 order by start_at
}

/** Everything live right now across all sports, for the Live Match Centre. */
export async function getLiveMatches(): Promise<Fixture[]> {
  return SEED_LIVE; // → select * from nspg_v_live
}

/** One match with its event feed. */
export async function getMatch(matchId: string): Promise<MatchDetail | null> {
  const detail = SEED_MATCH[matchId];
  if (detail) return detail;
  const fixture = SEED_FIXTURES.find((item) => item.id === matchId);
  return fixture ? { ...fixture, events: [], periodLabel: fixture.clock ?? (fixture.status === "final" ? "Full Time" : fixture.status === "live" ? "Live" : "Scheduled") } : null; // → select * from nspg_v_match where id = $1
}

/** Standings / groups for a sport+category. */
export async function getStandings(sportSlug: string, category?: string): Promise<Standings | null> {
  const key = category ? `${sportSlug}:${category}` : sportSlug;
  return SEED_STANDINGS[key] ?? SEED_STANDINGS[sportSlug] ?? null;
  // → select * from nspg_v_standings where sport_slug = $1 and ($2 is null or category = $2)
}

/** District medal/points tally for the hub's medal view. */
export async function getMedalTally(): Promise<MedalRow[]> {
  return SEED_MEDALS; // → select * from nspg_v_medals order by gold desc, silver desc, bronze desc
}

/** Published individual medal results for the public athlete directory. */
export async function getMedalists(): Promise<Medalist[]> {
  return SEED_MEDALISTS; // → select * from nspg_v_medalists order by published_at desc
}

/**
 * Live updates. Today: poll every `ms`. At cutover Claude swaps the body to a
 * Supabase realtime channel subscription on matches; the callback contract stays the same.
 */
export function subscribeLive(onChange: () => void, ms = 15000): () => void {
  const t = setInterval(onChange, ms);
  return () => clearInterval(t);
}

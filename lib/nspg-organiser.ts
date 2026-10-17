import type { ScoringMatch } from "@/lib/scoring/project-match";
import { SCORING_LAB_FIXTURES } from "@/lib/scoring-lab/fixtures";

export type OrganiserTournamentStatus = "draft" | "live" | "complete";
export interface OrganiserTournament { id: string; name: string; sport: string; status: OrganiserTournamentStatus; venue: string; categories: number; entrants: number; matches: number; }
export interface OrganiserEntrant { id: string; name: string; district: string; status: "approved" | "pending" | "waitlisted"; }
export interface OrganiserMatch { id: string; label: string; round: string; startAt: string; venue: string; status: "scheduled" | "live" | "complete"; a: string; b: string; }

const TOURNAMENTS: OrganiserTournament[] = [
  { id: "seed-nspg-football", name: "NSPG 2026 — Football", sport: "Football", status: "live", venue: "Chümoukedima Stadium", categories: 1, entrants: 8, matches: 15 },
  { id: "seed-nspg-athletics", name: "NSPG 2026 — Athletics", sport: "Athletics", status: "draft", venue: "Indira Gandhi Stadium", categories: 12, entrants: 64, matches: 0 },
];

const ENTRANTS: OrganiserEntrant[] = [
  { id: "seed-kohima", name: "Kohima District", district: "Kohima", status: "approved" },
  { id: "seed-dimapur", name: "Dimapur District", district: "Dimapur", status: "approved" },
  { id: "seed-mokokchung", name: "Mokokchung District", district: "Mokokchung", status: "pending" },
  { id: "seed-tuensang", name: "Tuensang District", district: "Tuensang", status: "waitlisted" },
];

const MATCHES: OrganiserMatch[] = [
  { id: "m-fbl-1", label: "Kohima vs Dimapur", round: "Group A", startAt: "03 Nov · 10:30", venue: "Chümoukedima Stadium", status: "live", a: "Kohima", b: "Dimapur" },
  { id: "m-fbl-2", label: "Mokokchung vs Tuensang", round: "Group A", startAt: "03 Nov · 15:00", venue: "Chümoukedima Stadium", status: "scheduled", a: "Mokokchung", b: "Tuensang" },
  { id: "m-fbl-3", label: "Peren vs Wokha", round: "Group B", startAt: "02 Nov · 15:00", venue: "Dimapur DSA Ground", status: "complete", a: "Peren", b: "Wokha" },
];

export async function listOrganiserTournaments(): Promise<OrganiserTournament[]> { return TOURNAMENTS; }
export async function getOrganiserTournament(id: string): Promise<OrganiserTournament | null> { return TOURNAMENTS.find((t) => t.id === id) ?? null; }
export async function listSeedEntrants(): Promise<OrganiserEntrant[]> { return ENTRANTS; }
export async function listSeedMatches(): Promise<OrganiserMatch[]> { return MATCHES; }

/** Seed match adapter; production routes use app/match/[id] and its guarded RPC path. */
export function seedScoringMatch(matchId: string): ScoringMatch {
  const base = SCORING_LAB_FIXTURES.find((fixture) => fixture.id === "football-live") ?? SCORING_LAB_FIXTURES[0];
  return { ...base.match, id: matchId, status: "live", tournament: { ...base.match.tournament!, id: "seed-nspg-football", name: "NSPG 2026 — Football", sport: "football", sport_config: base.match.tournament?.sport_config ?? {} } };
}

import type { ScoringMatch } from "@/lib/scoring/project-match";
import { SCORING_LAB_FIXTURES } from "@/lib/scoring-lab/fixtures";

export type OrganiserTournamentStatus = "draft" | "live" | "complete";
export interface OrganiserTournament { id: string; name: string; sport: string; status: OrganiserTournamentStatus; venue: string; categories: number; entrants: number; matches: number; }
export interface OrganiserEntrant { id: string; name: string; district: string; status: "approved" | "pending" | "waitlisted"; }
export interface OrganiserMatch { id: string; label: string; round: string; startAt: string; venue: string; status: "scheduled" | "live" | "complete"; a: string; b: string; }
export type OrganiserFormat = "league" | "groups_knockout" | "knockout";
export interface OrganiserVenue { id: string; name: string; address: string; imageUrl: string | null; }
export interface GeneratedFixture { id: string; round: string; a: string | null; b: string | null; seedA: number | null; seedB: number | null; winner: string | null; venueId: string | null; referee: string | null; startAt: string | null; }

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
let venues: OrganiserVenue[] = [{ id: "venue-chumoukedima", name: "Chümoukedima Stadium", address: "Chümoukedima", imageUrl: null }, { id: "venue-dimapur", name: "Dimapur DSA Ground", address: "Dimapur", imageUrl: null }];
let generated: GeneratedFixture[] = [];

export async function listOrganiserTournaments(): Promise<OrganiserTournament[]> { return TOURNAMENTS; }
export async function getOrganiserTournament(id: string): Promise<OrganiserTournament | null> { return TOURNAMENTS.find((t) => t.id === id) ?? null; }
export async function listSeedEntrants(): Promise<OrganiserEntrant[]> { return ENTRANTS; }
export async function listSeedMatches(): Promise<OrganiserMatch[]> { return MATCHES; }
export async function listVenues(): Promise<OrganiserVenue[]> { return venues; }
export async function saveVenue(input: Omit<OrganiserVenue, "id"> & { id?: string }): Promise<OrganiserVenue> { const row = { ...input, id: input.id ?? `venue-${Date.now()}` }; venues = [...venues.filter((v) => v.id !== row.id), row]; return row; }
export async function generateFixtures(format: OrganiserFormat, entrantIds: string[]): Promise<GeneratedFixture[]> { const { generateRoundRobin } = await import("./formats/roundrobin"); const { generateKnockoutBracket } = await import("./bracket/knockout"); if (format === "league") { generated = generateRoundRobin(entrantIds).pairings.map((p, i) => ({ id: `fixture-${i + 1}`, round: `Round ${p.round}`, a: p.entrantA, b: p.entrantB, seedA: null, seedB: null, winner: null, venueId: null, referee: null, startAt: null })); } else { const bracket = generateKnockoutBracket(entrantIds.map((id, i) => ({ id, seed: i + 1 }))); generated = bracket.matches.map((m, i) => ({ id: `fixture-${i + 1}`, round: `Round ${m.round}`, a: m.entrantA, b: m.entrantB, seedA: null, seedB: null, winner: m.winnerId, venueId: null, referee: null, startAt: null })); } return generated; }
export async function listGeneratedFixtures(): Promise<GeneratedFixture[]> { return generated; }
export async function updateFixture(id: string, patch: Partial<GeneratedFixture>): Promise<GeneratedFixture | null> { const found = generated.find((f) => f.id === id); if (!found) return null; Object.assign(found, patch); return found; }
export async function advanceWinner(id: string, winner: string): Promise<GeneratedFixture | null> { return updateFixture(id, { winner }); }

/** Seed match adapter; production routes use app/match/[id] and its guarded RPC path. */
export function seedScoringMatch(matchId: string): ScoringMatch {
  const base = SCORING_LAB_FIXTURES.find((fixture) => fixture.id === "football-live") ?? SCORING_LAB_FIXTURES[0];
  return { ...base.match, id: matchId, status: "live", tournament: { ...base.match.tournament!, id: "seed-nspg-football", name: "NSPG 2026 — Football", sport: "football", sport_config: base.match.tournament?.sport_config ?? {} } };
}

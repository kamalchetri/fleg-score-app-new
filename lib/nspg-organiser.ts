import type { ScoringMatch } from "@/lib/scoring/project-match";
import { SCORING_LAB_FIXTURES } from "@/lib/scoring-lab/fixtures";

export type OrganiserTournamentStatus = "draft" | "live" | "complete";
export interface OrganiserTournament {
  id: string;
  name: string;
  sport: string;
  status: OrganiserTournamentStatus;
  venue: string;
  categories: number;
  entrants: number;
  matches: number;
  /** Read-only registration snapshot counts; not imported entrant rows. */
  registrationSubmissions?: number;
  registrationLinks?: number;
}
export interface OrganiserEntrant { id: string; name: string; district: string; status: "approved" | "pending" | "waitlisted"; }
export interface OrganiserMatch { id: string; label: string; round: string; startAt: string; venue: string; status: "scheduled" | "live" | "complete"; a: string; b: string; }
export type OrganiserFormat = "league" | "groups_knockout" | "knockout";
export interface OrganiserVenue { id: string; name: string; address: string; imageUrl: string | null; }
export interface OrganiserOfficial { id: string; name: string; role: "referee" | "scorekeeper"; sports: string[]; }
export interface GeneratedFixture { id: string; round: string; a: string | null; b: string | null; seedA: number | null; seedB: number | null; winner: string | null; venueId: string | null; referee: string | null; startAt: string | null; }

const TOURNAMENTS: OrganiserTournament[] = [
  { id: "seed-nspg-archery", name: "NSPG 2026 — Archery", sport: "Archery", status: "draft", venue: "Cricket Stadium, Sovima", categories: 12, entrants: 4, matches: 1, registrationSubmissions: 84, registrationLinks: 287 },
  { id: "seed-nspg-athletics", name: "NSPG 2026 — Athletics", sport: "Athletics", status: "draft", venue: "SAI, Dimapur", categories: 12, entrants: 4, matches: 1, registrationSubmissions: 375, registrationLinks: 823 },
  { id: "seed-nspg-badminton", name: "NSPG 2026 — Badminton", sport: "Badminton", status: "draft", venue: "Kire Stadium, NAPTC", categories: 12, entrants: 4, matches: 3, registrationSubmissions: 144, registrationLinks: 254 },
  { id: "seed-nspg-basketball", name: "NSPG 2026 — Basketball", sport: "Basketball", status: "draft", venue: "1st NAP Ground", categories: 2, entrants: 4, matches: 3, registrationSubmissions: 322, registrationLinks: 322 },
  { id: "seed-nspg-boxing", name: "NSPG 2026 — Boxing", sport: "Boxing", status: "draft", venue: "1st NAP Ground", categories: 12, entrants: 4, matches: 3, registrationSubmissions: 78, registrationLinks: 83 },
  { id: "seed-nspg-football", name: "NSPG 2026 — Football", sport: "Football", status: "live", venue: "DGP Sports Ground", categories: 1, entrants: 8, matches: 15, registrationSubmissions: 258, registrationLinks: 258 },
  { id: "seed-nspg-lawn-tennis", name: "NSPG 2026 — Lawn Tennis", sport: "Lawn Tennis", status: "draft", venue: "Kuda, Dimapur", categories: 6, entrants: 4, matches: 3, registrationSubmissions: 19, registrationLinks: 53 },
  { id: "seed-nspg-pencak-silat", name: "NSPG 2026 — Pencak Silat", sport: "Pencak Silat", status: "draft", venue: "Immanuel Hall, Signal Basti", categories: 16, entrants: 4, matches: 3, registrationSubmissions: 161, registrationLinks: 198 },
  { id: "seed-nspg-sepaktakraw", name: "NSPG 2026 — Sepaktakraw", sport: "Sepaktakraw", status: "draft", venue: "Multi Disciplinary Stadium, Sovima", categories: 6, entrants: 4, matches: 3, registrationSubmissions: 125, registrationLinks: 302 },
  { id: "seed-nspg-table-tennis", name: "NSPG 2026 — Table Tennis", sport: "Table Tennis", status: "draft", venue: "Multi Disciplinary Stadium, Sovima", categories: 8, entrants: 4, matches: 3, registrationSubmissions: 107, registrationLinks: 375 },
  { id: "seed-nspg-taekwondo", name: "NSPG 2026 — Taekwondo", sport: "Taekwondo", status: "draft", venue: "Kire Stadium, NAPTC", categories: 12, entrants: 4, matches: 3, registrationSubmissions: 176, registrationLinks: 176 },
  { id: "seed-nspg-volleyball", name: "NSPG 2026 — Volleyball", sport: "Volleyball", status: "draft", venue: "1st NAP Ground", categories: 2, entrants: 4, matches: 3, registrationSubmissions: 322, registrationLinks: 323 },
  { id: "seed-nspg-wrestling", name: "NSPG 2026 — Wrestling", sport: "Wrestling", status: "draft", venue: "Multi Disciplinary Complex, Chümoukedima", categories: 12, entrants: 4, matches: 3, registrationSubmissions: 58, registrationLinks: 61 },
  { id: "seed-nspg-wushu", name: "NSPG 2026 — Wushu", sport: "Wushu", status: "draft", venue: "Multi Disciplinary Complex, Chümoukedima", categories: 12, entrants: 4, matches: 3, registrationSubmissions: 106, registrationLinks: 118 },
];

let seedEntrants: OrganiserEntrant[] = [
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
const OFFICIALS: OrganiserOfficial[] = [
  { id: "official-rio", name: "K. Rio", role: "referee", sports: ["football", "futsal"] },
  { id: "official-sumi", name: "A. Sumi", role: "referee", sports: ["football", "basketball", "volleyball"] },
  { id: "official-zhimo", name: "M. Zhimo", role: "scorekeeper", sports: ["all"] },
];
let generated: GeneratedFixture[] = [];

export async function listOrganiserTournaments(): Promise<OrganiserTournament[]> { return TOURNAMENTS; }
export async function getOrganiserTournament(id: string): Promise<OrganiserTournament | null> { return TOURNAMENTS.find((t) => t.id === id) ?? null; }
export async function listSeedEntrants(): Promise<OrganiserEntrant[]> { return seedEntrants; }
export async function addSeedEntrant(input: Omit<OrganiserEntrant, "id">): Promise<OrganiserEntrant> {
  const entrant = { ...input, id: `seed-entrant-${Date.now()}-${seedEntrants.length + 1}` };
  seedEntrants = [...seedEntrants, entrant];
  return entrant;
}
export async function listSeedMatches(tournamentId = "seed-nspg-football"): Promise<OrganiserMatch[]> {
  // Measured disciplines open the ranked recorder, not a head-to-head pad.
  // This row is only a navigation fixture; it does not represent a real bout.
  const normalized = tournamentId.toLowerCase().replace(/-/g, "_");
  if (normalized.includes("athletics") || normalized.includes("archery")) {
    const sport = normalized.includes("archery") ? "Archery" : "Athletics";
    return [{ id: `m-${normalized}-ranked`, label: `${sport} sample start list`, round: "Qualification", startAt: "Review fixture", venue: "Seed recorder", status: "scheduled", a: "Sample Athlete A", b: "Sample Athlete B" }];
  }
  return MATCHES;
}
export async function listVenues(): Promise<OrganiserVenue[]> { return venues; }
export async function listOfficials(): Promise<OrganiserOfficial[]> { return OFFICIALS; }
export async function saveVenue(input: Omit<OrganiserVenue, "id"> & { id?: string }): Promise<OrganiserVenue> { const row = { ...input, id: input.id ?? `venue-${Date.now()}` }; venues = [...venues.filter((v) => v.id !== row.id), row]; return row; }
export async function generateFixtures(format: OrganiserFormat, entrantIds: string[]): Promise<GeneratedFixture[]> { const { generateRoundRobin } = await import("./formats/roundrobin"); const { generateKnockoutBracket } = await import("./bracket/knockout"); if (format === "league") { generated = generateRoundRobin(entrantIds).pairings.map((p, i) => ({ id: `fixture-${i + 1}`, round: `Round ${p.round}`, a: p.entrantA, b: p.entrantB, seedA: null, seedB: null, winner: null, venueId: null, referee: null, startAt: null })); } else { const bracket = generateKnockoutBracket(entrantIds.map((id, i) => ({ id, seed: i + 1 }))); generated = bracket.matches.map((m, i) => ({ id: `fixture-${i + 1}`, round: `Round ${m.round}`, a: m.entrantA, b: m.entrantB, seedA: null, seedB: null, winner: m.winnerId, venueId: null, referee: null, startAt: null })); } return generated; }
export async function listGeneratedFixtures(): Promise<GeneratedFixture[]> { return generated; }
/** Generate a group-stage fixture set for formats that qualify into a later
 * knockout stage. Qualification/standings remain a separate explicit step. */
export async function generateGroupsKnockoutFixtures(entrantIds: string[]): Promise<GeneratedFixture[]> {
  const { generateGroupStage } = await import("./formats/groups");
  if (entrantIds.length < 4) throw new Error("Groups format needs at least four approved entrants.");
  const groups = generateGroupStage(entrantIds, {
    groupCount: Math.min(2, Math.floor(entrantIds.length / 2)),
    advancePerGroup: 2,
  });
  generated = groups.flatMap((group) => group.pairings.map((pairing, index) => ({
    id: `fixture-${group.name}-${index + 1}`,
    round: `Group ${group.name} · Round ${pairing.round}`,
    a: pairing.entrantA,
    b: pairing.entrantB,
    seedA: null,
    seedB: null,
    winner: null,
    venueId: null,
    referee: null,
    startAt: null,
  })));
  return generated;
}
export async function updateFixture(id: string, patch: Partial<GeneratedFixture>): Promise<GeneratedFixture | null> { const found = generated.find((f) => f.id === id); if (!found) return null; Object.assign(found, patch); return found; }
export async function advanceWinner(id: string, winner: string | null): Promise<GeneratedFixture | null> { return updateFixture(id, { winner }); }

/** Seed match adapter; production routes use app/match/[id] and its guarded RPC path. */
export function disciplineForTournament(tournamentId: string): string {
  const slug = tournamentId.toLowerCase().replace(/-/g, "_");
  // Futsal, pickleball, and darts are FLEG Score sports outside the NSPG
  // registry, but organiser tournaments still need their own score pads.
  return ["football", "futsal", "pickleball", "darts", "basketball", "volleyball", "sepaktakraw", "badminton", "table_tennis", "lawn_tennis", "boxing", "taekwondo", "wushu", "wrestling", "pencak_silat", "athletics", "archery"].find((sport) => slug.includes(sport)) ?? "unknown";
}

export function seedScoringMatch(matchId: string, sport = "football"): ScoringMatch {
  const fixtureId = sport === "futsal" ? "football" : sport === "volleyball" ? "volleyball-set" : sport === "sepaktakraw" ? "takraw-set" : sport === "table_tennis" ? "table-tennis" : sport === "lawn_tennis" ? "tennis-game" : ["boxing", "taekwondo", "wrestling", "wushu", "pencak_silat"].includes(sport) ? (sport === "taekwondo" ? "combat-points" : sport === "wrestling" ? "combat-method" : "combat") : sport;
  const base = SCORING_LAB_FIXTURES.find((fixture) => fixture.id === fixtureId) ?? SCORING_LAB_FIXTURES[0];
  const category = sport === "wushu" ? "Sanda" : sport === "pencak_silat" ? "Tanding" : base.match.category?.name ?? "Open";
  return { ...base.match, id: matchId, status: "live", category: { name: category }, tournament: { ...base.match.tournament!, id: `seed-nspg-${sport}`, name: `NSPG 2026 — ${sport}`, sport, sport_config: base.match.tournament?.sport_config ?? {} } };
}

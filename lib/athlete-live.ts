export type AthleteSport =
  | "football" | "basketball" | "volleyball" | "sepaktakraw"
  | "boxing" | "taekwondo" | "wrestling" | "wushu" | "pencak_silat"
  | "badminton" | "table_tennis" | "lawn_tennis" | "athletics" | "archery";

export interface AthleteMatch {
  id: string;
  opponent: string;
  date: string;
  venue: string;
  result?: string;
  score?: string;
}

export interface AthleteProfile {
  regId: string;
  name: string;
  photoUrl: string | null;
  district: string;
  sports: AthleteSport[];
  age: number;
  gender: string;
  role: string;
  team: string | null;
  accommodation: string;
  xp: number;
  streakDays: number;
  achievements: { title: string; icon: string; tone: "lime" | "gold" | "red" }[];
  standing: { rank: number; record: string; played: number; remaining: number; nextMatch: AthleteMatch | null };
  history: AthleteMatch[];
  medals: { event: string; medal: "gold" | "silver" | "bronze" }[];
}

export interface AthleteAnalytics {
  sport: AthleteSport;
  stats: { label: string; value: string }[];
  trends: { label: string; value: number }[];
}

// Synthetic review records only. The cutover adapter will replace this list with
// the approved public athlete view; private registration fields never belong here.
const PROFILES: AthleteProfile[] = [
  {
    regId: "FBL-1234", name: "Arenla Jamir", photoUrl: null, district: "Kohima", sports: ["football"], age: 22, gender: "Women", role: "Athlete", team: "Kohima District", accommodation: "Athletes Village · Block A · Room 204", xp: 1840, streakDays: 14,
    achievements: [{ title: "Match maker", icon: "star-four-points", tone: "lime" }, { title: "Clean sheet", icon: "shield-check", tone: "gold" }],
    standing: { rank: 2, record: "3–1–0", played: 4, remaining: 1, nextMatch: { id: "m-fbl-2", opponent: "Dimapur", date: "03 Nov · 15:00", venue: "Chümoukedima Stadium" } },
    history: [{ id: "h1", opponent: "Peren", date: "02 Nov", venue: "Chümoukedima Stadium", result: "W", score: "2–0" }, { id: "h2", opponent: "Wokha", date: "01 Nov", venue: "Dimapur DSA Ground", result: "W", score: "1–0" }], medals: [{ event: "Women's football", medal: "silver" }],
  },
  {
    regId: "TS-3258", name: "Kedarnath Ao", photoUrl: null, district: "Mokokchung", sports: ["athletics"], age: 25, gender: "Men", role: "Athlete", team: null, accommodation: "Athletes Village · Block C · Room 118", xp: 2460, streakDays: 21,
    achievements: [{ title: "Record pace", icon: "run-fast", tone: "red" }, { title: "District pride", icon: "medal", tone: "gold" }],
    standing: { rank: 1, record: "—", played: 2, remaining: 0, nextMatch: null }, history: [{ id: "h3", opponent: "100m Final", date: "04 Nov", venue: "IG Stadium", result: "1st", score: "10.82s" }], medals: [{ event: "100m", medal: "gold" }],
  },
  {
    regId: "BOX-2041", name: "Vikuo Ritse", photoUrl: null, district: "Kohima", sports: ["boxing"], age: 24, gender: "Men", role: "Athlete", team: null, accommodation: "Athletes Village · Block A · Room 117", xp: 2110, streakDays: 9,
    achievements: [{ title: "Ring ready", icon: "boxing-glove", tone: "red" }, { title: "District pride", icon: "medal", tone: "gold" }],
    standing: { rank: 1, record: "2–0", played: 2, remaining: 0, nextMatch: null }, history: [{ id: "h4", opponent: "Mokokchung", date: "03 Nov", venue: "1st NAP Ground", result: "W", score: "28–22 pts" }], medals: [{ event: "Men's 67 kg", medal: "bronze" }],
  },
];

export async function getAthleteProfile(regId: string): Promise<AthleteProfile | null> {
  return PROFILES.find((profile) => profile.regId.toLowerCase() === regId.trim().toLowerCase()) ?? null;
}

export async function getAthleteByRegId(regId: string): Promise<AthleteProfile | null> {
  return getAthleteProfile(regId);
}

export async function getAthleteAnalytics(regId: string): Promise<AthleteAnalytics[]> {
  const profile = await getAthleteProfile(regId);
  if (!profile) return [];
  return profile.sports.map((sport) => analyticsForSport(sport, profile));
}

function analyticsForSport(sport: AthleteSport, profile: AthleteProfile): AthleteAnalytics {
  const trends = [{ label: "Heat / round 1", value: 54 }, { label: "Semi-final", value: 78 }, { label: "Final", value: 92 }];
  switch (sport) {
    case "football": return { sport, stats: [{ label: "Goals", value: "2" }, { label: "Assists", value: "1" }, { label: "Minutes", value: "238" }, { label: "Cards", value: "0" }], trends: [{ label: "Match 1", value: 45 }, { label: "Match 2", value: 72 }, { label: "Match 3", value: 61 }] };
    case "basketball": return { sport, stats: [{ label: "Points", value: "38" }, { label: "Rebounds", value: "14" }, { label: "Assists", value: "9" }, { label: "Steals", value: "5" }], trends };
    case "volleyball": return { sport, stats: [{ label: "Kills", value: "21" }, { label: "Blocks", value: "6" }, { label: "Aces", value: "4" }, { label: "Win rate", value: "75%" }], trends };
    case "boxing": case "taekwondo": case "wrestling": case "wushu": case "pencak_silat": return { sport, stats: [{ label: "Bouts", value: String(profile.history.length) }, { label: "Wins", value: "2" }, { label: "Points for", value: "58" }, { label: "Win method", value: "Points" }], trends };
    case "badminton": case "table_tennis": case "lawn_tennis": return { sport, stats: [{ label: "Matches", value: String(profile.history.length) }, { label: "Sets won", value: "5" }, { label: "Points won", value: "68%" }, { label: "Win rate", value: "80%" }], trends };
    case "archery": return { sport, stats: [{ label: "Best end", value: "27" }, { label: "Total points", value: "106" }, { label: "Ends", value: "4" }, { label: "Rank", value: `#${profile.standing.rank}` }], trends };
    case "athletics": return { sport, stats: [{ label: "Best mark", value: "10.82s" }, { label: "Events", value: String(profile.history.length) }, { label: "Rank", value: `#${profile.standing.rank}` }, { label: "Progress", value: "+4.2%" }], trends: [{ label: "Heat", value: 54 }, { label: "Semi", value: 78 }, { label: "Final", value: 92 }] };
    case "sepaktakraw": return { sport, stats: [{ label: "Points won", value: "42" }, { label: "Sets won", value: "2" }, { label: "Service points", value: "11" }, { label: "Win rate", value: "75%" }], trends };
  }
}

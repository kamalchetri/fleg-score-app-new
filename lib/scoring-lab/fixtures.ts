// In-memory scoring-lab fixtures. These are not production matches.
// Table-tennis, lawn-tennis, volleyball, sepaktakraw, and archery numbers are only here so the lab can render a valid rules object.
// They are not NSPG rules.

import type { ScoringEvent } from "@/lib/scoring";
import type { ScoringMatch } from "@/lib/scoring/project-match";
import { SPORT_PRESETS } from "@/lib/sports/presets";

export interface ScoringLabFixture {
  id: string;
  label: string;
  match: ScoringMatch;
  events: ScoringEvent[];
  /** Lab-only end totals already waiting on the review step. */
  archeryDraft?: { a: string; b: string; reviewing: boolean };
}

const TOURNAMENT = "lab-tournament";
const A = "lab-entrant-a";
const B = "lab-entrant-b";

function ev(id: number, event_type: string, payload: Record<string, unknown> = {}): ScoringEvent {
  return { id, event_type, payload, created_at: "2026-01-01T00:00:00.000Z" };
}

function points(startId: number, sides: string): ScoringEvent[] {
  return [...sides].map((side, index) => ev(startId + index, "point", { side }));
}

function holdGame(side: "a" | "b", startId: number): ScoringEvent[] {
  return points(startId, side.repeat(4));
}

function straightSets(winner: "a" | "b", games: number, startId: number): ScoringEvent[] {
  const events: ScoringEvent[] = [];
  let id = startId;
  for (let game = 0; game < games; game += 1) {
    events.push(...holdGame(winner, id));
    id += 4;
  }
  return events;
}

function splitGames(gamesEach: number, startId: number): ScoringEvent[] {
  const events: ScoringEvent[] = [];
  let id = startId;
  for (let game = 0; game < gamesEach; game += 1) {
    events.push(...holdGame("a", id));
    id += 4;
    events.push(...holdGame("b", id));
    id += 4;
  }
  return events;
}

/** Lab-only sepaktakraw rules. Not an NSPG preset. */
const LAB_SEPAKTAKRAW = {
  best_of_sets: 3,
  regular_set_points_to: 21,
  deciding_set_points_to: 15,
  win_by: 2,
};

const LAB_SEPAKTAKRAW_CAP = {
  ...LAB_SEPAKTAKRAW,
  regular_set_cap: 25,
  deciding_set_cap: 17,
};

/** Lab-only volleyball rules. Not an NSPG preset. */
const LAB_VOLLEYBALL = {
  best_of_sets: 3,
  regular_set_points_to: 25,
  deciding_set_points_to: 15,
  win_by: 2,
};

const LAB_VOLLEYBALL_CAP = {
  ...LAB_VOLLEYBALL,
  regular_set_cap: 27,
  deciding_set_cap: 17,
};

function rally(side: "a" | "b", count: number, startId: number): ScoringEvent[] {
  return points(startId, side.repeat(count));
}

/** Lab-only archery rules. Not an NSPG preset. */
const LAB_ARCHERY_SETS = {
  format: "set_points" as const,
  regulation_ends: 4,
  arrows_per_end: 3,
  max_arrow_score: 10,
  end_win_points: 2,
  end_tie_points: 1,
  set_points_to_win: 6,
  shoot_off: { arrows: 1 },
};

const LAB_ARCHERY_EARLY = { ...LAB_ARCHERY_SETS, set_points_to_win: 4 };

const LAB_ARCHERY_TOTAL = {
  format: "cumulative" as const,
  regulation_ends: 3,
  arrows_per_end: 6,
  max_arrow_score: 10,
  shoot_off: { arrows: 1 },
};

function archeryEnds(pairs: Array<[number, number]>, startId = 1): ScoringEvent[] {
  return pairs.map(([a, b], index) => ev(startId + index, "end_result", { a, b }));
}

const LAB_ARCHERY_TIE = archeryEnds([
  [28, 20],
  [18, 27],
  [26, 24],
  [22, 29],
]);

/** Lab-only lawn tennis rules. Not an NSPG preset. */
const LAB_LAWN_TENNIS = {
  best_of_sets: 3,
  games_to_win_set: 6,
  set_win_by_games: 2,
  regular_set_tiebreak: { enabled: true, trigger_games: 6, points_to: 7, win_by: 2 },
  deciding_set_tiebreak: { enabled: true, trigger_games: 6, points_to: 10, win_by: 2 },
};

function matchShell(
  id: string,
  sport: string,
  category: string,
  sportConfig: unknown,
  aName: string,
  bName: string,
  status = "live",
): ScoringMatch {
  return {
    id: `lab-match-${id}`,
    status,
    round: 1,
    format_override: null,
    score: null,
    tournament: { id: TOURNAMENT, name: "Scoring lab", sport, sport_config: sportConfig },
    stage: { stage_type: "group", config: { rounds: 1 } },
    category: { name: category },
    a: { id: A, display_name: aName },
    b: { id: B, display_name: bName },
  };
}

export const SCORING_LAB_FIXTURES: ScoringLabFixture[] = [
  {
    id: "football",
    label: "Football",
    match: matchShell("football", "football", "Open", SPORT_PRESETS.futsal.config, "North XI", "South XI"),
    events: [ev(1, "period_start")],
  },
  {
    id: "basketball",
    label: "Basketball",
    match: matchShell("basketball", "basketball", "Open 5v5", SPORT_PRESETS.basketball.config, "East", "West"),
    events: [ev(1, "period_start")],
  },
  {
    id: "badminton",
    label: "Badminton",
    match: matchShell("badminton", "badminton", "Open Singles", SPORT_PRESETS.badminton.config, "Anu", "Bina"),
    events: [],
  },
  {
    id: "pickleball",
    label: "Pickleball",
    match: matchShell("pickleball", "pickleball", "Open Singles", SPORT_PRESETS.pickleball.config, "Chandra", "Devi"),
    events: [],
  },
  {
    id: "darts",
    label: "Darts",
    match: matchShell("darts", "darts", "Open Singles", SPORT_PRESETS.darts.config, "Esha", "Farid"),
    events: [],
  },
  {
    id: "combat",
    label: "Combat",
    match: matchShell("combat", "boxing", "Flyweight", {}, "Garo", "Hima"),
    events: [],
  },
  {
    id: "combat-points",
    label: "Combat points",
    match: matchShell("combat-points", "taekwondo", "Feather", {}, "Ito", "Jaya"),
    events: [
      ev(1, "bout_result", {
        winnerSide: "a",
        method: "decision",
        pointsA: 12,
        pointsB: 9,
        note: "Lab points",
      }),
    ],
  },
  {
    id: "combat-method",
    label: "Combat method",
    match: matchShell("combat-method", "wrestling", "Freestyle 65kg", {}, "Kaito", "Lima"),
    events: [ev(1, "bout_result", { winnerSide: "b", method: "stoppage" })],
  },
  {
    id: "table-tennis",
    label: "Table tennis",
    match: matchShell(
      "table-tennis",
      "table_tennis",
      "Men's Singles",
      { best_of: 5, points_to: 11, win_by: 2 },
      "Mina",
      "Naro",
    ),
    events: [...points(1, "a".repeat(11)), ...points(12, "aabb")],
  },
  {
    id: "table-tennis-unconfigured",
    label: "TT standard",
    match: matchShell("table-tennis-unconfigured", "table_tennis", "Women's Singles", {}, "Omi", "Pari"),
    events: [],
  },
  {
    id: "table-tennis-invalid",
    label: "TT invalid",
    match: matchShell(
      "table-tennis-invalid",
      "table_tennis",
      "Men's Singles",
      { best_of: 2, points_to: 11, win_by: 2 },
      "Qira",
      "Ravi",
    ),
    events: [],
  },
  {
    id: "tennis-game",
    label: "Tennis",
    match: matchShell("tennis-game", "lawn_tennis", "Men's Singles", LAB_LAWN_TENNIS, "Levi", "Mira"),
    events: points(1, "aab"),
  },
  {
    id: "tennis-deuce",
    label: "Advantage",
    match: matchShell("tennis-deuce", "lawn_tennis", "Women's Singles", LAB_LAWN_TENNIS, "Nia", "Oma"),
    events: points(1, "abababa"),
  },
  {
    id: "tennis-tiebreak",
    label: "Tiebreak",
    match: matchShell("tennis-tiebreak", "lawn_tennis", "Men's Singles", LAB_LAWN_TENNIS, "Pema", "Rina"),
    events: [...splitGames(6, 1), ...points(1 + 6 * 8, "aaab")],
  },
  {
    id: "tennis-deciding",
    label: "Deciding set",
    match: matchShell("tennis-deciding", "lawn_tennis", "Women's Singles", LAB_LAWN_TENNIS, "Suri", "Toya"),
    events: [
      ...straightSets("a", 6, 1),
      ...straightSets("b", 6, 1 + 24),
      ...splitGames(6, 1 + 48),
      ...points(1 + 48 + 48, "aaaa"),
    ],
  },
  {
    id: "tennis-done",
    label: "Tennis done",
    match: matchShell("tennis-done", "lawn_tennis", "Men's Singles", LAB_LAWN_TENNIS, "Uma", "Veda"),
    events: [...straightSets("a", 6, 1), ...straightSets("a", 6, 25)],
  },
  {
    id: "tennis-rules",
    label: "Tennis rules",
    match: matchShell("tennis-rules", "lawn_tennis", "Men's Singles", {}, "Wati", "Yani"),
    events: [],
  },
  {
    id: "tennis-names",
    label: "Tennis names",
    match: matchShell(
      "tennis-names",
      "lawn_tennis",
      "Men's Singles",
      LAB_LAWN_TENNIS,
      "Kohima United Football Club Academy",
      "Dimapur Western Sporting Association",
    ),
    events: points(1, "a"),
  },
  {
    id: "volleyball-set",
    label: "Volleyball",
    match: matchShell("volleyball-set", "volleyball", "Men", LAB_VOLLEYBALL, "North Spikers", "South Spikers"),
    events: points(1, "aaaaaaaabbbbb"),
  },
  {
    id: "volleyball-deuce",
    label: "Set point",
    match: matchShell("volleyball-deuce", "volleyball", "Women", LAB_VOLLEYBALL, "Kohima VC", "Dimapur VC"),
    events: [...points(1, "ab".repeat(24)), ...points(49, "a")],
  },
  {
    id: "volleyball-deciding",
    label: "Deciding set",
    match: matchShell("volleyball-deciding", "volleyball", "Men", LAB_VOLLEYBALL, "Eastern", "Western"),
    events: [...rally("a", 25, 1), ...rally("b", 25, 26), ...points(51, "aaaab")],
  },
  {
    id: "volleyball-cap",
    label: "Capped set",
    match: matchShell("volleyball-cap", "volleyball", "Women", LAB_VOLLEYBALL_CAP, "Hill", "Valley"),
    events: [...points(1, "ab".repeat(26)), ...points(53, "a")],
  },
  {
    id: "volleyball-done",
    label: "Volleyball done",
    match: matchShell("volleyball-done", "volleyball", "Men", LAB_VOLLEYBALL, "Uma", "Veda"),
    events: [...rally("a", 25, 1), ...rally("a", 25, 26)],
  },
  {
    id: "volleyball-rules",
    label: "Volleyball standard",
    match: matchShell("volleyball-rules", "volleyball", "Men", {}, "Wati", "Yani"),
    events: [],
  },
  {
    id: "volleyball-names",
    label: "Volleyball names",
    match: matchShell(
      "volleyball-names",
      "volleyball",
      "Men",
      LAB_VOLLEYBALL,
      "Kohima United Football Club Academy",
      "Dimapur Western Sporting Association",
    ),
    events: points(1, "aaab"),
  },
  {
    id: "takraw-set",
    label: "Sepaktakraw",
    match: matchShell("takraw-set", "sepaktakraw", "Regu", LAB_SEPAKTAKRAW, "North Squad", "South Squad"),
    events: points(1, "aaaaaabbb"),
  },
  {
    id: "takraw-deuce",
    label: "Takraw set point",
    match: matchShell("takraw-deuce", "sepak takraw", "Double", LAB_SEPAKTAKRAW, "Kohima Squad", "Dimapur Squad"),
    events: [...points(1, "ab".repeat(20)), ...points(41, "a")],
  },
  {
    id: "takraw-deciding",
    label: "Takraw deciding",
    match: matchShell("takraw-deciding", "sepaktakraw", "Regu", LAB_SEPAKTAKRAW, "Eastern Squad", "Western Squad"),
    events: [...rally("a", 21, 1), ...rally("b", 21, 22), ...points(43, "aaaab")],
  },
  {
    id: "takraw-cap",
    label: "Takraw cap",
    match: matchShell("takraw-cap", "sepak-takraw", "Double", LAB_SEPAKTAKRAW_CAP, "Hill Squad", "Valley Squad"),
    events: [...points(1, "ab".repeat(24)), ...points(49, "a")],
  },
  {
    id: "takraw-done",
    label: "Takraw done",
    match: matchShell("takraw-done", "sepaktakraw", "Regu", LAB_SEPAKTAKRAW, "Uma Squad", "Veda Squad"),
    events: [...rally("a", 21, 1), ...rally("a", 21, 22)],
  },
  {
    id: "takraw-rules",
    label: "Takraw rules",
    match: matchShell("takraw-rules", "sepaktakraw", "Double", {}, "Wati Squad", "Yani Squad"),
    events: [],
  },
  {
    id: "takraw-names",
    label: "Takraw names",
    match: matchShell(
      "takraw-names",
      "sepaktakraw",
      "Regu",
      LAB_SEPAKTAKRAW,
      "Kohima United Football Club Academy",
      "Dimapur Western Sporting Association",
    ),
    events: points(1, "aaab"),
  },
  {
    id: "archery-set",
    label: "Archery",
    match: matchShell("archery-set", "archery", "Olympic Round", LAB_ARCHERY_SETS, "North Archer", "South Archer"),
    events: archeryEnds([[27, 24]]),
  },
  {
    id: "archery-total",
    label: "Archery total",
    match: matchShell("archery-total", "archery", "Head-to-Head", LAB_ARCHERY_TOTAL, "East Archer", "West Archer"),
    events: archeryEnds([
      [28, 26],
      [25, 27],
    ]),
  },
  {
    id: "archery-review",
    label: "Archery review",
    match: matchShell("archery-review", "archery", "olympic-round", LAB_ARCHERY_SETS, "Hill Archer", "Valley Archer"),
    events: archeryEnds([[27, 24]]),
    archeryDraft: { a: "26", b: "29", reviewing: true },
  },
  {
    id: "archery-tie",
    label: "Archery tie",
    match: matchShell("archery-tie", "archery", "Olympic Round", LAB_ARCHERY_SETS, "Uma Archer", "Veda Archer"),
    events: LAB_ARCHERY_TIE,
  },
  {
    id: "archery-shootoff",
    label: "Archery shoot-off",
    match: matchShell("archery-shootoff", "archery", "Head to head", LAB_ARCHERY_SETS, "Qira Archer", "Ravi Archer"),
    events: [
      ...LAB_ARCHERY_TIE,
      ev(5, "shoot_off", { winnerSide: "a", scoreA: 9, scoreB: 9, note: "Closest to centre" }),
    ],
  },
  {
    id: "archery-done",
    label: "Archery done",
    match: matchShell("archery-done", "archery", "Olympic Round", LAB_ARCHERY_EARLY, "Sena Archer", "Tali Archer"),
    events: [...archeryEnds([[28, 20], [27, 18]]), ev(3, "end_result", { a: 10, b: 10 })],
  },
  {
    id: "archery-rules",
    label: "Archery rules",
    match: matchShell("archery-rules", "archery", "Olympic Round", {}, "Wati Archer", "Yani Archer"),
    events: [],
  },
  {
    id: "archery-recurve-preset",
    label: "Recurve standard",
    match: matchShell("archery-recurve-preset", "archery", "Recurve Olympic Round", {}, "Naro Archer", "Omi Archer"),
    events: [],
  },
  {
    id: "archery-compound-preset",
    label: "Compound standard",
    match: matchShell("archery-compound-preset", "archery", "Compound Head-to-Head", {}, "Pari Archer", "Qira Archer"),
    events: [],
  },
  {
    id: "takraw-regu-preset",
    label: "Regu standard",
    match: matchShell("takraw-regu-preset", "sepaktakraw", "Regu", {}, "North Squad", "South Squad"),
    events: [],
  },
  {
    id: "archery-ranking",
    label: "Archery ranking",
    match: matchShell("archery-ranking", "archery", "Ranking Round", LAB_ARCHERY_SETS, "Kivi Archer", "Lima Archer"),
    events: archeryEnds([[27, 24]]),
  },
  {
    id: "archery-names",
    label: "Archery names",
    match: matchShell(
      "archery-names",
      "archery",
      "Olympic Round",
      LAB_ARCHERY_SETS,
      "Kohima United Football Club Academy",
      "Dimapur Western Sporting Association",
    ),
    events: archeryEnds([[27, 24]]),
  },
  {
    id: "artistic",
    label: "Artistic",
    match: matchShell("artistic", "pencak_silat", "Men Artistic", {}, "Qira", "Ravi"),
    events: [],
  },
  {
    id: "ranked",
    label: "Athletics",
    match: matchShell("ranked", "athletics", "100m", {}, "Sena", "Tali"),
    events: [],
  },
];

export const SCORING_LAB_LONG_NAMES = {
  a: "Kohima United Football Club Academy",
  b: "Dimapur Western Sporting Association",
};

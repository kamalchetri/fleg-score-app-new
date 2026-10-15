// ─────────────────────────────────────────────────────────────────────────────
//  Sport presets — single source of truth for the creation wizard and
//  (later, WP-4) match control. Shapes follow PHASE1_BLUEPRINT §8.3.
// ─────────────────────────────────────────────────────────────────────────────

export type SportId = "futsal" | "pickleball" | "basketball" | "badminton" | "darts";
export type EntrantType = "team" | "singles" | "doubles";

export interface FutsalConfig {
  periods: number;
  period_minutes: number;
  points: { goal: number };
  cards: string[];
  tiebreak: "penalties";
  table_points: { win: number; draw: number; loss: number };
}

export interface PickleballConfig {
  best_of: number;
  points_to: number;
  win_by: number;
  scoring: "rally" | "sideout";
  timeouts_per_game: number;
}

export interface BasketballConfig {
  periods: number;
  period_minutes: number;
  /** Informational point values — scoring uses event payload `points`. */
  points: { field_goal: number; three_pointer: number; free_throw: number };
  overtime_minutes: number;
  timeouts_per_team?: number;
}

export interface BadmintonConfig {
  best_of: number;
  points_to: number;
  win_by: number;
  cap: number;
}

export interface DartsConfig {
  start_score: number;
  double_out: boolean;
  double_in: boolean;
  play_format: "legs" | "sets";
  legs_to_win: number;
  sets_to_win: number;
}

export type SportConfig =
  | FutsalConfig
  | PickleballConfig
  | BasketballConfig
  | BadmintonConfig
  | DartsConfig;

export interface SportPreset<C extends SportConfig = SportConfig> {
  id: SportId;
  label: string;
  icon: string;
  defaultEntrantType: EntrantType;
  entrantTypes: EntrantType[];
  suggestedCategories: Array<{ name: string; entrantType: EntrantType }>;
  config: C;
}

export const SPORT_PRESETS: {
  futsal: SportPreset<FutsalConfig>;
  pickleball: SportPreset<PickleballConfig>;
  basketball: SportPreset<BasketballConfig>;
  badminton: SportPreset<BadmintonConfig>;
  darts: SportPreset<DartsConfig>;
} = {
  futsal: {
    id: "futsal",
    label: "Futsal / Football",
    icon: "Trophy",
    defaultEntrantType: "team",
    entrantTypes: ["team"],
    suggestedCategories: [
      { name: "Open 5v5", entrantType: "team" },
      { name: "Open 7v7", entrantType: "team" },
      { name: "U-18 5v5", entrantType: "team" },
    ],
    config: {
      periods: 2,
      period_minutes: 20,
      points: { goal: 1 },
      cards: ["yellow", "red"],
      tiebreak: "penalties",
      table_points: { win: 3, draw: 1, loss: 0 },
    },
  },
  pickleball: {
    id: "pickleball",
    label: "Pickleball",
    icon: "Zap",
    defaultEntrantType: "doubles",
    entrantTypes: ["singles", "doubles"],
    suggestedCategories: [
      { name: "Men's Doubles", entrantType: "doubles" },
      { name: "Women's Doubles", entrantType: "doubles" },
      { name: "Mixed Doubles", entrantType: "doubles" },
      { name: "Open Singles", entrantType: "singles" },
    ],
    config: {
      best_of: 3,
      points_to: 11,
      win_by: 2,
      scoring: "rally",
      timeouts_per_game: 2,
    },
  },
  basketball: {
    id: "basketball",
    label: "Basketball",
    icon: "Circle",
    defaultEntrantType: "team",
    entrantTypes: ["team"],
    suggestedCategories: [
      { name: "Open 5v5", entrantType: "team" },
      { name: "U-18 5v5", entrantType: "team" },
    ],
    config: {
      periods: 4,
      period_minutes: 10,
      points: { field_goal: 2, three_pointer: 3, free_throw: 1 },
      overtime_minutes: 5,
      timeouts_per_team: 5,
    },
  },
  badminton: {
    id: "badminton",
    label: "Badminton",
    icon: "Feather",
    defaultEntrantType: "doubles",
    entrantTypes: ["singles", "doubles"],
    suggestedCategories: [
      { name: "Men's Doubles", entrantType: "doubles" },
      { name: "Women's Doubles", entrantType: "doubles" },
      { name: "Mixed Doubles", entrantType: "doubles" },
      { name: "Open Singles", entrantType: "singles" },
    ],
    config: {
      best_of: 3,
      points_to: 21,
      win_by: 2,
      cap: 30,
    },
  },
  darts: {
    id: "darts",
    label: "Darts",
    icon: "Target",
    defaultEntrantType: "singles",
    entrantTypes: ["singles", "doubles"],
    suggestedCategories: [
      { name: "Open Singles", entrantType: "singles" },
      { name: "Draw Doubles", entrantType: "doubles" },
      { name: "Rookie Singles", entrantType: "singles" },
    ],
    config: {
      start_score: 501,
      double_out: true,
      double_in: false,
      play_format: "legs",
      legs_to_win: 3,
      sets_to_win: 3,
    },
  },
};

export const SPORT_IDS = Object.keys(SPORT_PRESETS) as SportId[];

export function getSportPreset(sport: string): SportPreset | null {
  const s = sport.toLowerCase().trim();
  if (s === "football") return SPORT_PRESETS.futsal;
  return SPORT_IDS.includes(s as SportId) ? SPORT_PRESETS[s as SportId] : null;
}

/** How many player-name fields the registration form shows per entrant. */
export function playerSlotsFor(entrantType: string): {
  min: number;
  max: number;
} {
  switch (entrantType) {
    case "singles":
      return { min: 1, max: 1 };
    case "doubles":
      return { min: 2, max: 2 };
    case "team":
    default:
      return { min: 1, max: 15 };
  }
}

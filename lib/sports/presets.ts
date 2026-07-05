// SYNC: copied from Fleg-score web 2026-07-04 — keep in sync manually (no edits here)
// ─────────────────────────────────────────────────────────────────────────────
//  Sport presets — single source of truth for the creation wizard and
//  (later, WP-4) match control. Shapes follow PHASE1_BLUEPRINT §8.3.
// ─────────────────────────────────────────────────────────────────────────────

export type SportId = "futsal" | "pickleball";
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
  scoring: "rally";
  timeouts_per_game: number;
}

export type SportConfig = FutsalConfig | PickleballConfig;

export interface SportPreset<C extends SportConfig = SportConfig> {
  id: SportId;
  label: string;
  /** lucide-react icon name — resolved by the UI layer */
  icon: string;
  /** default entrant_type for new categories of this sport */
  defaultEntrantType: EntrantType;
  /** entrant types this sport supports */
  entrantTypes: EntrantType[];
  /** quick-add category suggestions for the wizard */
  suggestedCategories: Array<{ name: string; entrantType: EntrantType }>;
  config: C;
}

export const SPORT_PRESETS: {
  futsal: SportPreset<FutsalConfig>;
  pickleball: SportPreset<PickleballConfig>;
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
};

export const SPORT_IDS = Object.keys(SPORT_PRESETS) as SportId[];

export function getSportPreset(sport: string): SportPreset | null {
  return SPORT_IDS.includes(sport as SportId)
    ? SPORT_PRESETS[sport as SportId]
    : null;
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

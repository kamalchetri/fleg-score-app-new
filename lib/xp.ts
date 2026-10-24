/** Pure XP progression helpers. The total still comes from the existing
 * `my_xp()` RPC; these rules only turn that total into a stable UI model. */
export interface XpProgress {
  total: number;
  level: number;
  title: string;
  levelStart: number;
  nextLevel: number | null;
  progress: number;
  remaining: number;
}

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1_000, 1_500, 2_200, 3_000, 4_000, 5_200, 6_600, 8_200, 10_000, 12_000, 15_000, 18_500, 22_500, 27_000, 32_000, 38_000] as const;
const LEVEL_TITLES = [
  "Newcomer", "Rising player", "Club regular", "Court regular", "Match ready", "Form builder",
  "Competition ready", "Breakthrough", "Contender", "Top form", "Elite competitor", "Champion in the making",
  "State contender", "National contender", "National champion", "Record chaser", "All-round athlete",
  "Hall of fame", "Legend", "FLEG icon",
] as const;

export function xpProgress(value: number | null | undefined): XpProgress {
  const total = Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 0;
  let index = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (total >= LEVEL_THRESHOLDS[i]) index = i;
    else break;
  }
  const levelStart = LEVEL_THRESHOLDS[index];
  const nextLevel = LEVEL_THRESHOLDS[index + 1] ?? null;
  const span = nextLevel == null ? 1 : nextLevel - levelStart;
  const progress = nextLevel == null ? 1 : Math.min(1, Math.max(0, (total - levelStart) / span));
  return { total, level: index + 1, title: LEVEL_TITLES[index] ?? LEVEL_TITLES[LEVEL_TITLES.length - 1], levelStart, nextLevel, progress, remaining: nextLevel == null ? 0 : Math.max(0, nextLevel - total) };
}

export function formatXp(value: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.max(0, Math.floor(value)));
}


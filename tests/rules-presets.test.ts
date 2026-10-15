/**
 * Standard rules presets stay outside the engine types.
 * Run with: npx tsx tests/rules-presets.test.ts
 */

import { parseArcheryConfig } from "../lib/scoring/archery";
import { parseLawnTennisConfig } from "../lib/scoring/lawn-tennis";
import { parseSepaktakrawConfig } from "../lib/scoring/sepaktakraw";
import { parseTableTennisConfig } from "../lib/scoring/table-tennis";
import { parseVolleyballConfig } from "../lib/scoring/volleyball";
import { projectMatchState, type ScoringMatch } from "../lib/scoring/project-match";
import { resolveCategoryMatchEngine, resolveCategorySupport } from "../lib/sports/nspg";
import { SPORT_PRESETS } from "../lib/sports/presets";
import {
  ARCHERY_COMPOUND_PRESET,
  ARCHERY_RECURVE_PRESET,
  BADMINTON_PRESET,
  BASKETBALL_PRESET,
  COMBAT_BOUT_PRESET,
  LAWN_TENNIS_SINGLES_PRESET,
  SEPAKTAKRAW_REGU_PRESET,
  STANDARD_RULES_NOTE,
  TABLE_TENNIS_SINGLES_PRESET,
  VOLLEYBALL_PRESET,
  effectiveSportConfig,
  standardRulesNote,
  standardRulesPreset,
} from "../lib/sports/rules-presets";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (error: unknown) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(row).sort()) out[key] = canonical(row[key]);
    return out;
  }
  return value;
}

function expectEq<T>(actual: T, expected: T, label = ""): void {
  const left = JSON.stringify(canonical(actual));
  const right = JSON.stringify(canonical(expected));
  if (left !== right) throw new Error(`${label ? label + ": " : ""}expected ${right}, got ${left}`);
}

function shell(sport: string, category: string, sportConfig: unknown): ScoringMatch {
  return {
    id: "preset-match",
    status: "live",
    round: 1,
    format_override: null,
    score: null,
    tournament: { id: "preset-tournament", name: "Preset", sport, sport_config: sportConfig },
    stage: { stage_type: "group", config: { rounds: 1 } },
    category: { name: category },
    a: { id: "a", display_name: "A" },
    b: { id: "b", display_name: "B" },
  };
}

test("each preset is pending review and valid for its engine", () => {
  for (const preset of [
    BADMINTON_PRESET,
    BASKETBALL_PRESET,
    TABLE_TENNIS_SINGLES_PRESET,
    VOLLEYBALL_PRESET,
    SEPAKTAKRAW_REGU_PRESET,
    ARCHERY_RECURVE_PRESET,
    ARCHERY_COMPOUND_PRESET,
  ]) {
    expectEq(preset.tcReview, "pending");
  }
  expectEq(COMBAT_BOUT_PRESET.tcReview, "pending");
  expectEq(COMBAT_BOUT_PRESET.rules, null);
  expectEq(LAWN_TENNIS_SINGLES_PRESET, null);
  expectEq(parseTableTennisConfig(TABLE_TENNIS_SINGLES_PRESET.rules), TABLE_TENNIS_SINGLES_PRESET.rules);
  expectEq(parseVolleyballConfig(VOLLEYBALL_PRESET.rules), VOLLEYBALL_PRESET.rules);
  expectEq(parseSepaktakrawConfig(SEPAKTAKRAW_REGU_PRESET.rules), SEPAKTAKRAW_REGU_PRESET.rules);
  expectEq(parseArcheryConfig(ARCHERY_RECURVE_PRESET.rules), ARCHERY_RECURVE_PRESET.rules);
  expectEq(parseArcheryConfig(ARCHERY_COMPOUND_PRESET.rules), ARCHERY_COMPOUND_PRESET.rules);
  expectEq(BADMINTON_PRESET.rules, SPORT_PRESETS.badminton.config);
  expectEq(BASKETBALL_PRESET.rules.periods, 4);
  expectEq(BASKETBALL_PRESET.rules.period_minutes, 10);
  expectEq(parseLawnTennisConfig({}), null);
});

test("empty supported configs use a preset and invalid configs do not", () => {
  const singles = shell("table_tennis", "Women's Singles", {});
  const table = projectMatchState(singles, []);
  expectEq(table?.detail.sport, "table_tennis");
  expectEq(standardRulesNote("table_tennis", "Women's Singles", {}), STANDARD_RULES_NOTE);
  const invalid = { best_of: 2, points_to: 11, win_by: 2 };
  expectEq(effectiveSportConfig("table_tennis", "Men's Singles", invalid), invalid);
  expectEq(projectMatchState(shell("table_tennis", "Men's Singles", invalid), []), null);
  expectEq(standardRulesNote("table_tennis", "Men's Singles", invalid), null);
  expectEq(resolveCategoryMatchEngine("table_tennis", "Men's Doubles"), null);
  expectEq(projectMatchState(shell("table_tennis", "Men's Doubles", {}), []), null);

  const volley = projectMatchState(shell("volleyball", "Men", null), []);
  expectEq(volley?.detail.sport, "volleyball");
  if (volley?.detail.sport !== "volleyball") throw new Error("volleyball");
  expectEq(volley.detail.setsNeeded, 3);
  expectEq(volley.detail.cap, null);

  const regu = projectMatchState(shell("sepaktakraw", "Regu", {}), []);
  if (regu?.detail.sport !== "sepaktakraw") throw new Error("regu");
  expectEq(regu.detail.pointsTo, 21);
  expectEq(regu.detail.cap, 25);
  expectEq(projectMatchState(shell("sepaktakraw", "Double", {}), []), null);

  const recurve = projectMatchState(shell("archery", "Recurve Olympic Round", {}), []);
  expectEq(recurve?.detail.sport === "archery" && recurve.detail.format, "set_points");
  const compound = projectMatchState(shell("archery", "Compound Head-to-Head", {}), []);
  expectEq(compound?.detail.sport === "archery" && compound.detail.format, "cumulative");
  expectEq(projectMatchState(shell("archery", "Olympic Round", {}), []), null);
  expectEq(projectMatchState(shell("archery", "Ranking Round", {}), []), null);
  expectEq(projectMatchState(shell("archery", "Indian Round", {}), []), null);
  expectEq(resolveCategorySupport("table_tennis", "Men's Singles", {}), "structured");
});

test("lawn tennis and unsupported categories stay closed", () => {
  expectEq(standardRulesPreset("lawn_tennis", "Men's Singles"), null);
  expectEq(effectiveSportConfig("lawn_tennis", "Men's Singles", {}), {});
  expectEq(projectMatchState(shell("lawn_tennis", "Men's Singles", {}), []), null);
  expectEq(standardRulesNote("lawn_tennis", "Men's Singles", {}), null);
  expectEq(projectMatchState(shell("lawn_tennis", "Men's Doubles", {}), []), null);
  expectEq(projectMatchState(shell("athletics", "100m", {}), []), null);
  expectEq(standardRulesNote("athletics", "100m", {}), null);
  expectEq(standardRulesNote("boxing", "Flyweight", {}), STANDARD_RULES_NOTE);
  expectEq(standardRulesNote("wushu", "Sanda", {}), STANDARD_RULES_NOTE);
  expectEq(standardRulesNote("wushu", "Taolu", {}), null);
  expectEq(standardRulesNote("pencak_silat", "Tanding", {}), STANDARD_RULES_NOTE);
  expectEq(standardRulesNote("pencak_silat", "Artistic", {}), null);
});

test("an explicit different rules object is kept and a stored preset is labelled", () => {
  const custom = {
    best_of_sets: 3,
    regular_set_points_to: 25,
    deciding_set_points_to: 15,
    win_by: 2,
    regular_set_cap: null,
    deciding_set_cap: null,
  };
  expectEq(effectiveSportConfig("volleyball", "Women", custom), custom);
  expectEq(standardRulesNote("volleyball", "Women", custom), null);
  const state = projectMatchState(shell("volleyball", "Women", custom), []);
  if (state?.detail.sport !== "volleyball") throw new Error("custom volleyball");
  expectEq(state.detail.setsNeeded, 2);
  expectEq(standardRulesNote("badminton", "Open Singles", BADMINTON_PRESET.rules), STANDARD_RULES_NOTE);
  expectEq(standardRulesNote("basketball", "Open 5v5", BASKETBALL_PRESET.rules), STANDARD_RULES_NOTE);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

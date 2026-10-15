import {
  computeArcheryState,
  computeCombatState,
  computeMatchStateForStage,
  computeLawnTennisState,
  computeTableTennisState,
  computeSepaktakrawState,
  computeVolleyballState,
  parseArcheryConfig,
  parseLawnTennisConfig,
  parseSepaktakrawConfig,
  parseTableTennisConfig,
  parseVolleyballConfig,
  resolveStageContext,
  type MatchState,
  type ScoringEvent,
} from "@/lib/scoring";
import { resolveCategoryMatchEngine, type CategoryMatchEngine } from "@/lib/sports/nspg";
import { effectiveSportConfig } from "@/lib/sports/rules-presets";

/** Fields the scoring view needs. Production matches and lab fixtures both satisfy this. */
export interface ScoringMatch {
  id: string;
  status: string;
  round: number;
  format_override: Partial<{
    best_of: number;
    points_to: number;
    win_by: number;
    legs_to_win: number;
  }> | null;
  score: unknown;
  tournament: { id: string; name: string; sport: string; sport_config: unknown } | null;
  stage: { stage_type: string; config: { rounds?: number } | null } | null;
  category: { name: string } | null;
  a: { id: string; display_name: string } | null;
  b: { id: string; display_name: string } | null;
}

export function matchEngine(match: ScoringMatch): CategoryMatchEngine | null {
  if (!match.tournament) return null;
  return resolveCategoryMatchEngine(match.tournament.sport, match.category?.name);
}

export function projectMatchState(match: ScoringMatch, events: ScoringEvent[]): MatchState | null {
  if (!match.tournament) return null;
  const engine = resolveCategoryMatchEngine(match.tournament.sport, match.category?.name);
  if (!engine) return null;
  const sportConfig = effectiveSportConfig(
    match.tournament.sport,
    match.category?.name,
    match.tournament.sport_config,
  );
  if (engine === "combat") return computeCombatState(events);
  if (engine === "table_tennis") {
    const rules = parseTableTennisConfig(sportConfig);
    if (!rules) return null;
    return computeTableTennisState(rules, events);
  }
  if (engine === "lawn_tennis") {
    const rules = parseLawnTennisConfig(sportConfig);
    if (!rules) return null;
    return computeLawnTennisState(rules, events);
  }
  if (engine === "volleyball") {
    const rules = parseVolleyballConfig(sportConfig);
    if (!rules) return null;
    return computeVolleyballState(rules, events);
  }
  if (engine === "sepaktakraw") {
    const rules = parseSepaktakrawConfig(sportConfig);
    if (!rules) return null;
    return computeSepaktakrawState(rules, events);
  }
  if (engine === "archery") {
    const rules = parseArcheryConfig(sportConfig);
    if (!rules) return null;
    return computeArcheryState(rules, events);
  }
  const stage = resolveStageContext({
    stageType: match.stage?.stage_type,
    stageConfig: match.stage?.config,
    matchRound: match.round,
  });
  return computeMatchStateForStage(match.tournament.sport, sportConfig, events, {
    ...stage,
    override: match.format_override,
  });
}

export interface PublishDraft {
  name: string;
  sport: string;
  venue: string | null;
  city: string | null;
  approvedEntrants: number;
  fixtureCount: number;
  unscheduledFixtures: number;
  unassignedReferees: number;
  rulesConfigured: boolean;
  rankedRulesConfigured: boolean;
  usesRankedResults: boolean;
  productionPersistenceEnabled: boolean;
}

export type PublishFailure =
  | "missing_tournament_details"
  | "missing_venue_or_city"
  | "no_approved_entrants"
  | "no_fixtures"
  | "fixtures_unscheduled"
  | "referees_unassigned"
  | "rules_not_configured"
  | "ranked_rules_not_configured"
  | "persistence_disabled";

export interface PublishValidation {
  ok: boolean;
  failures: PublishFailure[];
}

/** Shared fail-closed checks for the UI and the future publish RPC. */
export function validatePublishDraft(draft: PublishDraft): PublishValidation {
  const failures: PublishFailure[] = [];
  if (!draft.name.trim() || !draft.sport.trim()) failures.push("missing_tournament_details");
  if (!draft.venue?.trim() || !draft.city?.trim()) failures.push("missing_venue_or_city");
  if (draft.approvedEntrants < 2) failures.push("no_approved_entrants");
  if (draft.fixtureCount < 1) failures.push("no_fixtures");
  if (draft.unscheduledFixtures > 0) failures.push("fixtures_unscheduled");
  if (draft.unassignedReferees > 0) failures.push("referees_unassigned");
  if (!draft.rulesConfigured) failures.push("rules_not_configured");
  if (draft.usesRankedResults && !draft.rankedRulesConfigured) failures.push("ranked_rules_not_configured");
  if (!draft.productionPersistenceEnabled) failures.push("persistence_disabled");
  return { ok: failures.length === 0, failures };
}

import type { GeneratedFixture, OrganiserOfficial, OrganiserTournament, OrganiserVenue } from "@/lib/nspg-organiser";

export interface OrganiserDraftInput {
  tournament: OrganiserTournament;
  venues: OrganiserVenue[];
  fixtures: GeneratedFixture[];
  officials: Record<string, OrganiserOfficial>;
}

export interface OrganiserPersistence {
  saveDraft(input: OrganiserDraftInput): Promise<void>;
  publish(input: OrganiserDraftInput): Promise<{ published: boolean; reason?: string }>;
}

/** Seed adapter used by the review build; it never contacts Supabase. */
const seedPersistence: OrganiserPersistence = {
  async saveDraft() {},
  async publish() { return { published: false, reason: "production_persistence_disabled" }; },
};

/** Production remains opt-in until the reviewed RPC migration is deployed. */
export function getOrganiserPersistence(mode: "seed" | "production" = "seed"): OrganiserPersistence {
  if (mode === "seed") return seedPersistence;
  return {
    async saveDraft() { throw new Error("organiser_persistence_not_deployed"); },
    async publish() { throw new Error("organiser_persistence_not_deployed"); },
  };
}

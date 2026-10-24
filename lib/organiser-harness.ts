import { validatePublishDraft, type PublishDraft } from "@/lib/organiser-publish";

export interface HarnessState {
  draft: PublishDraft;
  appliedKeys: Set<string>;
  revision: number;
}

export type HarnessMutation =
  | { type: "set_schedule"; count: number }
  | { type: "set_referees"; count: number }
  | { type: "add_fixture"; key: string };

export function applyHarnessMutation(state: HarnessState, mutation: HarnessMutation): HarnessState {
  const next: HarnessState = { draft: { ...state.draft }, appliedKeys: new Set(state.appliedKeys), revision: state.revision };
  if (mutation.type === "set_schedule") next.draft.unscheduledFixtures = mutation.count;
  if (mutation.type === "set_referees") next.draft.unassignedReferees = mutation.count;
  if (mutation.type === "add_fixture") {
    if (next.appliedKeys.has(mutation.key)) return state;
    next.appliedKeys.add(mutation.key);
    next.draft.fixtureCount += 1;
  }
  next.revision += 1;
  return next;
}

export function publishHarness(state: HarnessState): HarnessState {
  const result = validatePublishDraft(state.draft);
  if (!result.ok) throw new Error(`publish_blocked:${result.failures.join(",")}`);
  return { ...state, revision: state.revision + 1 };
}

// SYNC: copied from Fleg-score web 2026-07-13 — keep in sync manually (no edits here)
// Pure groups→knockout helpers: snake-seeded group split, per-group round
// robin fixtures, and advancement into the existing knockout generator.
//
// Cross-seeding pattern (documented): qualifiers are assigned effective
// knockout seeds in rank blocks — all group winners first (in group order
// A, B, C…), then all runners-up (in group order), and so on. With the
// standard seedOrder placement this yields A1 vs B2 / B1 vs A2 for two
// groups, and no same-group round-1 meetings for 2 or 4 groups. For other
// group counts a best-effort collision pass swaps runner-up slots within
// round 1 to avoid same-group rematches where possible.
//
// SYNC-candidate: dependency-free (imports only sibling pure modules).

import {
  generateKnockoutBracket,
  type BracketEntrant,
  type KnockoutBracket,
} from "../bracket/knockout";
import { generateRoundRobin, type RoundRobinPairing } from "./roundrobin";

export interface GroupConfig {
  /** Provide exactly one of groupCount / groupSize. */
  groupCount?: number;
  groupSize?: number;
  /** Qualifiers per group for the knockout stage. */
  advancePerGroup: number;
  doubleRoundRobin?: boolean;
}

export interface GroupFixtures {
  /** "A", "B", … */
  name: string;
  entrantIds: string[];
  rounds: number;
  pairings: RoundRobinPairing[];
}

export const GROUP_NAMES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function resolveGroupCount(
  entrantCount: number,
  cfg: Pick<GroupConfig, "groupCount" | "groupSize">,
): number {
  const count = cfg.groupCount ?? Math.ceil(entrantCount / (cfg.groupSize ?? 4));
  if (count < 1) throw new Error("Group count must be at least 1.");
  if (count > GROUP_NAMES.length) throw new Error("Too many groups.");
  if (entrantCount / count < 2) {
    throw new Error("Each group needs at least 2 entrants.");
  }
  return count;
}

/**
 * Snake distribution by seed: entrants must be pre-sorted best-first.
 * 3 groups: 1→A 2→B 3→C 4→C 5→B 6→A 7→A …
 */
export function splitIntoGroups(
  entrantIds: string[],
  cfg: Pick<GroupConfig, "groupCount" | "groupSize">,
): string[][] {
  const count = resolveGroupCount(entrantIds.length, cfg);
  const groups: string[][] = Array.from({ length: count }, () => []);
  entrantIds.forEach((id, i) => {
    const lap = Math.floor(i / count);
    const idx = i % count;
    groups[lap % 2 === 0 ? idx : count - 1 - idx].push(id);
  });
  return groups;
}

/** Group split + a round robin inside each group. */
export function generateGroupStage(
  entrantIds: string[],
  cfg: GroupConfig,
): GroupFixtures[] {
  const groups = splitIntoGroups(entrantIds, cfg);
  for (const g of groups) {
    if (g.length <= cfg.advancePerGroup) {
      throw new Error(
        `advancePerGroup (${cfg.advancePerGroup}) must be smaller than the smallest group (${g.length}).`,
      );
    }
  }
  return groups.map((ids, i) => {
    const rr = generateRoundRobin(ids, {
      doubleRoundRobin: cfg.doubleRoundRobin,
    });
    return {
      name: GROUP_NAMES[i],
      entrantIds: ids,
      rounds: rr.rounds,
      pairings: rr.pairings,
    };
  });
}

export interface GroupQualifier {
  /** 0-based group index (A = 0). */
  group: number;
  /** 1-based rank within the group standings. */
  rank: number;
  entrantId: string;
}

/**
 * Order qualifiers into effective knockout seeds: rank blocks, group order
 * inside each block. Returns BracketEntrant[] ready for the knockout
 * generator (seed = position).
 */
export function knockoutSeedsFromGroups(
  qualifiers: GroupQualifier[],
): BracketEntrant[] {
  const sorted = [...qualifiers].sort(
    (a, b) => a.rank - b.rank || a.group - b.group,
  );
  return sorted.map((q, i) => ({ id: q.entrantId, seed: i + 1 }));
}

/**
 * Build the knockout bracket from group results, avoiding same-group
 * round-1 meetings where a swap can fix them.
 */
export function advanceFromGroups(
  qualifiers: GroupQualifier[],
): KnockoutBracket {
  const groupOf = new Map(qualifiers.map((q) => [q.entrantId, q.group]));
  const bracket = generateKnockoutBracket(knockoutSeedsFromGroups(qualifiers));

  const round1 = bracket.matches.filter((m) => m.round === 1);
  const sameGroup = (m: { entrantA: string | null; entrantB: string | null }) =>
    m.entrantA !== null &&
    m.entrantB !== null &&
    groupOf.get(m.entrantA) === groupOf.get(m.entrantB);

  for (const m of round1) {
    if (!sameGroup(m)) continue;
    for (const other of round1) {
      if (other === m || other.entrantB === null) continue;
      const a = m.entrantB;
      const b = other.entrantB;
      m.entrantB = b;
      other.entrantB = a;
      if (!sameGroup(m) && !sameGroup(other)) break; // swap fixed it
      m.entrantB = a; // revert
      other.entrantB = b;
    }
  }
  return bracket;
}

// SYNC: copied from Fleg-score web 2026-07-13 — keep in sync manually (no edits here)
// Pure round-robin fixture generator (circle method). No I/O — returns
// round-numbered pairings for the caller to insert as match rows.
//
// Deterministic: same input order → same fixtures. Entrants should be
// pre-sorted by the caller (seed asc, then registration order).
//
// Odd entrant counts get a phantom BYE slot; pairings against BYE are
// omitted from the output (that entrant simply rests that round).
//
// SYNC-candidate: dependency-free, will be copied into the Fleg Score app.

export interface RoundRobinPairing {
  round: number; // 1-based
  position: number; // 0-based within the round
  entrantA: string;
  entrantB: string;
}

export interface RoundRobinFixtures {
  rounds: number;
  matchesPerEntrant: number;
  pairings: RoundRobinPairing[];
}

/**
 * Circle method: entrant 0 is fixed, the rest rotate clockwise each round.
 * n entrants (padded to even with a BYE) → n-1 rounds of n/2 pairings.
 * With `doubleRoundRobin`, a mirrored second leg (A/B swapped) follows.
 */
export function generateRoundRobin(
  entrantIds: string[],
  opts: { doubleRoundRobin?: boolean } = {},
): RoundRobinFixtures {
  if (entrantIds.length < 2) {
    throw new Error("At least 2 entrants are required for a round robin.");
  }
  const ids: (string | null)[] = [...entrantIds];
  if (ids.length % 2 === 1) ids.push(null); // BYE

  const n = ids.length;
  const roundsPerLeg = n - 1;
  const half = n / 2;

  // rotation[0] stays fixed; the remaining n-1 slots rotate.
  const rotation = [...ids];
  const pairings: RoundRobinPairing[] = [];

  for (let r = 1; r <= roundsPerLeg; r++) {
    let position = 0;
    for (let i = 0; i < half; i++) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (a !== null && b !== null) {
        // Alternate home/away for the fixed seat so entrant 0 isn't always A.
        const swap = i === 0 && r % 2 === 0;
        pairings.push({
          round: r,
          position: position++,
          entrantA: swap ? b : a,
          entrantB: swap ? a : b,
        });
      }
    }
    // Rotate: slot 0 fixed, last moves to slot 1.
    rotation.splice(1, 0, rotation.pop() as string | null);
  }

  if (opts.doubleRoundRobin) {
    const firstLeg = [...pairings];
    for (const p of firstLeg) {
      pairings.push({
        round: p.round + roundsPerLeg,
        position: p.position,
        entrantA: p.entrantB, // mirrored leg swaps sides
        entrantB: p.entrantA,
      });
    }
  }

  const legs = opts.doubleRoundRobin ? 2 : 1;
  return {
    rounds: roundsPerLeg * legs,
    matchesPerEntrant: (entrantIds.length - 1) * legs,
    pairings,
  };
}

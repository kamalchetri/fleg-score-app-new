// SYNC: copied from Fleg-score web 2026-07-13 — keep in sync manually (no edits here)
// Pure single-elimination bracket generator. No I/O — returns the stage
// config and match rows for the caller to insert.
//
// Standard seeding: 1 v n, 2 v (n-1), ... placed so seeds 1 and 2 can only
// meet in the final. Byes (when entrant count isn't a power of two) pair with
// the top seeds and advance automatically as walkovers.

export interface BracketEntrant {
  id: string;
  /** Lower = better. Unseeded entrants keep their input order after seeded ones. */
  seed: number | null;
}

export interface BracketMatch {
  round: number; // 1-based; 1 = first round
  position: number; // 0-based within the round
  entrantA: string | null;
  entrantB: string | null;
  /** 'walkover' for auto-advanced byes, otherwise 'scheduled'. */
  status: "scheduled" | "walkover";
  winnerId: string | null;
}

export interface KnockoutBracket {
  rounds: number;
  bracketSize: number;
  stageConfig: { bracket_size: number; entrant_count: number };
  matches: BracketMatch[];
}

/**
 * Seed placement order for a bracket of `size` (power of two): returns seed
 * numbers (1-based) in slot order, e.g. size 8 → [1,8,4,5,2,7,3,6].
 */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const next: number[] = [];
    const target = order.length * 2 + 1;
    for (const s of order) {
      next.push(s, target - s);
    }
    order = next;
  }
  return order;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Builds the full bracket. Entrants should be pre-sorted by preference
 * (seeded first by seed asc, then registration order); they are assigned
 * effective seeds 1..n in that order.
 */
export function generateKnockoutBracket(
  entrants: BracketEntrant[],
): KnockoutBracket {
  if (entrants.length < 2) {
    throw new Error("At least 2 entrants are required to build a bracket.");
  }

  const sorted = [...entrants].sort((x, y) => {
    if (x.seed != null && y.seed != null) return x.seed - y.seed;
    if (x.seed != null) return -1;
    if (y.seed != null) return 1;
    return 0; // stable sort keeps input order for unseeded
  });

  const size = nextPowerOfTwo(sorted.length);
  const rounds = Math.log2(size);
  const slots = seedOrder(size).map(
    (seedNum) => sorted[seedNum - 1]?.id ?? null,
  );

  const matches: BracketMatch[] = [];

  // Round 1 from slot pairs.
  const round1: BracketMatch[] = [];
  for (let p = 0; p < size / 2; p++) {
    const a = slots[p * 2];
    const b = slots[p * 2 + 1];
    const isBye = a === null || b === null;
    round1.push({
      round: 1,
      position: p,
      entrantA: a,
      entrantB: b,
      status: isBye ? "walkover" : "scheduled",
      winnerId: isBye ? (a ?? b) : null,
    });
  }
  matches.push(...round1);

  // Later rounds: empty, then propagate walkover winners forward.
  let prev = round1;
  for (let r = 2; r <= rounds; r++) {
    const count = size / 2 ** r;
    const current: BracketMatch[] = [];
    for (let p = 0; p < count; p++) {
      current.push({
        round: r,
        position: p,
        entrantA: null,
        entrantB: null,
        status: "scheduled",
        winnerId: null,
      });
    }
    for (const m of prev) {
      if (m.winnerId) {
        const target = current[Math.floor(m.position / 2)];
        if (m.position % 2 === 0) target.entrantA = m.winnerId;
        else target.entrantB = m.winnerId;
      }
    }
    matches.push(...current);
    prev = current;
  }

  return {
    rounds,
    bracketSize: size,
    stageConfig: { bracket_size: size, entrant_count: sorted.length },
    matches,
  };
}

/** Round label helper shared by hub + public bracket views. */
export function roundLabel(round: number, totalRounds: number): string {
  const remaining = totalRounds - round;
  if (remaining === 0) return "Final";
  if (remaining === 1) return "Semifinals";
  if (remaining === 2) return "Quarterfinals";
  return `Round ${round}`;
}

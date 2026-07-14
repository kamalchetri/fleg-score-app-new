// SYNC: copied from Fleg-score web 2026-07-13 — keep in sync manually (no edits here)
// Maps DB match rows (score jsonb {a, b, display}) to the pure standings
// engine's input shape. Shared by the hub Fixtures tab and the public page.

import type { StandingsMatch } from "./standings";

export interface DbMatchLike {
  entrant_a: string | null;
  entrant_b: string | null;
  status: string;
  winner_id: string | null;
  score: unknown;
}

export function toStandingsMatches(rows: DbMatchLike[]): StandingsMatch[] {
  return rows
    .filter((m) => m.entrant_a && m.entrant_b)
    .map((m) => {
      const score = (m.score ?? {}) as { a?: number; b?: number };
      return {
        entrantA: m.entrant_a as string,
        entrantB: m.entrant_b as string,
        status: m.status,
        winnerId: m.winner_id,
        scoreA: typeof score.a === "number" ? score.a : 0,
        scoreB: typeof score.b === "number" ? score.b : 0,
      };
    });
}

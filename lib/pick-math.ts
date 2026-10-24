export type PickMathSide = "a" | "b";
export interface PickMathTally { match_id: string; a_count: number; b_count: number; total: number; }

/** Apply a pick immediately while the tally read view catches up. */
export function optimisticPickTally(tally: PickMathTally, previous: PickMathSide | null, next: PickMathSide): PickMathTally {
  if (previous === next) return tally;
  const a = tally.a_count + (next === "a" ? 1 : previous === "a" ? -1 : 0);
  const b = tally.b_count + (next === "b" ? 1 : previous === "b" ? -1 : 0);
  const total = Math.max(0, tally.total + (previous == null ? 1 : 0));
  return { ...tally, a_count: Math.max(0, a), b_count: Math.max(0, b), total: Math.max(total, Math.max(0, a) + Math.max(0, b)) };
}


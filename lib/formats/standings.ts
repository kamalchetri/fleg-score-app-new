// SYNC: copied from Fleg-score web 2026-07-13 — keep in sync manually (no edits here)
// Pure standings computation for league / group stages. Standings are
// COMPUTED, never stored — derive from completed matches on every read.
//
// Ranking config comes from the sport preset:
//   - futsal: table_points {win:3, draw:1, loss:0}, draws allowed
//   - pickleball: no draws; ranking by match wins (win=1 point)
//
// Tiebreakers, in order (documented, stable):
//   1. points
//   2. head-to-head points among the tied entrants only
//   3. overall score difference
//   4. overall score for
//   5. alphabetical by entrant name (case-insensitive), then by id
//
// Walkovers count as a win/loss with whatever score the match carries
// (typically 0-0) — they affect points and W/L, not score-for.
//
// SYNC-candidate: dependency-free, will be copied into the Fleg Score app.

export interface StandingsEntrant {
  id: string;
  name: string;
}

/** Minimal completed-match shape; caller maps DB rows (score json → numbers). */
export interface StandingsMatch {
  entrantA: string;
  entrantB: string;
  /** Only 'completed' and 'walkover' matches count toward the table. */
  status: string;
  winnerId: string | null; // null = draw (futsal only)
  scoreA: number;
  scoreB: number;
}

export interface StandingsConfig {
  /** Points per result. Omit `draw` (or set drawsAllowed false) for win/loss sports. */
  tablePoints: { win: number; draw: number; loss: number };
  drawsAllowed: boolean;
}

/** Derive a StandingsConfig from a sport preset config (presets.ts shape). */
export function standingsConfigForSport(sportConfig: {
  table_points?: { win: number; draw: number; loss: number };
}): StandingsConfig {
  if (sportConfig.table_points) {
    return { tablePoints: sportConfig.table_points, drawsAllowed: true };
  }
  // Rally sports (pickleball): rank by match wins.
  return { tablePoints: { win: 1, draw: 0, loss: 0 }, drawsAllowed: false };
}

export interface StandingsRow {
  entrantId: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  scoreFor: number;
  scoreAgainst: number;
  diff: number;
  points: number;
  /** 1-based position after all tiebreakers. */
  rank: number;
}

const COUNTED = new Set(["completed", "walkover"]);

function tally(
  entrants: StandingsEntrant[],
  matches: StandingsMatch[],
  cfg: StandingsConfig,
): Map<string, StandingsRow> {
  const rows = new Map<string, StandingsRow>();
  for (const e of entrants) {
    rows.set(e.id, {
      entrantId: e.id,
      name: e.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      diff: 0,
      points: 0,
      rank: 0,
    });
  }
  for (const m of matches) {
    if (!COUNTED.has(m.status)) continue;
    const a = rows.get(m.entrantA);
    const b = rows.get(m.entrantB);
    if (!a || !b) continue; // match outside this entrant set
    a.played++;
    b.played++;
    a.scoreFor += m.scoreA;
    a.scoreAgainst += m.scoreB;
    b.scoreFor += m.scoreB;
    b.scoreAgainst += m.scoreA;
    if (m.winnerId === null) {
      if (!cfg.drawsAllowed) continue; // malformed for this sport; ignore result
      a.drawn++;
      b.drawn++;
      a.points += cfg.tablePoints.draw;
      b.points += cfg.tablePoints.draw;
    } else {
      const winner = m.winnerId === m.entrantA ? a : b;
      const loser = winner === a ? b : a;
      winner.won++;
      winner.points += cfg.tablePoints.win;
      loser.lost++;
      loser.points += cfg.tablePoints.loss;
    }
  }
  for (const r of rows.values()) r.diff = r.scoreFor - r.scoreAgainst;
  return rows;
}

/**
 * Ordered standings table. Stable and deterministic for identical input.
 */
export function computeStandings(
  matches: StandingsMatch[],
  entrants: StandingsEntrant[],
  cfg: StandingsConfig,
): StandingsRow[] {
  const rows = tally(entrants, matches, cfg);
  const list = [...rows.values()];

  // Pre-sort by the overall criteria so tied blocks are contiguous.
  const overall = (x: StandingsRow, y: StandingsRow) =>
    y.points - x.points ||
    y.diff - x.diff ||
    y.scoreFor - x.scoreFor ||
    x.name.localeCompare(y.name, undefined, { sensitivity: "base" }) ||
    x.entrantId.localeCompare(y.entrantId);
  list.sort(overall);

  // Head-to-head applies between points-tied blocks, before diff/for.
  const result: StandingsRow[] = [];
  let i = 0;
  while (i < list.length) {
    let j = i;
    while (j < list.length && list[j].points === list[i].points) j++;
    const block = list.slice(i, j);
    if (block.length > 1) {
      const ids = new Set(block.map((r) => r.entrantId));
      const h2h = tally(
        block.map((r) => ({ id: r.entrantId, name: r.name })),
        matches.filter((m) => ids.has(m.entrantA) && ids.has(m.entrantB)),
        cfg,
      );
      block.sort(
        (x, y) =>
          (h2h.get(y.entrantId)!.points - h2h.get(x.entrantId)!.points) ||
          overall(x, y),
      );
    }
    result.push(...block);
    i = j;
  }

  result.forEach((r, idx) => (r.rank = idx + 1));
  return result;
}

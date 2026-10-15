// Pure darts scoring engine — 501 down, double-out, legs & sets.
// Event vocabulary:
//   visit  payload { side, score, darts?, checkout? }
//   undo   cancels the latest not-yet-undone visit

import type { DartsConfig } from "@/lib/sports/presets";
import {
  resolveUndos,
  sideFromPayload,
  type DartsDetail,
  type DartsVisit,
  type MatchState,
  type ScoringEvent,
  type Side,
} from "./types";

const UNDOABLE = new Set(["visit"]);

function num(v: unknown, dflt = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : dflt;
}

export function computeDartsState(
  config: DartsConfig,
  events: ScoringEvent[],
): MatchState {
  const startScore = config.start_score || 501;
  const legsToWin = Math.max(1, config.legs_to_win || 3);
  const usesSets = config.play_format === "sets";
  const setsToWin = usesSets ? Math.max(1, config.sets_to_win || 3) : 1;

  const effective = resolveUndos(events, UNDOABLE);

  const setsWon = { a: 0, b: 0 };
  const completedSets: Array<{ a: number; b: number }> = [];
  let legsWon = { a: 0, b: 0 };
  let remaining = { a: startScore, b: startScore };
  let legVisits: DartsVisit[] = [];
  let legDarts = { a: 0, b: 0 };
  let matchWinner: Side | null = null;

  const oneEighties = { a: 0, b: 0 };
  const highCheckout = { a: 0, b: 0 };
  const bestLegDarts = { a: 0, b: 0 };
  const nineDartLegs = { a: 0, b: 0 };
  const totalScored = { a: 0, b: 0 };
  const totalDarts = { a: 0, b: 0 };

  let legIndexOverall = 0;
  function starterOfLeg(i: number): Side {
    return i % 2 === 0 ? "a" : "b";
  }

  function endLeg(winner: Side) {
    legsWon[winner] += 1;
    const d = legDarts[winner];
    if (d > 0 && (bestLegDarts[winner] === 0 || d < bestLegDarts[winner])) {
      bestLegDarts[winner] = d;
    }
    if (d === 9) nineDartLegs[winner] += 1;

    if (usesSets) {
      if (legsWon[winner] >= legsToWin) {
        setsWon[winner] += 1;
        completedSets.push({ ...legsWon });
        legsWon = { a: 0, b: 0 };
        if (setsWon[winner] >= setsToWin) matchWinner = winner;
      }
    } else if (legsWon[winner] >= legsToWin) {
      matchWinner = winner;
    }

    remaining = { a: startScore, b: startScore };
    legVisits = [];
    legDarts = { a: 0, b: 0 };
    legIndexOverall += 1;
  }

  for (const ev of effective) {
    if (ev.event_type !== "visit") continue;
    if (matchWinner) break;
    const side = sideFromPayload(ev.payload);
    if (!side) continue;

    const rawScore = num(ev.payload["score"]);
    const darts = Math.min(3, Math.max(1, num(ev.payload["darts"], 3)));
    const claimedCheckout = ev.payload["checkout"] === true;

    const before = remaining[side];
    const after = before - rawScore;

    const isCheckout = claimedCheckout && after === 0 && config.double_out;
    const bust =
      rawScore > before ||
      after < 0 ||
      after === 1 ||
      (after === 0 && !isCheckout);

    totalDarts[side] += darts;
    legDarts[side] += darts;
    const effScore = bust ? 0 : rawScore;
    totalScored[side] += effScore;
    if (!bust && rawScore === 180) oneEighties[side] += 1;

    legVisits.push({
      side,
      score: rawScore,
      darts,
      bust,
      checkout: isCheckout,
      remainingAfter: bust ? before : after,
    });

    if (!bust) {
      remaining[side] = after;
      if (isCheckout) {
        if (rawScore > highCheckout[side]) highCheckout[side] = rawScore;
        endLeg(side);
      }
    }
  }

  const isComplete = matchWinner !== null;
  const scoreSummary = usesSets ? { ...setsWon } : { ...legsWon };

  function avg(side: Side): number {
    return totalDarts[side] > 0
      ? Math.round((totalScored[side] / totalDarts[side]) * 3 * 100) / 100
      : 0;
  }

  const detail: DartsDetail = {
    sport: "darts",
    startScore,
    doubleOut: config.double_out,
    playFormat: config.play_format,
    legsToWin,
    setsToWin: usesSets ? setsToWin : null,
    setsWon: { ...setsWon },
    legsWon: { ...legsWon },
    completedSets,
    remaining: { ...remaining },
    legVisits,
    throwerSide: nextThrower(legVisits, starterOfLeg(legIndexOverall)),
    stats: {
      oneEighties: { ...oneEighties },
      highCheckout: { ...highCheckout },
      bestLegDarts: { ...bestLegDarts },
      nineDartLegs: { ...nineDartLegs },
      threeDartAvg: { a: avg("a"), b: avg("b") },
    },
  };

  const display = usesSets
    ? `${setsWon.a}-${setsWon.b} (legs ${legsWon.a}-${legsWon.b})`
    : `${legsWon.a}-${legsWon.b}`;

  return { scoreSummary, isComplete, winnerSide: matchWinner, display, detail };
}

function nextThrower(legVisits: DartsVisit[], starter: Side): Side {
  const other: Side = starter === "a" ? "b" : "a";
  return legVisits.length % 2 === 0 ? starter : other;
}

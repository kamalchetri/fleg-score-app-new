// Pure basketball scoring engine — quarters + overtime, no draws.
// Event vocabulary:
//   point         payload { side, points: 1|2|3, player? }
//   foul          payload { side, player? }
//   period_start  payload {}
//   period_end    payload {}
//   timeout       payload { side }  (optional)
//   undo          reverts latest point / foul / timeout

import type { BasketballConfig } from "@/lib/sports/presets";
import {
  resolveUndos,
  sideFromPayload,
  type BasketballDetail,
  type BasketballPointEvent,
  type MatchState,
  type ScoringEvent,
  type Side,
} from "./types";

const UNDOABLE = new Set(["point", "foul", "timeout"]);

function strField(payload: Record<string, unknown>, key: string): string | null {
  const v = payload[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function pointValue(payload: Record<string, unknown>): 1 | 2 | 3 | null {
  const p = payload["points"];
  if (p === 1 || p === 2 || p === 3) return p;
  return null;
}

export function computeBasketballState(
  config: BasketballConfig,
  events: ScoringEvent[],
): MatchState {
  const regulationPeriods = config.periods;
  const effective = resolveUndos(events, UNDOABLE);

  const totals = { a: 0, b: 0 };
  const fouls = { a: 0, b: 0 };
  const timeouts = { a: 0, b: 0 };
  const lineScores: Array<{ a: number; b: number }> = [];
  const pointEvents: BasketballPointEvent[] = [];
  let currentQuarter = { a: 0, b: 0 };
  let currentPeriod: number | null = null;
  let periodStartedAt: string | null = null;
  let periodsCompleted = 0;

  for (const ev of effective) {
    if (ev.event_type === "period_start") {
      if (currentPeriod === null) {
        currentPeriod = periodsCompleted + 1;
        periodStartedAt = ev.created_at;
        currentQuarter = { a: 0, b: 0 };
      }
    } else if (ev.event_type === "period_end") {
      if (currentPeriod !== null) {
        lineScores.push({ ...currentQuarter });
        periodsCompleted += 1;
        currentPeriod = null;
        periodStartedAt = null;
        currentQuarter = { a: 0, b: 0 };
      }
    } else if (ev.event_type === "point") {
      const side = sideFromPayload(ev.payload);
      const pts = pointValue(ev.payload);
      if (!side || !pts) continue;
      totals[side] += pts;
      if (currentPeriod !== null) currentQuarter[side] += pts;
      pointEvents.push({
        side,
        points: pts,
        player: strField(ev.payload, "player"),
        period: currentPeriod,
      });
    } else if (ev.event_type === "foul") {
      const side = sideFromPayload(ev.payload);
      if (side) fouls[side] += 1;
    } else if (ev.event_type === "timeout") {
      const side = sideFromPayload(ev.payload);
      if (side) timeouts[side] += 1;
    }
  }

  const tied = totals.a === totals.b;
  const isComplete =
    periodsCompleted >= regulationPeriods &&
    currentPeriod === null &&
    !tied;

  let winnerSide: Side | null = null;
  if (isComplete) {
    winnerSide = totals.a > totals.b ? "a" : "b";
  }

  const detail: BasketballDetail = {
    sport: "basketball",
    totals: { ...totals },
    lineScores,
    currentQuarter: { ...currentQuarter },
    fouls: { ...fouls },
    timeouts: { ...timeouts },
    pointEvents,
    currentPeriod,
    periodStartedAt,
    periodsCompleted,
    regulationPeriods,
  };

  const display = `${totals.a} – ${totals.b}`;

  return {
    scoreSummary: { ...totals },
    isComplete,
    winnerSide,
    display,
    detail,
  };
}

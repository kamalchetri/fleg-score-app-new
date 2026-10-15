// Pure futsal scoring engine — state is a fold over score_events in id order.
// Event vocabulary:
//   goal            payload { side, player?, assist?, minute?, clock? }
//   card            payload { side, player?, cardType: "yellow" | "red", minute?, clock? }
//   foul            payload { side, player?, minute?, clock? }
//   substitution    payload { side, playerOff?, playerOn?, minute?, clock? }
//   shot            payload { side }
//   shot_on_target  payload { side }
//   possession      payload { side }  (time-based clock — each switch records who has the ball)
//   period_start    payload {}
//   period_end      payload {}
//   clock_pause     payload {}
//   clock_resume    payload {}
//   undo            cancels the latest not-yet-undone undoable event
//   undo_side_goal  payload { side } — removes that side's most recent goal
//
// Periods beyond the regulation count (config.periods) are treated as the
// penalty shootout (config.tiebreak = "penalties"): goals in them count
// toward the shootout total, not the regulation score.

import type { FutsalConfig } from "@/lib/sports/presets";
import {
  resolveFutsalEvents,
  sideFromPayload,
  type FutsalCard,
  type FutsalDetail,
  type FutsalFoulEvent,
  type FutsalGoalEvent,
  type FutsalSubstitutionEvent,
  type MatchState,
  type ScoringEvent,
  type Side,
} from "./types";

function strField(payload: Record<string, unknown>, key: string): string | null {
  const v = payload[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function timeFields(payload: Record<string, unknown>): {
  minute: string | null;
  clock: string | null;
} {
  return {
    minute: strField(payload, "minute"),
    clock: strField(payload, "clock"),
  };
}

function parseTs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** Integer % from accumulated ms (closed segments only). */
export function possessionPctFromMs(ms: {
  a: number;
  b: number;
}): { a: number; b: number } | null {
  const total = ms.a + ms.b;
  if (total === 0) return null;
  const pctA = Math.round((100 * ms.a) / total);
  return { a: pctA, b: 100 - pctA };
}

type PossessionClockFields = Pick<
  FutsalDetail,
  "possessionMs" | "possessionSide" | "possessionSinceMs"
>;

/** Closed ms plus any open segment accrued to `nowMs`. */
export function computeLivePossessionMs(
  detail: PossessionClockFields,
  nowMs = Date.now(),
): { a: number; b: number } {
  let a = detail.possessionMs.a;
  let b = detail.possessionMs.b;
  if (detail.possessionSide && detail.possessionSinceMs != null) {
    const open = Math.max(0, nowMs - detail.possessionSinceMs);
    if (detail.possessionSide === "a") a += open;
    else b += open;
  }
  return { a, b };
}

/** Live % including the open possession segment (for ticking UIs). */
export function computeLivePossessionPct(
  detail: PossessionClockFields,
  nowMs = Date.now(),
): { a: number; b: number } | null {
  return possessionPctFromMs(computeLivePossessionMs(detail, nowMs));
}

function closePossessionAt(
  possessionMs: { a: number; b: number },
  side: Side | null,
  sinceMs: number | null,
  atMs: number,
): { side: Side | null; sinceMs: number | null } {
  if (side && sinceMs != null) {
    possessionMs[side] += Math.max(0, atMs - sinceMs);
  }
  return { side: null, sinceMs: null };
}

export function computeFutsalState(
  config: FutsalConfig,
  events: ScoringEvent[],
): MatchState {
  const regulationPeriods = config.periods;
  const effective = resolveFutsalEvents(events);

  const goals = { a: 0, b: 0 };
  const shootout = { a: 0, b: 0 };
  const fouls = { a: 0, b: 0 };
  const shots = { a: 0, b: 0 };
  const shotsOnTarget = { a: 0, b: 0 };
  const cards: FutsalCard[] = [];
  const goalEvents: FutsalGoalEvent[] = [];
  const cardEvents: FutsalCard[] = [];
  const foulEvents: FutsalFoulEvent[] = [];
  const substitutionEvents: FutsalSubstitutionEvent[] = [];
  const yellowCount = new Map<string, number>();
  const possessionMs = { a: 0, b: 0 };
  let possessionSide: Side | null = null;
  let possessionSinceMs: number | null = null;

  let periodIndex = 0;
  let periodOpen = false;
  let periodStartedAt: string | null = null;
  let periodsCompleted = 0;

  for (const ev of effective) {
    const evTs = parseTs(ev.created_at);
    switch (ev.event_type) {
      case "period_start": {
        periodIndex += 1;
        periodOpen = true;
        periodStartedAt = ev.created_at;
        break;
      }
      case "period_end": {
        ({ side: possessionSide, sinceMs: possessionSinceMs } = closePossessionAt(
          possessionMs,
          possessionSide,
          possessionSinceMs,
          evTs,
        ));
        if (periodOpen) {
          periodOpen = false;
          periodStartedAt = null;
          periodsCompleted = periodIndex;
        }
        break;
      }
      case "clock_pause": {
        ({ side: possessionSide, sinceMs: possessionSinceMs } = closePossessionAt(
          possessionMs,
          possessionSide,
          possessionSinceMs,
          evTs,
        ));
        break;
      }
      case "goal": {
        const side = sideFromPayload(ev.payload);
        if (!side) break;
        if (periodIndex > regulationPeriods) shootout[side] += 1;
        else goals[side] += config.points.goal;
        const t = timeFields(ev.payload);
        goalEvents.push({
          side,
          player: strField(ev.payload, "player"),
          assist: strField(ev.payload, "assist"),
          minute: t.minute,
          clock: t.clock,
        });
        break;
      }
      case "card": {
        const side = sideFromPayload(ev.payload);
        const cardType = ev.payload["cardType"];
        if (!side || (cardType !== "yellow" && cardType !== "red")) break;
        const player = strField(ev.payload, "player");
        const t = timeFields(ev.payload);
        let secondYellow = false;
        if (player && cardType === "yellow") {
          const key = `${side}:${player.toLowerCase()}`;
          const prev = yellowCount.get(key) ?? 0;
          if (prev >= 1) secondYellow = true;
          yellowCount.set(key, prev + 1);
        }
        const card: FutsalCard = {
          side,
          cardType,
          player,
          minute: t.minute,
          clock: t.clock,
          secondYellow,
        };
        cards.push(card);
        cardEvents.push(card);
        break;
      }
      case "foul": {
        const side = sideFromPayload(ev.payload);
        if (!side) break;
        fouls[side] += 1;
        const t = timeFields(ev.payload);
        foulEvents.push({
          side,
          player: strField(ev.payload, "player"),
          minute: t.minute,
          clock: t.clock,
        });
        break;
      }
      case "substitution": {
        const side = sideFromPayload(ev.payload);
        if (!side) break;
        const t = timeFields(ev.payload);
        substitutionEvents.push({
          side,
          playerOff: strField(ev.payload, "playerOff"),
          playerOn: strField(ev.payload, "playerOn"),
          minute: t.minute,
          clock: t.clock,
        });
        break;
      }
      case "shot": {
        const side = sideFromPayload(ev.payload);
        if (side) shots[side] += 1;
        break;
      }
      case "shot_on_target": {
        const side = sideFromPayload(ev.payload);
        if (side) shotsOnTarget[side] += 1;
        break;
      }
      case "possession": {
        const side = sideFromPayload(ev.payload);
        if (!side) break;
        if (side === possessionSide) break;
        if (possessionSide && possessionSinceMs != null) {
          possessionMs[possessionSide] += Math.max(0, evTs - possessionSinceMs);
        }
        possessionSide = side;
        possessionSinceMs = evTs;
        break;
      }
    }
  }

  const possession = possessionPctFromMs(possessionMs);
  const inShootout = periodIndex > regulationPeriods;
  const shootoutUsed = inShootout || shootout.a > 0 || shootout.b > 0;

  // Winner: regulation complete and not mid-period. Draws allowed (winnerSide null).
  let winnerSide: Side | null = null;
  let isComplete = false;
  if (!periodOpen && periodsCompleted >= regulationPeriods) {
    if (goals.a !== goals.b) {
      winnerSide = goals.a > goals.b ? "a" : "b";
      isComplete = true;
    } else if (shootoutUsed && shootout.a !== shootout.b) {
      winnerSide = shootout.a > shootout.b ? "a" : "b";
      isComplete = true;
    } else if (!shootoutUsed || (shootoutUsed && shootout.a === shootout.b)) {
      // Regulation draw (or tied shootout) — ref can finalize as a draw.
      isComplete = true;
      winnerSide = null;
    }
  }

  const detail: FutsalDetail = {
    sport: "futsal",
    goals,
    points: {
      a: goals.a + (shootoutUsed ? shootout.a : 0),
      b: goals.b + (shootoutUsed ? shootout.b : 0),
    },
    shootout: shootoutUsed ? shootout : null,
    cards,
    goalEvents,
    cardEvents,
    fouls,
    foulEvents,
    substitutionEvents,
    shots,
    shotsOnTarget,
    possessionMs,
    possessionSide,
    possessionSinceMs,
    possession,
    currentPeriod: periodOpen ? periodIndex : null,
    periodStartedAt,
    periodsCompleted,
    regulationPeriods,
    inShootout,
  };

  const display = shootoutUsed
    ? `${goals.a} – ${goals.b} (${shootout.a}–${shootout.b} pens)`
    : `${goals.a} – ${goals.b}`;

  return {
    scoreSummary: { ...goals },
    isComplete,
    winnerSide,
    display,
    detail,
  };
}

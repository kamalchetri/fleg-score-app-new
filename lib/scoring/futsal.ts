// SYNC: copied from Fleg-score web 2026-07-04 — keep in sync manually (no edits here)
// Pure futsal scoring engine — state is a fold over score_events in id order.
// Event vocabulary:
//   goal          payload { side }
//   card          payload { side, player?, cardType: "yellow" | "red" }
//   period_start  payload {}
//   period_end    payload {}
//   undo          cancels the latest not-yet-undone goal/card
//
// Periods beyond the regulation count (config.periods) are treated as the
// penalty shootout (config.tiebreak = "penalties"): goals in them count
// toward the shootout total, not the regulation score.

import type { FutsalConfig } from "@/lib/sports/presets";
import {
  resolveUndos,
  sideFromPayload,
  type FutsalCard,
  type FutsalDetail,
  type MatchState,
  type ScoringEvent,
  type Side,
} from "./types";

const UNDOABLE = new Set(["goal", "card"]);

export function computeFutsalState(
  config: FutsalConfig,
  events: ScoringEvent[],
): MatchState {
  const regulationPeriods = config.periods;
  const effective = resolveUndos(events, UNDOABLE);

  const goals = { a: 0, b: 0 };
  const shootout = { a: 0, b: 0 };
  const cards: FutsalCard[] = [];

  let periodIndex = 0; // how many period_start events so far
  let periodOpen = false;
  let periodStartedAt: string | null = null;
  let periodsCompleted = 0;

  for (const ev of effective) {
    switch (ev.event_type) {
      case "period_start": {
        periodIndex += 1;
        periodOpen = true;
        periodStartedAt = ev.created_at;
        break;
      }
      case "period_end": {
        if (periodOpen) {
          periodOpen = false;
          periodStartedAt = null;
          periodsCompleted = periodIndex;
        }
        break;
      }
      case "goal": {
        const side = sideFromPayload(ev.payload);
        if (!side) break;
        if (periodIndex > regulationPeriods) shootout[side] += 1;
        else goals[side] += config.points.goal;
        break;
      }
      case "card": {
        const side = sideFromPayload(ev.payload);
        const cardType = ev.payload["cardType"];
        if (!side || (cardType !== "yellow" && cardType !== "red")) break;
        cards.push({
          side,
          cardType,
          player:
            typeof ev.payload["player"] === "string"
              ? ev.payload["player"]
              : null,
        });
        break;
      }
    }
  }

  const inShootout = periodIndex > regulationPeriods;
  const shootoutUsed = inShootout || shootout.a > 0 || shootout.b > 0;

  // Winner: only decidable once regulation is fully played and no period is live.
  let winnerSide: Side | null = null;
  let isComplete = false;
  if (!periodOpen && periodsCompleted >= regulationPeriods) {
    if (goals.a !== goals.b) {
      winnerSide = goals.a > goals.b ? "a" : "b";
      isComplete = true;
    } else if (shootoutUsed && shootout.a !== shootout.b) {
      winnerSide = shootout.a > shootout.b ? "a" : "b";
      isComplete = true;
    }
  }

  const detail: FutsalDetail = {
    sport: "futsal",
    goals,
    shootout: shootoutUsed ? shootout : null,
    cards,
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
